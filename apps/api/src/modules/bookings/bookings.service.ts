import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { NotificationsService } from '../notifications/notifications.service'
import { BookingStatus, ServiceType } from './booking.types'

@Injectable()
export class BookingsService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
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

  async notifyProviders(serviceType: string, bookingId: string) {
    // Find all active providers with matching skill who have a push token
    const providers = await this.prisma.provider.findMany({
      where: { status: 'active', skills: { has: serviceType } },
    })
    // Get push tokens from user accounts matching provider phones
    const phones = providers.map(p => p.phone)
    const users  = await this.prisma.user.findMany({
      where: { phone: { in: phones }, pushToken: { not: null } },
      select: { pushToken: true },
    })
    const tokens = users.map(u => u.pushToken!).filter(Boolean)
    if (tokens.length) {
      await this.notifications.notifyProviders(
        tokens,
        '🔧 New job available',
        `${serviceType.charAt(0).toUpperCase() + serviceType.slice(1)} job near you — tap to accept`,
        { bookingId, type: 'new_job' },
      )
    }
  }

  async create(dto: {
    clientId:      string
    serviceType:   ServiceType
    location:      string
    address:       string
    quotedAmount:  number
    paymentMethod: string
    notes?:        string
  }) {
    const booking = await this.prisma.booking.create({
      data: {
        clientId:      dto.clientId,
        serviceType:   dto.serviceType,
        location:      dto.location,
        address:       dto.address,
        quotedAmount:  dto.quotedAmount,
        paymentMethod: dto.paymentMethod,
        notes:         dto.notes ?? null,
        status:        'pending',
      },
    })
    // Notify matching providers in the background
    this.notifyProviders(dto.serviceType, booking.id).catch(() => {})
    return booking
  }

  async updateStatus(id: string, status: BookingStatus) {
    const warrantyExpiresAt = status === 'completed'
      ? new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
      : undefined

    return this.prisma.booking.update({
      where: { id },
      data: {
        status,
        ...(status === 'completed' ? { paymentReleased: true, warrantyExpiresAt } : {}),
      },
    })
  }

  assignProvider(id: string, providerId: string) {
    return this.prisma.booking.update({
      where: { id },
      data:  { providerId, status: 'accepted' },
    })
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
