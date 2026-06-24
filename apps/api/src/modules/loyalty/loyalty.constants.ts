export interface LoyaltyReward {
  id:             string
  label:          string
  description:    string
  pointsCost:     number
  discountAmount: number
}

export const REWARDS: LoyaltyReward[] = [
  { id: 'r50',  label: 'R 50 off',  description: 'R50 discount on your next booking',  pointsCost: 500,  discountAmount: 50  },
  { id: 'r120', label: 'R 120 off', description: 'R120 discount on your next booking', pointsCost: 1000, discountAmount: 120 },
  { id: 'r250', label: 'R 250 off', description: 'R250 discount on your next booking', pointsCost: 2000, discountAmount: 250 },
  { id: 'r500', label: 'R 500 off', description: 'R500 discount on your next booking', pointsCost: 3500, discountAmount: 500 },
]

export const POINTS_PER_RAND_SPENT = 0.1 // 10 points per R100
export const REFERRAL_BONUS_POINTS = 200
