import { Injectable, NotFoundException } from '@nestjs/common'
import { Booking, BookingStatus, ServiceType } from './booking.types'
import { v4 as uuid } from 'uuid'

// Mock in-memory store — swap for TypeORM/Prisma repository in production
const store: Booking[] = [
  {
    id: 'B-1042',
    clientId: 'client-1',
    providerId: 'prov-kevin',
    serviceType: 'electrical',
    status: 'en_route',
    location: 'Umhlanga',
    address: '14 Marine Drive, Umhlanga',
    quotedAmount: 1250,
    finalAmount: null,
    paymentMethod: 'card',
    paymentHeld: true,
    paymentReleased: false,
    warrantyExpiresAt: null,
    notes: 'DB board fault',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'B-1041',
    clientId: 'client-2',
    providerId: null,
    serviceType: 'plumbing',
    status: 'emergency',
    location: 'Ballito',
    address: '4 Dunkirk Estate, Ballito',
    quotedAmount: 1800,
    finalAmount: null,
    paymentMethod: 'card',
    paymentHeld: false,
    paymentReleased: false,
    warrantyExpiresAt: null,
    notes: 'Burst pipe — urgent',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'B-1039',
    clientId: 'client-3',
    providerId: 'prov-raj',
    serviceType: 'plumbing',
    status: 'pending',
    location: 'Glenwood',
    address: '22 Glenwood Road, Durban',
    quotedAmount: 1000,
    finalAmount: null,
    paymentMethod: 'card',
    paymentHeld: true,
    paymentReleased: false,
    warrantyExpiresAt: null,
    notes: 'Geyser repair',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
]

@Injectable()
export class BookingsService {
  findAll(status?: BookingStatus, serviceType?: ServiceType) {
    let result = [...store]
    if (status) result = result.filter(b => b.status === status)
    if (serviceType) result = result.filter(b => b.serviceType === serviceType)
    return result
  }

  findOne(id: string) {
    const booking = store.find(b => b.id === id)
    if (!booking) throw new NotFoundException(`Booking ${id} not found`)
    return booking
  }

  create(dto: { clientId: string; serviceType: ServiceType; location: string; address: string; quotedAmount: number; paymentMethod: string; notes?: string }) {
    const booking: Booking = {
      id: `B-${Math.floor(1000 + Math.random() * 9000)}`,
      clientId: dto.clientId,
      providerId: null,
      serviceType: dto.serviceType,
      status: 'pending',
      location: dto.location,
      address: dto.address,
      quotedAmount: dto.quotedAmount,
      finalAmount: null,
      paymentMethod: dto.paymentMethod as any,
      paymentHeld: false,
      paymentReleased: false,
      warrantyExpiresAt: null,
      notes: dto.notes || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    store.push(booking)
    return booking
  }

  updateStatus(id: string, status: BookingStatus) {
    const booking = this.findOne(id)
    booking.status = status
    booking.updatedAt = new Date()
    if (status === 'completed') {
      booking.paymentReleased = true
      const exp = new Date()
      exp.setDate(exp.getDate() + 90)
      booking.warrantyExpiresAt = exp
    }
    return booking
  }

  assignProvider(id: string, providerId: string) {
    const booking = this.findOne(id)
    booking.providerId = providerId
    booking.status = 'accepted'
    booking.updatedAt = new Date()
    return booking
  }

  stats() {
    return {
      total: store.length,
      active: store.filter(b => ['accepted', 'en_route', 'in_progress'].includes(b.status)).length,
      emergency: store.filter(b => b.status === 'emergency').length,
      pending: store.filter(b => b.status === 'pending').length,
      revenueToday: store.filter(b => b.status === 'completed').reduce((sum, b) => sum + (b.finalAmount || b.quotedAmount), 0),
    }
  }
}
