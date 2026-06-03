import { Injectable } from '@nestjs/common'

const PLANS = {
  basic_home: { name: 'Basic Home', priceMonthly: 149, discount: 5, warrantyDays: 30, emergencyCallouts: 0 },
  premium_home: { name: 'Premium Home', priceMonthly: 299, discount: 15, warrantyDays: 90, emergencyCallouts: 2 },
  estate_biz: { name: 'Estate / Business', priceMonthly: 999, discount: 20, warrantyDays: 90, emergencyCallouts: 10 },
}

@Injectable()
export class SubscriptionsService {
  getPlans() { return PLANS }

  getPlan(planId: string) { return PLANS[planId as keyof typeof PLANS] || null }

  getMrr() {
    return {
      basicHome: { count: 1248, mrr: 1248 * PLANS.basic_home.priceMonthly },
      premiumHome: { count: 774, mrr: 774 * PLANS.premium_home.priceMonthly },
      estateBiz: { count: 38, mrr: 38 * PLANS.estate_biz.priceMonthly },
      total: 1248 * PLANS.basic_home.priceMonthly + 774 * PLANS.premium_home.priceMonthly + 38 * PLANS.estate_biz.priceMonthly,
    }
  }
}
