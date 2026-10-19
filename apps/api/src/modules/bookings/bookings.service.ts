import { BadGatewayException, BadRequestException, ConflictException, ForbiddenException, Injectable, Logger, NotFoundException, OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { NotificationsService } from '../notifications/notifications.service'
import { SmsService } from '../notifications/sms.service'
import { SubscriptionsService } from '../subscriptions/subscriptions.service'
import { PeachPaymentsService } from '../payments/peach-payments.service'
import { BlocksService } from '../blocks/blocks.service'
import { BookingStatus, ServiceType } from './booking.types'
import { POINTS_PER_RAND_SPENT, REFERRAL_BONUS_POINTS } from '../loyalty/loyalty.constants'
import { isKnownService, priceBooking, unansweredQuestions } from './pricing'
import { ALL_STATUSES, Actor, canTransition, nextStatuses } from './booking-status'
import { cutoffs } from './booking-expiry'

const PAYMENT_METHODS = ['card', 'eft', 'payfast']
const DAY_MS = 24 * 60 * 60 * 1000

export interface RequestUser {
  sub:  string
  role: string
}

export interface CreateBookingDto {
  clientId?:       string           // admins only — everyone else is the authenticated caller
  serviceType:     ServiceType
  location:        string
  address:         string
  paymentMethod?:  string
  notes?:          string
  serviceDetails?: Record<string, any>
  images?:         string[]
  discountCode?:   string           // a loyalty reward code owned by the client
  emergency?:      boolean          // flat-fee emergency call-out
  expectedAmount?: number           // the total the customer was shown; rejected if the real price differs
  // quotedAmount is deliberately NOT accepted: the server prices the job itself.
}

@Injectable()
export class BookingsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BookingsService.name)
  private expiryTimer?: NodeJS.Timeout

  constructor(
    private prisma:         PrismaService,
    private notifications:  NotificationsService,
    private sms:            SmsService,
    private subscriptions:  SubscriptionsService,
    private peach:           PeachPaymentsService,
    private blocks:          BlocksService,
  ) {}

  onModuleInit() {
    // Unanswered requests are cancelled (and refunded) automatically, so a customer's money is never stuck waiting.
    // Single API instance; the conditional update inside expireStale makes a second instance harmless anyway.
    this.expiryTimer = setInterval(() => { this.expireStale().catch(err => this.logger.error('Expiry sweep failed', err)) }, 60_000)
    this.expiryTimer.unref?.()
  }

  onModuleDestroy() { if (this.expiryTimer) clearInterval(this.expiryTimer) }

  /** Clients see only their own bookings, providers see their assigned + open pending jobs, admins see all. */
  async findAll(user: RequestUser, status?: BookingStatus, serviceType?: ServiceType) {
    const scope =
      user.role === 'admin'    ? {} :
      user.role === 'provider' ? { OR: [{ providerId: user.sub }, { providerId: null, status: 'pending' }] } :
      /* client */                { clientId: user.sub }

    const bookings = await this.prisma.booking.findMany({
      where: {
        ...scope,
        ...(status      ? { status }      : {}),
        ...(serviceType ? { serviceType } : {}),
      },
      orderBy: { createdAt: 'desc' },
      include: { provider: true },
    })
    // A provider doesn't see open requests from customers who blocked them (or whom they blocked).
    const hidden = user.role === 'provider' ? await this.blocks.hiddenFrom(user.sub) : new Set<string>()
    const visible = hidden.size ? bookings.filter(b => b.providerId === user.sub || !hidden.has(b.clientId)) : bookings
    const contacts = await this.clientContacts(visible, user)
    return visible.map(b => ({ ...this.present(b, user), ...contacts.get(b.id) }))
  }

  async findOne(id: string, user: RequestUser) {
    const booking = await this.prisma.booking.findUnique({ where: { id }, include: { provider: true } })
    if (!booking) throw new NotFoundException(`Booking ${id} not found`)
    this.assertParty(booking, user)
    const contacts = await this.clientContacts([booking], user)
    return { ...this.present(booking, user), ...contacts.get(booking.id) }
  }

  /**
   * Only the provider who has ACCEPTED a job gets the customer's name and phone (the privacy policy says we share
   * these with the assigned provider), and only while the job is live. A mere request, other providers and other
   * customers get nothing.
   */
  private async clientContacts(bookings: Array<{ id: string; clientId: string; providerId: string | null; status: string }>, user: RequestUser) {
    const out = new Map<string, { clientName: string | null; clientPhone: string | null }>()
    if (user.role !== 'provider') return out
    const live = bookings.filter(b => b.providerId === user.sub && ['accepted', 'en_route', 'in_progress'].includes(b.status))
    if (live.length === 0) return out
    const clients = await this.prisma.user.findMany({
      where:  { id: { in: [...new Set(live.map(b => b.clientId))] } },
      select: { id: true, phone: true, firstName: true, lastName: true },
    })
    const byId = new Map(clients.map(c => [c.id, c]))
    for (const b of live) {
      const c = byId.get(b.clientId)
      out.set(b.id, { clientName: c ? [c.firstName, c.lastName].filter(Boolean).join(' ') || null : null, clientPhone: c?.phone ?? null })
    }
    return out
  }

  /** Flattens the joined provider relation into a plain providerName field, matching the client's expected shape. */
  private withProviderName<T extends { provider?: { name: string } | null }>(booking: T) {
    const { provider, ...rest } = booking
    return { ...rest, providerName: provider?.name ?? null }
  }

  /** Adds providerName and the statuses this caller may move the booking to (so clients never duplicate the rules). */
  private present<T extends { status: string; clientId: string; providerId: string | null; provider?: { name: string } | null }>(booking: T, user: RequestUser) {
    return { ...this.withProviderName(booking), allowedNext: nextStatuses(booking.status, this.actorFor(booking, user)) }
  }

  private actorFor(booking: { clientId: string }, user: RequestUser): Actor {
    if (user.role === 'admin') return 'admin'
    return booking.clientId === user.sub ? 'client' : 'provider'
  }

  /** Caller must be the client, the assigned provider, or an admin. */
  private assertParty(booking: { clientId: string; providerId: string | null }, user: RequestUser) {
    if (user.role === 'admin') return
    if (booking.clientId === user.sub) return
    if (booking.providerId && booking.providerId === user.sub) return
    throw new ForbiddenException('Not your booking')
  }

  async notifyProviders(serviceType: string, bookingId: string, address: string) {
    const providers = await this.prisma.provider.findMany({
      where: { status: 'active', skills: { has: serviceType } },
    })
    const phones     = providers.map(p => p.phone)
    const users      = await this.prisma.user.findMany({
      where:  { phone: { in: phones } },
      select: { pushToken: true, phone: true },
    })

    const withPush    = users.filter(u => u.pushToken).map(u => u.pushToken!)
    const withoutPush = users.filter(u => !u.pushToken).map(u => u.phone)

    // Push to providers who have the app
    if (withPush.length) {
      await this.notifications.notifyProviders(
        withPush,
        '🔧 New job available',
        `${serviceType.charAt(0).toUpperCase() + serviceType.slice(1)} near you — tap to accept`,
        { bookingId, type: 'new_job' },
      )
    }

    // SMS fallback for providers without push token
    if (withoutPush.length) {
      await this.sms.notifyNewJob(withoutPush, serviceType, address)
    }
  }

  async notifyClientOnAssign(clientId: string, providerName: string, serviceType: string, bookingId: string) {
    const client = await this.prisma.user.findUnique({ where: { id: clientId } })
    if (!client) return
    const title = '✅ Booking accepted'
    const body  = `${providerName} accepted your ${serviceType} booking`
    await this.notifications.notifyOne(client.pushToken, clientId, title, body, 'provider_assigned', { bookingId })
    if (!client.pushToken) await this.sms.notifyBookingConfirmed(client.phone, providerName, serviceType, bookingId)
  }

  /** Tells a provider a customer has chosen them. */
  async notifyProviderOfRequest(providerId: string, serviceType: string, address: string, bookingId: string, emergency: boolean) {
    const provider = await this.prisma.provider.findUnique({ where: { id: providerId } })
    if (!provider) return
    const user = await this.prisma.user.findFirst({ where: { phone: provider.phone } })
    if (!user) return
    const title = emergency ? '🚨 Emergency job request' : '🔧 New job request'
    const body  = `${serviceType.replace(/_/g, ' ')} — ${address}. Open the app to accept.`
    await this.notifications.notifyOne(user.pushToken, user.id, title, body, 'new_job', { bookingId })
    if (!user.pushToken) await this.sms.notifyNewJob([user.phone], serviceType, address)
  }

  /** Tells a customer their request won't be fulfilled and their payment is being returned. */
  async notifyClientOfNoShow(clientId: string, providerName: string | null, bookingId: string, why: 'declined' | 'expired') {
    const client = await this.prisma.user.findUnique({ where: { id: clientId } })
    if (!client) return
    const title = '❌ Booking cancelled'
    const body  = why === 'declined'
      ? `${providerName ?? 'The provider'} couldn't take your job. Your payment is being returned — please choose another provider.`
      : `No provider accepted your booking in time. Your payment is being returned.`
    await this.notifications.notifyOne(client.pushToken, clientId, title, body, 'cancelled', { bookingId })
  }

  async notifyClientOnComplete(clientId: string, serviceType: string, amount: number, bookingId: string) {
    const client = await this.prisma.user.findUnique({ where: { id: clientId } })
    if (!client) return
    const title = '🎉 Job complete!'
    const body  = `Your ${serviceType} job is done. Rate your provider.`
    await this.notifications.notifyOne(client.pushToken, clientId, title, body, 'job_complete', { bookingId })
    if (!client.pushToken) await this.sms.notifyJobComplete(client.phone, serviceType, amount)
  }

  async create(user: RequestUser, dto: CreateBookingDto) {
    if (!dto || typeof dto !== 'object') throw new BadRequestException('Invalid booking')
    if (!isKnownService(dto.serviceType)) throw new BadRequestException('Unknown service type')

    const address  = typeof dto.address  === 'string' ? dto.address.trim()  : ''
    const location = typeof dto.location === 'string' ? dto.location.trim() : ''
    if (!address  || address.length  > 300) throw new BadRequestException('A service address is required')
    if (!location || location.length > 100) throw new BadRequestException('A location is required')

    const paymentMethod = dto.paymentMethod ?? 'card'
    if (!PAYMENT_METHODS.includes(paymentMethod)) throw new BadRequestException('Unsupported payment method')

    const notes  = dto.notes == null ? null : String(dto.notes).slice(0, 1000)
    const images = Array.isArray(dto.images) ? dto.images : []
    if (images.length > 10 || images.some(i => typeof i !== 'string' || i.length > 500)) throw new BadRequestException('Invalid photos')
    const details = dto.serviceDetails
    if (details != null && (typeof details !== 'object' || Array.isArray(details) || JSON.stringify(details).length > 10_000)) {
      throw new BadRequestException('Invalid job details')
    }

    // Always derive clientId from the authenticated caller — never trust the body —
    // except admins, who may create a booking on a client's behalf.
    const clientId = user.role === 'admin' && dto.clientId ? dto.clientId : user.sub

    // Reward code: must exist, belong to this client and be unused. It is consumed below, atomically with the booking.
    let discount = 0
    let discountCode: string | null = null
    if (dto.discountCode) {
      const code = String(dto.discountCode).trim()
      const redemption = await this.prisma.loyaltyRedemption.findUnique({ where: { code } })
      if (!redemption || redemption.userId !== clientId) throw new BadRequestException('That reward code is not valid')
      if (redemption.used) throw new ConflictException('That reward has already been used')
      discount = redemption.discountAmount
      discountCode = code
    }

    // An unanswered question prices the job at the cheapest option, so require them all (except flat-fee emergencies).
    if (dto.emergency !== true && unansweredQuestions(dto.serviceType, details ?? {}).length > 0) {
      throw new BadRequestException('Please answer all the questions about the job so we can price it correctly')
    }

    // The server prices the job. Whatever amount the app displays or sends is only checked, never trusted.
    let price
    try {
      price = priceBooking({ serviceType: dto.serviceType, answers: details ?? {}, emergency: dto.emergency === true, discount })
    } catch (err) {
      if (err instanceof RangeError) throw new BadRequestException(err.message)
      throw err
    }
    if (dto.expectedAmount != null && Math.abs(Number(dto.expectedAmount) - price.total) > 1) {
      throw new ConflictException(`The price is now R${price.total}. Please review and confirm.`)
    }

    // Consume the reward first (the conditional update is the lock: only one request can flip it),
    // then create the booking, and hand the reward back if the booking can't be created.
    if (discountCode) {
      const used = await this.prisma.loyaltyRedemption.updateMany({ where: { code: discountCode, userId: clientId, used: false }, data: { used: true } })
      if (used.count !== 1) throw new ConflictException('That reward has already been used')
    }
    let booking
    try {
      booking = await this.prisma.booking.create({
        data: {
          clientId,
          serviceType:    dto.serviceType,
          location,
          address,
          quotedAmount:   price.total,
          paymentMethod,
          notes,
          serviceDetails: details ?? undefined,
          images,
          discountCode,
          discountAmount: price.discount,
          isEmergency:    dto.emergency === true,
          status:         'pending',
        },
      })
    } catch (err) {
      if (discountCode) {
        await this.prisma.loyaltyRedemption.updateMany({ where: { code: discountCode, userId: clientId, used: true }, data: { used: false } }).catch(() => {})
      }
      throw err
    }

    // Save in-app notification for the client
    this.notifications.saveInApp(clientId, '📋 Booking received', `We're finding a ${dto.serviceType} provider near you.`, 'booking_created', { bookingId: booking.id }).catch(() => {})
    // Notify matching providers in the background
    this.notifyProviders(dto.serviceType, booking.id, address).catch(() => {})
    return booking
  }

  async updateStatus(id: string, status: BookingStatus, user: RequestUser) {
    if (!ALL_STATUSES.includes(status)) throw new BadRequestException('Unknown status')
    const existing = await this.prisma.booking.findUnique({ where: { id } })
    if (!existing) throw new NotFoundException(`Booking ${id} not found`)
    this.assertParty(existing, user)

    if (!canTransition(existing.status, status, this.actorFor(existing, user))) {
      throw new ConflictException(`This booking is ${existing.status.replace('_', ' ')} and can't be marked ${status.replace('_', ' ')}.`)
    }

    // Move the status only if nobody else has moved it first, so a job can't be completed (and paid out) twice.
    const completing = status === 'completed'
    const warrantyDays = completing ? await this.subscriptions.getWarrantyDays(existing.clientId) : 0
    const moved = await this.prisma.booking.updateMany({
      where: { id, status: existing.status },
      data:  { status, ...(warrantyDays > 0 ? { warrantyExpiresAt: new Date(Date.now() + warrantyDays * DAY_MS) } : {}) },
    })
    if (moved.count !== 1) throw new ConflictException('This booking was just updated — please refresh and try again.')
    if (completing && existing.providerId) {
      await this.prisma.provider.update({ where: { id: existing.providerId }, data: { jobCount: { increment: 1 } } })
        .catch(err => console.error(`Failed to bump jobCount for provider ${existing.providerId}:`, err))
    }

    const booking = await this.prisma.booking.findUniqueOrThrow({ where: { id } })
    this.notifyOnStatusChange(booking, status).catch(() => {})

    // Money follows the status: completed → capture the held payment and credit the provider and client;
    // cancelled → return the held payment. Never let a gateway problem undo the saved status change —
    // an admin can retry with reconcilePayment — but it must not fail silently either.
    if (status === 'completed' || status === 'cancelled') {
      try {
        await this.reconcilePayment(id)
      } catch (err) {
        console.error(`Payment reconciliation failed for booking ${id} (${status}) — needs manual follow-up:`, err)
      }
    }

    return this.prisma.booking.findUniqueOrThrow({ where: { id } })
  }

  /**
   * Brings a booking's payment in line with its status. Safe to call repeatedly:
   *  - completed with a held payment → capture it, credit the provider (net of commission) and award the client's points, once
   *  - cancelled with a held payment → void the hold and give back any reward code
   *  - cancelled and never charged   → give back any reward code
   */
  async reconcilePayment(id: string): Promise<{ action: 'captured' | 'voided' | 'none' }> {
    const b = await this.prisma.booking.findUnique({ where: { id } })
    if (!b) throw new NotFoundException(`Booking ${id} not found`)

    const held = b.paymentHeld && !!b.transactionId
    if (b.status === 'cancelled') {
      if (held) await this.voidHold(b.id, b.transactionId!)
      await this.restoreDiscount(b)
      return { action: held ? 'voided' : 'none' }
    }
    if (b.status === 'completed' && held && !b.paymentReleased) {
      await this.capturePayment(b)
      return { action: 'captured' }
    }
    return { action: 'none' }
  }

  private async capturePayment(b: { id: string; clientId: string; providerId: string | null; transactionId: string | null; finalAmount: number | null; quotedAmount: number }) {
    const amount = b.finalAmount ?? b.quotedAmount
    const result = await this.peach.releaseFunds(b.transactionId!, amount)
    if (!result.success) throw new BadGatewayException('The payment gateway did not confirm the capture')

    const commissionPct = b.providerId ? await this.subscriptions.getProviderCommissionPct(b.providerId) : 0
    const payout = Math.round(amount * (1 - commissionPct / 100) * 100) / 100

    // The money has been captured, so recording it must not fail on a slow connection: wider window, one retry.
    // A failed attempt applied nothing (it's atomic), and the flag below is the lock, so retrying can't double-credit.
    const credited = await this.withRetry(() => this.prisma.$transaction(async tx => {
      const lock = await tx.booking.updateMany({ where: { id: b.id, paymentReleased: false }, data: { paymentReleased: true } })
      if (lock.count !== 1) return false
      if (b.providerId) await tx.provider.update({ where: { id: b.providerId }, data: { earningsBalance: { increment: payout } } })
      return true
    }, { maxWait: 10_000, timeout: 20_000 }))
    if (credited) {
      await this.awardLoyaltyAndReferral(b.clientId, amount).catch(err => console.error(`Failed to award loyalty points for booking ${b.id}:`, err))
    }
  }

  private async withRetry<T>(fn: () => Promise<T>, attempts = 2): Promise<T> {
    for (let i = 1; ; i++) {
      try { return await fn() } catch (err) {
        if (i >= attempts) throw err
        console.warn(`Retrying after error (attempt ${i}/${attempts}):`, (err as Error)?.message)
      }
    }
  }

  private async voidHold(bookingId: string, transactionId: string) {
    const result = await this.peach.voidHold(transactionId)
    if (!result.success) throw new BadGatewayException('The payment gateway did not confirm the refund')
    await this.prisma.booking.update({ where: { id: bookingId }, data: { paymentHeld: false } })
  }

  /** Gives a reward code back to its owner when the booking it was spent on is cancelled. Idempotent. */
  private async restoreDiscount(b: { id: string; clientId: string; discountCode: string | null }) {
    if (!b.discountCode) return
    // Detaching the code from the booking first means a repeat call can never re-enable a code the client has since re-used.
    const detached = await this.prisma.booking.updateMany({ where: { id: b.id, discountCode: b.discountCode }, data: { discountCode: null } })
    if (detached.count !== 1) return
    await this.prisma.loyaltyRedemption.updateMany({ where: { code: b.discountCode, userId: b.clientId, used: true }, data: { used: false } })
  }

  private async notifyOnStatusChange(booking: { id: string; clientId: string; providerId: string | null; serviceType: string; finalAmount: number | null; quotedAmount: number }, status: BookingStatus) {
    const client = await this.prisma.user.findUnique({ where: { id: booking.clientId } })
    if (!client) return
    const data = { bookingId: booking.id }

    if (status === 'en_route') {
      await this.notifications.notifyOne(client.pushToken, booking.clientId, '🚗 Provider on the way', `Your ${booking.serviceType} provider is heading to you now.`, 'en_route', data)
    } else if (status === 'in_progress') {
      await this.notifications.notifyOne(client.pushToken, booking.clientId, '🔧 Work started', `Your ${booking.serviceType} job has started.`, 'in_progress', data)
    } else if (status === 'completed') {
      await this.notifications.notifyOne(client.pushToken, booking.clientId, '🎉 Job complete!', `Your ${booking.serviceType} job is done. Tap to rate your provider.`, 'job_complete', data)
      if (!client.pushToken) await this.sms.notifyJobComplete(client.phone, booking.serviceType, booking.finalAmount ?? booking.quotedAmount)
    } else if (status === 'cancelled') {
      await this.notifications.notifyOne(client.pushToken, booking.clientId, '❌ Booking cancelled', `Your ${booking.serviceType} booking has been cancelled.`, 'cancelled', data)
      // Also notify the provider if one was assigned
      if (booking.providerId) {
        const provider = await this.prisma.user.findFirst({ where: { phone: (await this.prisma.provider.findUnique({ where: { id: booking.providerId } }))?.phone ?? '' } })
        if (provider) {
          await this.notifications.notifyOne(provider.pushToken, provider.id, '❌ Job cancelled', `The ${booking.serviceType} booking was cancelled by the client.`, 'cancelled', data)
        }
      }
    }
  }

  async awardLoyaltyAndReferral(clientId: string, amount: number) {
    const earnedPoints = Math.floor(amount * POINTS_PER_RAND_SPENT)
    await this.prisma.user.update({ where: { id: clientId }, data: { loyaltyPoints: { increment: earnedPoints } } })

    const client = await this.prisma.user.findUnique({ where: { id: clientId } })
    if (!client?.referredById || client.referralRewarded) return

    const completedCount = await this.prisma.booking.count({ where: { clientId, status: 'completed' } })
    if (completedCount !== 1) return // only reward on the referred user's first completed job

    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: client.referredById }, data: { loyaltyPoints: { increment: REFERRAL_BONUS_POINTS } } }),
      this.prisma.user.update({ where: { id: clientId }, data: { referralRewarded: true } }),
    ])
  }

  /**
   * Who is doing what:
   *  - the customer picking a provider makes a REQUEST — the booking stays pending until that provider accepts;
   *  - a provider accepting (a request addressed to them, or an open job) makes it ACCEPTED;
   *  - an admin dispatching a job on the phone makes it ACCEPTED.
   */
  async assignProvider(id: string, providerId: string, user: RequestUser) {
    if (typeof providerId !== 'string' || !providerId) throw new BadRequestException('providerId is required')
    const existing = await this.prisma.booking.findUnique({ where: { id } })
    if (!existing) throw new NotFoundException(`Booking ${id} not found`)

    const isAdmin        = user.role === 'admin'
    const isOwningClient = existing.clientId === user.sub
    const isAccepting    = user.role === 'provider' && providerId === user.sub && (existing.providerId === null || existing.providerId === user.sub)
    if (!isAdmin && !isOwningClient && !isAccepting) throw new ForbiddenException('Not allowed to assign this booking')

    const open = existing.status === 'pending' || existing.status === 'emergency'
    if (!open && !(isAdmin && existing.status === 'accepted')) throw new ConflictException('This booking can no longer be assigned')

    const target = await this.prisma.provider.findUnique({ where: { id: providerId } })
    if (!target) throw new NotFoundException('Provider not found')
    if (!isAdmin && await this.blocks.eitherBlocked(existing.clientId, providerId)) {
      throw new ForbiddenException(isAccepting ? 'This job is not available to you' : 'This provider is not available')
    }
    if (!isAdmin && target.status !== 'active') throw new ForbiddenException('That provider has not been approved yet')

    // A card job whose payment was never secured can't be requested or taken (admins excepted, e.g. invoiced or cash jobs).
    if (!isAdmin && existing.paymentMethod === 'card' && !existing.paymentHeld) {
      throw new ConflictException("Payment hasn't been secured for this booking yet — try again in a moment")
    }

    const accepted = isAdmin || isAccepting          // the customer only ever requests
    const claimed = await this.prisma.booking.updateMany({
      where: { id, status: existing.status, providerId: existing.providerId },
      data:  { providerId, status: accepted ? 'accepted' : 'pending' },
    })
    if (claimed.count !== 1) throw new ConflictException(accepted ? 'Someone else just took this job' : 'This booking was just updated — please refresh')

    const booking = await this.prisma.booking.findUniqueOrThrow({ where: { id }, include: { provider: true } })
    if (accepted) {
      this.notifyClientOnAssign(booking.clientId, booking.provider?.name ?? 'Your provider', booking.serviceType, booking.id).catch(() => {})
    } else {
      this.notifyProviderOfRequest(providerId, booking.serviceType, booking.address, booking.id, booking.isEmergency).catch(() => {})
    }
    return this.withProviderName(booking)   // never return the provider's full record (phone, earnings) to the caller
  }

  /**
   * A provider turning down a request addressed to them. The customer is the one waiting, so this cancels the
   * booking — which returns their payment and any reward — and tells them, rather than leaving them stranded.
   */
  async declineJob(id: string, user: RequestUser) {
    const existing = await this.prisma.booking.findUnique({ where: { id } })
    if (!existing) throw new NotFoundException(`Booking ${id} not found`)
    if (user.role !== 'provider' || existing.providerId !== user.sub) throw new ForbiddenException('This job was not requested from you')
    if (existing.status !== 'pending' && existing.status !== 'emergency') throw new ConflictException('This job can no longer be declined')

    const done = await this.prisma.booking.updateMany({ where: { id, status: existing.status, providerId: user.sub }, data: { status: 'cancelled' } })
    if (done.count !== 1) throw new ConflictException('This booking was just updated — please refresh')

    const booking = await this.prisma.booking.findUniqueOrThrow({ where: { id }, include: { provider: true } })
    await this.reconcilePayment(id).catch(err => console.error(`Payment reconciliation failed for declined booking ${id} — needs manual follow-up:`, err))
    this.notifyClientOfNoShow(booking.clientId, booking.provider?.name ?? 'Your provider', booking.id, 'declined').catch(() => {})
    return this.withProviderName(booking)
  }

  /** Cancels (and refunds) bookings that nobody accepted in time. Runs every minute; safe to run twice. */
  async expireStale(now: Date = new Date()): Promise<number> {
    const c = cutoffs(now)
    const stale = await this.prisma.booking.findMany({
      where: {
        status: { in: ['pending', 'emergency'] },
        OR: [
          { isEmergency: true,  createdAt: { lt: c.emergency } },
          { isEmergency: false, createdAt: { lt: c.standard } },
        ],
      },
      include: { provider: true },
      take: 50,
    })
    let expired = 0
    for (const b of stale) {
      const done = await this.prisma.booking.updateMany({ where: { id: b.id, status: b.status }, data: { status: 'cancelled' } })
      if (done.count !== 1) continue
      expired++
      await this.reconcilePayment(b.id).catch(err => console.error(`Payment reconciliation failed for expired booking ${b.id} — needs manual follow-up:`, err))
      this.notifyClientOfNoShow(b.clientId, b.provider?.name ?? null, b.id, 'expired').catch(() => {})
    }
    if (expired) this.logger.log(`Expired ${expired} unaccepted booking(s)`)
    return expired
  }

  async stats() {
    const [total, active, emergency, pending, completedBookings] = await Promise.all([
      this.prisma.booking.count(),
      this.prisma.booking.count({ where: { status: { in: ['accepted', 'en_route', 'in_progress'] } } }),
      this.prisma.booking.count({ where: { status: 'emergency' } }),
      this.prisma.booking.count({ where: { status: 'pending' } }),
      this.prisma.booking.findMany({ where: { status: 'completed' }, select: { quotedAmount: true, finalAmount: true } }),
    ])
    const revenueToday = completedBookings.reduce((sum, b) => sum + (b.finalAmount ?? b.quotedAmount), 0)
    return { total, active, emergency, pending, revenueToday }
  }
}
