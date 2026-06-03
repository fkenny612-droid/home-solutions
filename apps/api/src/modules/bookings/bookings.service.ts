import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { BookingStatus, ServiceType } from './booking.types'

@Injectable()
export class BookingsService {
  constructor(private prisma: PrismaService) {}

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

  create(dto: {
    clientId:      string
    serviceType:   ServiceType
    location:      string
    address:       string
    quotedAmount:  number
    paymentMethod: string
    notes?:        string
  }) {
    return this.prisma.booking.create({
      data: {
        clientId:     dto.clientId,
        serviceType:  dto.serviceType,
        location:     dto.location,
        address:      dto.address,
        quotedAmount: dto.quotedAmount,
        paymentMethod: dto.paymentMethod,
        notes:        dto.notes ?? null,
        status:       'pending',
      },
    })
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
