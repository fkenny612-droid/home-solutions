export interface Viewer { sub: string; role: string }

/** The fields only the provider themselves (and admins) may see. Other users — i.e. customers — never get these. */
const PRIVATE_FIELDS = ['phone', 'email', 'earningsBalance', 'hireInventory'] as const

interface ProviderRow {
  id:        string
  monFri:    boolean
  saturday:  boolean
  sunday:    boolean
  emergency: boolean
  [key: string]: unknown
}

/**
 * Shapes a provider row for a viewer:
 *  - adds the nested `availability` object the mobile app's Provider type has always expected
 *    (the database stores these as flat columns, so the app's Availability screen and emergency badges silently broke);
 *  - strips contact details and earnings unless the viewer is that provider or an admin.
 */
export function presentProvider<T extends ProviderRow>(p: T, viewer: Viewer) {
  const full = {
    ...p,
    availability: { monFri: p.monFri, saturday: p.saturday, sunday: p.sunday, emergency: p.emergency },
  }
  if (viewer.role === 'admin' || viewer.sub === p.id) return full

  const publicView: Record<string, unknown> = { ...full }
  for (const key of PRIVATE_FIELDS) delete publicView[key]
  return publicView as Omit<typeof full, (typeof PRIVATE_FIELDS)[number]>
}
