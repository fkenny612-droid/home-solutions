import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'

export const CLIENT_PLANS = {
  basic_home: {
    id: 'basic_home',
    name: 'Basic Home',
    priceMonthly: 149,
    discount: 5,
    warrantyDays: 30,
    emergencyCallouts: 0,
    features: ['5% off all bookings', '30-day workmanship warranty', 'Priority support'],
  },
  premium_home: {
    id: 'premium_home',
    name: 'Premium Home',
    priceMonthly: 299,
    discount: 15,
    warrantyDays: 90,
    emergencyCallouts: 2,
    features: ['15% off all bookings', '90-day workmanship warranty', '2 free emergency callouts/month', 'Priority support', 'Dedicated account manager'],
  },
  estate_biz: {
    id: 'estate_biz',
    name: 'Estate / Business',
    priceMonthly: 999,
    discount: 20,
    warrantyDays: 90,
    emergencyCallouts: 10,
    features: ['20% off all bookings', '90-day workmanship warranty', '10 emergency callouts/month', 'Bulk booking management', 'Monthly service report', 'Dedicated account manager'],
  },
}

export const PROVIDER_PLANS = {
  starter: {
    id: 'starter',
    name: 'Starter',
    priceMonthly: 0,
    commissionPct: 20,
    featured: false,
    features: ['20% platform commission', 'Standard listing', 'Basic job matching', 'Community support'],
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    priceMonthly: 249,
    commissionPct: 12,
    featured: false,
    features: ['12% platform commission', 'Enhanced listing', 'Priority job matching', 'Provider badge', 'Email support'],
  },
  elite: {
    id: 'elite',
    name: 'Elite',
    priceMonthly: 599,
    commissionPct: 8,
    featured: true,
    features: ['8% platform commission', 'Featured listing', 'First access to new jobs', 'Elite badge', 'Dedicated support', 'Monthly performance report'],
  },
}

@Injectable()
export class SubscriptionsService {
  constructor(private prisma: PrismaService) {}

  getClientPlans() { return Object.values(CLIENT_PLANS) }
  getProviderPlans() { return Object.values(PROVIDER_PLANS) }

  async getMy(userId: string, userRole: string) {
    const sub = await this.prisma.subscription.findUnique({
      where: { userId_userRole: { userId, userRole } },
    })
    if (!sub || sub.status !== 'active') return null
    const plans = userRole === 'provider' ? PROVIDER_PLANS : CLIENT_PLANS
    return { ...sub, plan: plans[sub.planId as keyof typeof plans] ?? null }
  }

  async subscribe(userId: string, userRole: string, planId: string, peachTokenId?: string) {
    const plans = userRole === 'provider' ? PROVIDER_PLANS : CLIENT_PLANS
    if (!plans[planId as keyof typeof plans]) {
      throw new BadRequestException(`Unknown plan: ${planId}`)
    }
    const plan = plans[planId as keyof typeof plans]
    const expiresAt = new Date()
    expiresAt.setMonth(expiresAt.getMonth() + 1)

    const sub = await this.prisma.subscription.upsert({
      where: { userId_userRole: { userId, userRole } },
      create: { userId, userRole, planId, status: 'active', peachTokenId, expiresAt },
      update: { planId, status: 'active', peachTokenId, expiresAt, cancelledAt: null, startsAt: new Date() },
    })
    return { ...sub, plan }
  }

  async cancel(userId: string, userRole: string) {
    const sub = await this.prisma.subscription.findUnique({
      where: { userId_userRole: { userId, userRole } },
    })
    if (!sub || sub.status !== 'active') throw new NotFoundException('No active subscription')
    return this.prisma.subscription.update({
      where: { userId_userRole: { userId, userRole } },
      data: { status: 'cancelled', cancelledAt: new Date() },
    })
  }

  async getDiscount(userId: string): Promise<number> {
    const sub = await this.prisma.subscription.findUnique({
      where: { userId_userRole: { userId, userRole: 'client' } },
    })
    if (!sub || sub.status !== 'active') return 0
    return CLIENT_PLANS[sub.planId as keyof typeof CLIENT_PLANS]?.discount ?? 0
  }

  getMrr() {
    return {
      basicHome:   { count: 1248, mrr: 1248 * CLIENT_PLANS.basic_home.priceMonthly },
      premiumHome: { count: 774,  mrr: 774  * CLIENT_PLANS.premium_home.priceMonthly },
      estateBiz:   { count: 38,   mrr: 38   * CLIENT_PLANS.estate_biz.priceMonthly },
      providerPro:   { count: 312, mrr: 312 * PROVIDER_PLANS.pro.priceMonthly },
      providerElite: { count: 87,  mrr: 87  * PROVIDER_PLANS.elite.priceMonthly },
      get total() {
        return this.basicHome.mrr + this.premiumHome.mrr + this.estateBiz.mrr +
               this.providerPro.mrr + this.providerElite.mrr
      },
    }
  }
}
