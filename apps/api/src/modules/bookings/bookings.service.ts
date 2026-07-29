import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { NotificationsService } from '../notifications/notifications.service'
import { SmsService } from '../notifications/sms.service'
import { BookingStatus, ServiceType } from './booking.types'
import { POINTS_PER_RAND_SPENT, REFERRAL_BONUS_POINTS } from '../loyalty/loyalty.constants'

export interface RequestUser {
  sub:  string
  role: string
}

@Injectable()
export class BookingsService {
  constructor(
    private prisma:         PrismaService,
    private notifications:  NotificationsService,
    private sms:            SmsService,
  ) {}

  /** Clients see only their own bookings, providers see their assigned + open pending jobs, admins see all. */
  findAll(user: RequestUser, status?: BookingStatus, serviceType?: ServiceType) {
    const scope =
      user.role === 'admin'    ? {} :
      user.role === 'provider' ? { OR: [{ providerId: user.sub }, { providerId: null, status: 'pending' }] } :
      /* client */                { clientId: user.sub }

    return this.prisma.booking.findMany({
      where: {
        ...scope,
        ...(status      ? { status }      : {}),
        ...(serviceType ? { serviceType } : {}),
      },
      orderBy: { createdAt: 'desc' },
    })
  }

  async findOne(id: string, user: RequestUser) {
    const booking = await this.prisma.booking.findUnique({ where: { id } })
    if (!booking) throw new NotFoundException(`Booking ${id} not found`)
    this.assertParty(booking, user)
    return booking
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
    const title = '✅ Provider on the way!'
    const body  = `${providerName} accepted your ${serviceType} request`
    await this.notifications.notifyOne(client.pushToken, clientId, title, body, 'provider_assigned', { bookingId })
    if (!client.pushToken) await this.sms.notifyBookingConfirmed(client.phone, providerName, serviceType, bookingId)
  }

  async notifyClientOnComplete(clientId: string, serviceType: string, amount: number, bookingId: string) {
    const client = await this.prisma.user.findUnique({ where: { id: clientId } })
    if (!client) return
    const title = '🎉 Job complete!'
    const body  = `Your ${serviceType} job is done. Rate your provider.`
    await this.notifications.notifyOne(client.pushToken, clientId, title, body, 'job_complete', { bookingId })
    if (!client.pushToken) await this.sms.notifyJobComplete(client.phone, serviceType, amount)
  }

  async create(user: RequestUser, dto: {
    clientId?:      string
    serviceType:    ServiceType
    location:       string
    address:        string
    quotedAmount:   number
    paymentMethod:  string
    notes?:         string
    serviceDetails?: Record<string, any>
    images?:         string[]
  }) {
    // Always derive clientId from the authenticated caller — never trust the body —
    // except admins, who may create a booking on a client's behalf.
    const clientId = user.role === 'admin' && dto.clientId ? dto.clientId : user.sub
    const booking = await this.prisma.booking.create({
      data: {
        clientId,
        serviceType:    dto.serviceType,
        location:       dto.location,
        address:        dto.address,
        quotedAmount:   dto.quotedAmount,
        paymentMethod:  dto.paymentMethod,
        notes:          dto.notes ?? null,
        serviceDetails: dto.serviceDetails ?? undefined,
        images:         dto.images ?? [],
        status:         'pending',
      },
    })
    // Save in-app notification for the client
    this.notifications.saveInApp(clientId, '📋 Booking received', `We're finding a ${dto.serviceType} provider near you.`, 'booking_created', { bookingId: booking.id }).catch(() => {})
    // Notify matching providers in the background
    this.notifyProviders(dto.serviceType, booking.id, dto.address).catch(() => {})
    return booking
  }

  async updateStatus(id: string, status: BookingStatus, user: RequestUser) {
    const existing = await this.prisma.booking.findUnique({ where: { id } })
    if (!existing) throw new NotFoundException(`Booking ${id} not found`)
    this.assertParty(existing, user)

    const warrantyExpiresAt = status === 'completed'
      ? new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
      : undefined

    const booking = await this.prisma.booking.update({
      where: { id },
      data: {
        status,
        ...(status === 'completed' ? { paymentReleased: true, warrantyExpiresAt } : {}),
      },
    })

    this.notifyOnStatusChange(booking, status).catch(() => {})

    if (status === 'completed') {
      this.awardLoyaltyAndReferral(booking.clientId, booking.finalAmount ?? booking.quotedAmount).catch(() => {})
    }

    return booking
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

  async assignProvider(id: string, providerId: string, user: RequestUser) {
    const existing = await this.prisma.booking.findUnique({ where: { id } })
    if (!existing) throw new NotFoundException(`Booking ${id} not found`)

    const isAdmin           = user.role === 'admin'
    const isOwningClient    = existing.clientId === user.sub
    const isSelfAssigning   = user.role === 'provider' && providerId === user.sub && existing.providerId === null
    if (!isAdmin && !isOwningClient && !isSelfAssigning) {
      throw new ForbiddenException('Not allowed to assign this booking')
    }

    const booking = await this.prisma.booking.update({
      where: { id },
      data:  { providerId, status: 'accepted' },
      include: { provider: true },
    })
    // Notify client — push or SMS
    this.notifyClientOnAssign(
      booking.clientId,
      booking.provider?.name ?? 'Your provider',
      booking.serviceType,
      booking.id,
    ).catch(() => {})
    return booking
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
