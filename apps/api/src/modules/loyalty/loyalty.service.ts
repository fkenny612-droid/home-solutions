import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { REWARDS } from './loyalty.constants'

function generateCode() {
  return Array.from({ length: 8 }, () => '0123456789ABCDEFGHJKLMNPQRSTUVWXYZ'[Math.floor(Math.random() * 35)]).join('')
}

@Injectable()
export class LoyaltyService {
  constructor(private prisma: PrismaService) {}

  getRewards() {
    return REWARDS
  }

  async getBalance(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { loyaltyPoints: true } })
    return { points: user?.loyaltyPoints ?? 0 }
  }

  getMyRedemptions(userId: string) {
    return this.prisma.loyaltyRedemption.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } })
  }

  async redeem(userId: string, rewardId: string) {
    const reward = REWARDS.find(r => r.id === rewardId)
    if (!reward) throw new NotFoundException('Reward not found')

    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { loyaltyPoints: true } })
    if (!user || user.loyaltyPoints < reward.pointsCost) {
      throw new BadRequestException('Not enough points')
    }

    let code = generateCode()
    while (await this.prisma.loyaltyRedemption.findUnique({ where: { code } })) code = generateCode()

    const [, redemption] = await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: userId }, data: { loyaltyPoints: { decrement: reward.pointsCost } } }),
      this.prisma.loyaltyRedemption.create({
        data: { userId, rewardId: reward.id, pointsSpent: reward.pointsCost, discountAmount: reward.discountAmount, code },
      }),
    ])
    return redemption
  }
}
