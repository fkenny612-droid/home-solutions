/**
 * How long a booking can wait for a provider to accept before it is cancelled and the customer's payment is returned.
 * Emergencies get a short window — a customer with a burst pipe can't wait — so the app can promise exactly this.
 */
export const EMERGENCY_ACCEPT_WINDOW_MIN = 15
export const STANDARD_ACCEPT_WINDOW_MIN  = 120

const MINUTE_MS = 60_000

export function acceptWindowMinutes(isEmergency: boolean): number {
  return isEmergency ? EMERGENCY_ACCEPT_WINDOW_MIN : STANDARD_ACCEPT_WINDOW_MIN
}

/** True once an unaccepted booking has waited longer than its window. */
export function isStale(booking: { status: string; isEmergency: boolean; createdAt: Date }, now: Date = new Date()): boolean {
  if (booking.status !== 'pending' && booking.status !== 'emergency') return false
  return now.getTime() - booking.createdAt.getTime() > acceptWindowMinutes(booking.isEmergency) * MINUTE_MS
}

/** The oldest createdAt that is still within the window, for each kind of booking (used to query stale ones). */
export function cutoffs(now: Date = new Date()): { emergency: Date; standard: Date } {
  return {
    emergency: new Date(now.getTime() - EMERGENCY_ACCEPT_WINDOW_MIN * MINUTE_MS),
    standard:  new Date(now.getTime() - STANDARD_ACCEPT_WINDOW_MIN * MINUTE_MS),
  }
}
