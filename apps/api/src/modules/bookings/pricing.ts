import { SERVICE_PRICING } from './pricing.generated'

/** Flat fee added to every standard estimate (mirrors calculateEstimate in the mobile app). */
export const CALL_OUT_FEE = 150
/** Flat price of an emergency call-out. */
export const EMERGENCY_CALLOUT_FEE = 850
/** A booking can never be discounted below this amount. */
export const MIN_PAYABLE = 50

export function isKnownService(serviceType: string): boolean {
  return Object.prototype.hasOwnProperty.call(SERVICE_PRICING, serviceType)
}

/**
 * Price range for a job, from the customer's answers. Must stay identical to calculateEstimate()
 * in apps/mobile/lib/serviceConfig.ts — test/pricing.spec.ts enforces that.
 * Note it only prices "select" answers; counters (quantity, days) do not change the price.
 */
export function calculateEstimate(serviceType: string, answers: Record<string, unknown> = {}): { min: number; max: number } {
  if (!isKnownService(serviceType)) return { min: 0, max: 0 }

  let min = 0
  let max = 0
  for (const q of SERVICE_PRICING[serviceType]) {
    const answer = answers[q.key]
    if (!answer) continue
    const option = q.options.find(o => o.value === answer)
    if (option) { min += option.priceMin; max += option.priceMax }
  }
  min += CALL_OUT_FEE
  max += CALL_OUT_FEE

  return { min: Math.max(min, 150), max: Math.max(max, 300) }
}

/** What the customer is charged before any discount: the midpoint of the estimate. */
export function baseQuote(serviceType: string, answers: Record<string, unknown> = {}): number {
  const { min, max } = calculateEstimate(serviceType, answers)
  return Math.round((min + max) / 2)
}

export interface PriceInput {
  serviceType: string
  answers?:    Record<string, unknown>
  emergency?:  boolean
  discount?:   number
}

export interface PriceResult { base: number; discount: number; total: number }

/** Authoritative booking price. Throws if a discount would push the total below MIN_PAYABLE. */
export function priceBooking({ serviceType, answers, emergency, discount = 0 }: PriceInput): PriceResult {
  const base = emergency ? EMERGENCY_CALLOUT_FEE : baseQuote(serviceType, answers)
  if (discount > 0 && base - discount < MIN_PAYABLE) {
    throw new RangeError(`This reward needs a job total of at least R${discount + MIN_PAYABLE}`)
  }
  return { base, discount, total: base - discount }
}
