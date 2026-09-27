/**
 * Pure dispatch rules — no I/O, so they're easy to reason about and test.
 */

export interface TruckSpec {
  status:        string
  grossWeightKg: number
  tareWeightKg:  number
  hazmatTypes:   string[]
}

export interface LoadSpec {
  weightKg:    number
  hazmatTypes: string[]
}

/** Returns human-readable reasons a truck can't haul a load (empty = OK). */
export function truckLoadProblems(truck: TruckSpec, load: LoadSpec): string[] {
  const problems: string[] = []
  if (truck.status === 'out_of_service') problems.push('Truck is out of service')

  const payload = truck.grossWeightKg - truck.tareWeightKg
  if (load.weightKg > payload) {
    problems.push(`Load is ${load.weightKg.toLocaleString()} kg but truck payload capacity is ${payload.toLocaleString()} kg`)
  }

  const missing = load.hazmatTypes.filter(h => !truck.hazmatTypes.includes(h))
  if (missing.length) problems.push(`Truck is not certified for hazmat: ${missing.join(', ')}`)

  return problems
}

/** Allowed manual status changes. booked → assigned happens via assign(). */
const TRANSITIONS: Record<string, string[]> = {
  booked:     ['cancelled'],
  assigned:   ['in_transit', 'cancelled'],
  in_transit: ['delivered'],
  delivered:  [],
  cancelled:  [],
}

export function canTransition(from: string, to: string): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false
}

/** Statuses during which a load occupies its truck. */
export const ACTIVE_LOAD_STATUSES = ['assigned', 'in_transit']

/**
 * Phone numbers are stored as typed, so match drivers on digits only
 * ("+1 (555) 010-0100" == "15550100100"). Null if too short to be a number.
 */
export function phoneKey(phone?: string | null): string | null {
  const digits = (phone ?? '').replace(/\D/g, '')
  return digits.length >= 7 ? digits : null
}
