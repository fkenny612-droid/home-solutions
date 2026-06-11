import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { NotificationsService } from '../notifications/notifications.service'
import { SmsService } from '../notifications/sms.service'
import { BookingStatus, ServiceType } from './booking.types'

@Injectable()
export class BookingsService {
  constructor(
    private prisma:         PrismaService,
    private notifications:  NotificationsService,
    private sms:            SmsService,
  ) {}

  findAll(status?: BookingStatus, serviceType?: ServiceType) {
    return this.prisma.booking.findMany({
      where: {
        ...(status      ? { status }      : {}),
        ...(serviceType ? { serviceType } : {}),
      },
      orderBy: { createdAt: 'desc' },
    })
  }

  async findOne(id: string) {
    const booking = await this.prisma.booking.findUnique({ where: { id } })
    if (!booking) throw new NotFoundException(`Booking ${id} not found`)
    return booking
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

  async create(dto: {
    clientId:       string
    serviceType:    ServiceType
    location:       string
    address:        string
    quotedAmount:   number
    paymentMethod:  string
    notes?:         string
    serviceDetails?: Record<string, any>
    images?:         string[]
  }) {
    const booking = await this.prisma.booking.create({
      data: {
        clientId:       dto.clientId,
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
    this.notifications.saveInApp(dto.clientId, '📋 Booking received', `We're finding a ${dto.serviceType} provider near you.`, 'booking_created', { bookingId: booking.id }).catch(() => {})
    // Notify matching providers in the background
    this.notifyProviders(dto.serviceType, booking.id, dto.address).catch(() => {})
    return booking
  }

  async updateStatus(id: string, status: BookingStatus) {
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

    if (status === 'completed') {
      this.notifyClientOnComplete(
        booking.clientId,
        booking.serviceType,
        booking.finalAmount ?? booking.quotedAmount,
        booking.id,
      ).catch(() => {})
    }

    return booking
  }

  async assignProvider(id: string, providerId: string) {
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
