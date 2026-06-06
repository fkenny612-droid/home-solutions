import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'

export type ProviderStatus = 'pending_kyc' | 'active' | 'suspended'
export type KycStatus      = 'pending' | 'in_review' | 'approved' | 'rejected'

@Injectable()
export class ProvidersService {
  constructor(private prisma: PrismaService) {}

  findAll(status?: string, skill?: string) {
    return this.prisma.provider.findMany({
      where: {
        ...(status ? { status } : {}),
        ...(skill  ? { skills: { has: skill } } : {}),
      },
      orderBy: { rating: 'desc' },
    })
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

  getDocuments(providerId: string) {
    return this.prisma.kycDocument.findMany({
      where:   { providerId },
      orderBy: { createdAt: 'desc' },
    })
  }

  saveDocument(providerId: string, type: string, fileName: string, fileUrl: string) {
    return this.prisma.kycDocument.upsert({
      where:  { providerId_type: { providerId, type } },
      update: { fileName, fileUrl, status: 'pending' },
      create: { providerId, type, fileName, fileUrl, status: 'pending' },
    })
  }
}
