import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'

@Injectable()
export class ListingsService {
  constructor(private prisma: PrismaService) {}

  async findAll(params: { category?: string; q?: string; city?: string; sellerId?: string }) {
    const where: any = {}
    if (params.category) where.category = params.category
    if (params.city)     where.city     = { contains: params.city, mode: 'insensitive' }
    if (params.sellerId) where.sellerId = params.sellerId
    if (params.q) {
      where.OR = [
        { title:       { contains: params.q, mode: 'insensitive' } },
        { description: { contains: params.q, mode: 'insensitive' } },
        { suburb:      { contains: params.q, mode: 'insensitive' } },
      ]
    }
    const rows = await this.prisma.listing.findMany({
      where,
      orderBy: [{ urgent: 'desc' }, { createdAt: 'desc' }],
      take: 100,
    })
    return rows.map(r => this.toDto(r, null))
  }

  async findMine(userId: string) {
    const rows = await this.prisma.listing.findMany({
      where:   { sellerId: userId },
      orderBy: { createdAt: 'desc' },
    })
    return rows.map(r => this.toDto(r, userId))
  }

  async findOne(id: string, userId?: string) {
    const row = await this.prisma.listing.findUnique({ where: { id } })
    if (!row) throw new NotFoundException('Listing not found')
    // increment view count (fire and forget)
    this.prisma.listing.update({ where: { id }, data: { views: { increment: 1 } } }).catch(() => {})
    return this.toDto(row, userId ?? null)
  }

  async create(userId: string, userPhone: string, userName: string, dto: {
    category: string; subcategory: string; title: string; description: string
    price?: number | null; priceLabel: string; condition?: string | null
    images: string[]; city: string; suburb: string; urgent: boolean
  }) {
    const row = await this.prisma.listing.create({
      data: {
        sellerId:    userId,
        sellerPhone: userPhone,
        sellerName:  userName,
        category:    dto.category,
        subcategory: dto.subcategory,
        title:       dto.title,
        description: dto.description,
        price:       dto.price ?? null,
        priceLabel:  dto.priceLabel,
        condition:   dto.condition ?? null,
        images:      dto.images ?? [],
        city:        dto.city,
        suburb:      dto.suburb,
        urgent:      dto.urgent ?? false,
      },
    })
    return this.toDto(row, userId)
  }

  async update(id: string, userId: string, dto: Partial<{
    title: string; description: string; price: number | null; priceLabel: string
    condition: string | null; images: string[]; suburb: string; urgent: boolean
  }>) {
    const row = await this.prisma.listing.findUnique({ where: { id } })
    if (!row)              throw new NotFoundException('Listing not found')
    if (row.sellerId !== userId) throw new ForbiddenException('Not your listing')
    const updated = await this.prisma.listing.update({ where: { id }, data: dto })
    return this.toDto(updated, userId)
  }

  async remove(id: string, userId: string) {
    const row = await this.prisma.listing.findUnique({ where: { id } })
    if (!row)              throw new NotFoundException('Listing not found')
    if (row.sellerId !== userId) throw new ForbiddenException('Not your listing')
    await this.prisma.listing.delete({ where: { id } })
    return { ok: true }
  }

  async toggleSave(id: string, userId: string) {
    const row = await this.prisma.listing.findUnique({ where: { id } })
    if (!row) throw new NotFoundException('Listing not found')
    const already = row.savedBy.includes(userId)
    await this.prisma.listing.update({
      where: { id },
      data:  { savedBy: already
        ? { set: row.savedBy.filter(u => u !== userId) }
        : { push: userId }
      },
    })
    return { saved: !already }
  }

  private toDto(row: any, userId: string | null) {
    return {
      id:           row.id,
      sellerId:     row.sellerId,
      sellerName:   row.sellerName,
      sellerPhone:  row.sellerPhone,
      sellerAvatar: row.sellerAvatar ?? null,
      category:     row.category,
      subcategory:  row.subcategory,
      title:        row.title,
      description:  row.description,
      price:        row.price,
      priceLabel:   row.priceLabel,
      condition:    row.condition,
      images:       row.images ?? [],
      city:         row.city,
      suburb:       row.suburb,
      views:        row.views,
      saved:        userId ? row.savedBy.includes(userId) : false,
      urgent:       row.urgent,
      createdAt:    row.createdAt,
    }
  }
}
