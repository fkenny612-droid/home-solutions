import { BookingStatus } from './booking.types'

export type Actor = 'client' | 'provider' | 'admin'

export const ALL_STATUSES: BookingStatus[] = ['pending', 'accepted', 'en_route', 'in_progress', 'completed', 'cancelled', 'emergency']
export const OPEN_STATUSES: BookingStatus[] = ['pending', 'emergency', 'accepted', 'en_route', 'in_progress']

/**
 * Who may move a booking from one status to another. A provider *accepting* a job is not a status
 * change — it goes through assignProvider, which also checks approval and payment.
 * 'emergency' is a legacy status and behaves exactly like 'pending'.
 */
const TRANSITIONS: Record<string, Partial<Record<BookingStatus, Actor[]>>> = {
  pending:     { cancelled: ['client', 'admin'] },
  emergency:   { cancelled: ['client', 'admin'] },
  accepted:    { en_route: ['provider', 'admin'], in_progress: ['admin'], cancelled: ['client', 'provider', 'admin'] },
  en_route:    { in_progress: ['provider', 'admin'], cancelled: ['client', 'provider', 'admin'] },
  in_progress: { completed: ['provider', 'admin'], cancelled: ['admin'] },
  // completed and cancelled are final.
}

export function canTransition(from: string, to: BookingStatus, actor: Actor): boolean {
  return TRANSITIONS[from]?.[to]?.includes(actor) ?? false
}

/** The statuses `actor` can move a booking to right now (used by the admin portal's buttons). */
export function nextStatuses(from: string, actor: Actor): BookingStatus[] {
  const row = TRANSITIONS[from] ?? {}
  return (Object.keys(row) as BookingStatus[]).filter(to => row[to]!.includes(actor))
}
