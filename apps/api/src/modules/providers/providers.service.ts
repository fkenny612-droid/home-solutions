import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'

export type ProviderStatus = 'pending_kyc' | 'active' | 'suspended'
export type KycStatus      = 'pending' | 'in_review' | 'approved' | 'rejected'

@Injectable()
export class ProvidersService {
  constructor(private prisma: PrismaService) {}

  async findAll(status?: string, skill?: string) {
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
    if (skill && !HIRE_SERVICES.has(skill)) {
      const providerIds = providers.map(p => p.id)
      const tradeCerts  = await this.prisma.kycDocument.findMany({
        where: { providerId: { in: providerIds }, type: 'trade_cert' },
        select: { providerId: true },
      })
      const certifiedIds = new Set(tradeCerts.map(c => c.providerId))
      return providers.filter(p => certifiedIds.has(p.id))
    }

    return providers
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
