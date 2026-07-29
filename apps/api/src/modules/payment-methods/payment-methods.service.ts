import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'

@Injectable()
export class PaymentMethodsService {
  constructor(private prisma: PrismaService) {}

  async list(userId: string) {
    return this.prisma.savedCard.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    })
  }

  async add(userId: string, dto: { brand: string; last4: string; expiry: string; holderName: string }) {
    const existing = await this.prisma.savedCard.count({ where: { userId } })
    const isDefault = existing === 0
    return this.prisma.savedCard.create({
      data: { userId, ...dto, isDefault },
    })
  }

  async setDefault(id: string, userId: string) {
    const card = await this.prisma.savedCard.findUnique({ where: { id } })
    if (!card) throw new NotFoundException('Card not found')
    if (card.userId !== userId) throw new ForbiddenException()
    await this.prisma.savedCard.updateMany({ where: { userId }, data: { isDefault: false } })
    return this.prisma.savedCard.update({ where: { id }, data: { isDefault: true } })
  }

  async remove(id: string, userId: string) {
    const card = await this.prisma.savedCard.findUnique({ where: { id } })
    if (!card) throw new NotFoundException('Card not found')
    if (card.userId !== userId) throw new ForbiddenException()
    await this.prisma.savedCard.delete({ where: { id } })
    // If deleted card was default, promote the next card
    if (card.isDefault) {
      const next = await this.prisma.savedCard.findFirst({ where: { userId }, orderBy: { createdAt: 'asc' } })
      if (next) await this.prisma.savedCard.update({ where: { id: next.id }, data: { isDefault: true } })
    }
    return { success: true }
  }
}
