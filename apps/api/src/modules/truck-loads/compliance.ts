/**
 * Compliance rules for trucks and carrier companies. Pure functions so the
 * API, the daily alert job and assignment checks all agree.
 */

export const EXPIRY_WARNING_DAYS = 30
const DAY_MS = 86_400_000

export type ItemStatus = 'ok' | 'expiring' | 'expired' | 'missing'

export interface ComplianceItem {
  key: string
  label: string
  expiresAt: Date | null
  status: ItemStatus
  daysLeft: number | null
  /** Legally required to operate: expired/missing blocks assignment. */
  blocking: boolean
}

export function itemStatus(expiresAt: Date | null, now = new Date()): { status: ItemStatus; daysLeft: number | null } {
  if (!expiresAt) return { status: 'missing', daysLeft: null }
  const daysLeft = Math.ceil((new Date(expiresAt).getTime() - now.getTime()) / DAY_MS)
  if (daysLeft < 0) return { status: 'expired', daysLeft }
  if (daysLeft <= EXPIRY_WARNING_DAYS) return { status: 'expiring', daysLeft }
  return { status: 'ok', daysLeft }
}

export interface TruckComplianceInput {
  driverName?: string | null
  licenceDiscExpiry?: Date | null
  roadworthyExpiry?: Date | null
  insuranceExpiry?: Date | null
  driverLicenceExpiry?: Date | null
  driverPrdpExpiry?: Date | null
}

const TRUCK_ITEMS: { key: keyof TruckComplianceInput; label: string; required: boolean; driver?: boolean }[] = [
  { key: 'licenceDiscExpiry',   label: 'Licence disc',       required: true },
  { key: 'roadworthyExpiry',    label: 'Roadworthy (COR)',   required: false },
  { key: 'insuranceExpiry',     label: 'Insurance',          required: false },
  { key: 'driverLicenceExpiry', label: "Driver's licence",   required: true, driver: true },
  { key: 'driverPrdpExpiry',    label: 'PrDP',               required: true, driver: true },
]

export function truckCompliance(t: TruckComplianceInput, now = new Date()) {
  const items: ComplianceItem[] = []
  for (const spec of TRUCK_ITEMS) {
    // Driver documents only apply when a driver is on the truck
    if (spec.driver && !t.driverName) continue
    const expiresAt = (t[spec.key] as Date | null | undefined) ?? null
    const { status, daysLeft } = itemStatus(expiresAt, now)
    // Optional items that were never recorded aren't reported
    if (status === 'missing' && !spec.required) continue
    items.push({
      key: spec.key, label: spec.label, expiresAt, status, daysLeft,
      blocking: spec.required && (status === 'expired' || status === 'missing'),
    })
  }
  const overall: ItemStatus =
    items.some(i => i.status === 'expired') ? 'expired'
    : items.some(i => i.status === 'missing') ? 'missing'
    : items.some(i => i.status === 'expiring') ? 'expiring'
    : 'ok'
  return { overall, items, blocked: items.some(i => i.blocking && i.status === 'expired') }
}

/** Only an actually-expired legal document stops a truck being dispatched. */
export function complianceBlockers(t: TruckComplianceInput, now = new Date()): string[] {
  return truckCompliance(t, now).items
    .filter(i => i.blocking && i.status === 'expired')
    .map(i => `${i.label} expired ${-(i.daysLeft ?? 0)} day(s) ago`)
}

// ── Carrier company ─────────────────────────────────────────────────────────

export interface CarrierDocSpec { kind: string; label: string; required: boolean; expires: boolean }

export const CARRIER_DOCUMENTS: CarrierDocSpec[] = [
  { kind: 'cipc_registration', label: 'CIPC company registration',            required: true,  expires: false },
  { kind: 'git_insurance',     label: 'Goods-in-transit insurance',           required: true,  expires: true },
  { kind: 'tax_status',        label: 'SARS tax compliance status (PIN)',     required: true,  expires: true },
  { kind: 'bank_confirmation', label: 'Bank confirmation letter',             required: true,  expires: false },
  { kind: 'bbbee_certificate', label: 'B-BBEE certificate / affidavit',       required: false, expires: true },
]

/**
 * What shippers see. A verified carrier whose insurance or tax status has
 * lapsed shows as "lapsed" until renewed documents are uploaded.
 */
export function carrierBadge(
  profile: { status: string } | null,
  docs: { kind: string; expiresAt: Date | null }[],
  now = new Date(),
): 'verified' | 'lapsed' | 'pending' | 'unverified' {
  if (!profile) return 'unverified'
  if (profile.status === 'pending') return 'pending'
  if (profile.status !== 'verified') return 'unverified'
  const lapsed = CARRIER_DOCUMENTS.some(spec => {
    if (!spec.required || !spec.expires) return false
    const doc = docs.find(d => d.kind === spec.kind)
    return !doc || itemStatus(doc.expiresAt, now).status === 'expired'
  })
  return lapsed ? 'lapsed' : 'verified'
}
