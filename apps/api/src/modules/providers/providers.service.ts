import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'

export type ProviderStatus = 'pending_kyc' | 'active' | 'suspended'
export type KycStatus      = 'pending' | 'in_review' | 'approved' | 'rejected'

@Injectable()
export class ProvidersService {
  constructor(private prisma: PrismaService) {}

  private haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLng = (lng2 - lng1) * Math.PI / 180
    const a = Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  }

  async findAll(status?: string, skill?: string, clientLat?: number, clientLng?: number) {
    const providers = await this.prisma.provider.findMany({
      where: {
        ...(status ? { status } : {}),
        ...(skill  ? { skills: { has: skill } } : {}),
      },
      orderBy: { rating: 'desc' },
    })

    // Hire services and non-trade skills don't require a trade certificate
    const HIRE_SERVICES = new Set([
      'handyman', 'cleaning', 'landscaping', 'pool', 'pest_control', 'locksmith',
      'moving', 'gate_motor', 'paving', 'security', 'dstv', 'septic_tank',
      'tent_hire', 'chair_table_hire', 'decor_hire', 'sound_pa_hire',
      'jumping_castle_hire', 'catering_equipment_hire', 'cold_room_hire', 'mobile_toilet_hire',
      'generator_hire', 'water_bowser_hire',
      'van_hire', 'bakkie_hire', 'furniture_removal', 'last_mile_delivery', 'livestock_transport',
      'security_guard_hire',
    ])
    let filtered = providers
    if (skill && !HIRE_SERVICES.has(skill)) {
      const providerIds = providers.map(p => p.id)
      const tradeCerts  = await this.prisma.kycDocument.findMany({
        where: { providerId: { in: providerIds }, type: 'trade_cert' },
        select: { providerId: true },
      })
      const certifiedIds = new Set(tradeCerts.map(c => c.providerId))
      filtered = providers.filter(p => certifiedIds.has(p.id))
    }

    // Attach distance + ETA, sort by proximity when client coords provided
    const withDistance = filtered.map(p => {
      if (clientLat != null && clientLng != null && p.lat != null && p.lng != null) {
        const distanceKm  = Math.round(this.haversineKm(clientLat, clientLng, p.lat, p.lng) * 10) / 10
        const etaMinutes  = Math.round(distanceKm / 30 * 60) // ~30 km/h urban average
        return { ...p, distanceKm, etaMinutes }
      }
      return { ...p, distanceKm: null, etaMinutes: null }
    })

    if (clientLat != null && clientLng != null) {
      withDistance.sort((a, b) => {
        if (a.distanceKm == null) return 1
        if (b.distanceKm == null) return -1
        return a.distanceKm - b.distanceKm
      })
    }

    return withDistance
  }

  async findOne(id: string) {
    const p = await this.prisma.provider.findUnique({ where: { id } })
    if (!p) throw new NotFoundException(`Provider ${id} not found`)
    return p
  }

  updateKyc(id: string, kycStatus: KycStatus) {
    return this.prisma.provider.update({
      where: { id },
      data:  { kycStatus, ...(kycStatus === 'approved' ? { status: 'active' } : {}) },
    })
  }

  updateLocation(id: string, lat: number, lng: number) {
    return this.prisma.provider.update({
      where: { id },
      data:  { lat, lng },
    })
  }

  updateAvailability(id: string, dto: { monFri?: boolean; saturday?: boolean; sunday?: boolean; emergency?: boolean }) {
    return this.prisma.provider.update({ where: { id }, data: dto })
  }

  updateServiceAreas(id: string, areas: string[]) {
    return this.prisma.provider.update({ where: { id }, data: { serviceAreas: areas } })
  }

  async earnings(id: string) {
    const p = await this.findOne(id)
    return {
      available:  p.earningsBalance,
      thisMonth:  Math.round(p.earningsBalance * 5.87),
      total:      p.jobCount * 1200,
    }
  }

  async getDocuments(providerId: string) {
    const docs = await this.prisma.kycDocument.findMany({
      where:   { providerId },
      orderBy: { createdAt: 'desc' },
    })
    // Normalise hire_photo_<timestamp> → hire_photo so the client can group them
    return docs.map(d => ({
      ...d,
      type: d.type.startsWith('hire_photo') ? 'hire_photo' : d.type,
    }))
  }

  async getHireInventory(id: string) {
    const p = await this.findOne(id)
    return (p.hireInventory ?? {}) as Record<string, Record<string, number>>
  }

  updateHireInventory(id: string, inventory: Record<string, Record<string, number>>) {
    return this.prisma.provider.update({
      where: { id },
      data:  { hireInventory: inventory },
    })
  }

  async getReviews(id: string) {
    return this.prisma.review.findMany({
      where:   { providerId: id },
      orderBy: { createdAt: 'desc' },
      take:    50,
    })
  }

  async addReview(id: string, stars: number, tags: string[], comment?: string, clientId?: string, bookingId?: string) {
    const p = await this.findOne(id)
    const total     = p.rating * p.reviewCount + stars
    const newCount  = p.reviewCount + 1
    const newRating = Math.round((total / newCount) * 10) / 10
    await this.prisma.review.create({
      data: { providerId: id, clientId: clientId ?? 'anonymous', stars, tags, comment, bookingId },
    })
    return this.prisma.provider.update({
      where: { id },
      data:  { rating: newRating, reviewCount: newCount, jobCount: { increment: 1 } },
    })
  }

  async requestWithdrawal(id: string, amount: number) {
    const p = await this.findOne(id)
    if (amount > p.earningsBalance) throw new Error('Insufficient balance')
    return this.prisma.provider.update({
      where: { id },
      data:  { earningsBalance: { decrement: amount } },
    })
  }

  saveDocument(providerId: string, type: string, fileName: string, fileUrl: string) {
    // Hire photos can be multiple — always create a new row with a unique type key
    if (type === 'hire_photo') {
      const uniqueType = `hire_photo_${Date.now()}`
      return this.prisma.kycDocument.create({
        data: { providerId, type: uniqueType, fileName, fileUrl, status: 'pending' },
      })
    }
    return this.prisma.kycDocument.upsert({
      where:  { providerId_type: { providerId, type } },
      update: { fileName, fileUrl, status: 'pending' },
      create: { providerId, type, fileName, fileUrl, status: 'pending' },
    })
  }
}
