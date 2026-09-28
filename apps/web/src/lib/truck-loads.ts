/**
 * Truck Loads API client + unit helpers.
 * The API stores mm / kg (what Google's truck routing expects); the UI shows
 * metres, kg and km.
 */

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'https://railway-up-deploy-production.up.railway.app/api/v1'

/** Dispatcher and driver sign in separately, so one device can run both. */
export type Side = 'dispatch' | 'driver' | 'shipper' | 'admin'
const TOKEN_KEYS: Record<Side, string> = {
  dispatch: 'tl_dispatch_token', driver: 'tl_driver_token', shipper: 'tl_shipper_token', admin: 'tl_admin_token',
}

export function getToken(side: Side) {
  try { return localStorage.getItem(TOKEN_KEYS[side]) } catch { return null }
}
export function setToken(side: Side, t: string | null) {
  try {
    if (t) localStorage.setItem(TOKEN_KEYS[side], t)
    else localStorage.removeItem(TOKEN_KEYS[side])
  } catch {}
}

export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message) }
}

async function req<T>(side: Side, path: string, opts: RequestInit = {}): Promise<T> {
  const token = getToken(side)
  let res: Response
  try {
    res = await fetch(`${BASE}${path}`, {
      ...opts,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...opts.headers,
      },
    })
  } catch {
    // Browsers report an unreachable server as a bare "Load failed" / "Failed to fetch"
    throw new ApiError(0, `Can't reach the Truck Loads API at ${BASE} — is it running?`)
  }
  const body = await res.json().catch(() => null)
  if (!res.ok) {
    const msg = Array.isArray(body?.message) ? body.message.join('; ') : body?.message ?? `Request failed (${res.status})`
    throw new ApiError(res.status, msg)
  }
  return body as T
}

export function login(side: Side, phone: string, password: string) {
  return req<{ accessToken: string }>(side, '/auth/login', { method: 'POST', body: JSON.stringify({ phone, password }) })
    .then(r => { setToken(side, r.accessToken); return r })
}

// ── Types ─────────────────────────────────────────────────────────────────────

export type TruckStatus = 'available' | 'on_load' | 'out_of_service'
export type LoadStatus  = 'booked' | 'assigned' | 'in_transit' | 'delivered' | 'cancelled'

export interface Truck {
  id: string
  name: string
  plate: string
  driverName: string | null
  driverPhone: string | null
  heightMm: number
  widthMm: number
  lengthMm: number
  grossWeightKg: number
  tareWeightKg: number
  axleCount: number
  hazmatTypes: string[]
  status: TruckStatus
  licenceDiscExpiry?: string | null
  roadworthyExpiry?: string | null
  insuranceExpiry?: string | null
  driverLicenceExpiry?: string | null
  driverPrdpExpiry?: string | null
  compliance?: TruckCompliance
}

export interface LoadEvent { id: string; type: string; message: string; createdAt: string }

export interface Load {
  id: string
  reference: string
  shipperName: string
  commodity: string
  weightKg: number
  hazmatTypes: string[]
  rate: number | null
  originAddress: string
  originLat: number | null
  originLng: number | null
  destAddress: string
  destLat: number | null
  destLng: number | null
  pickupAt: string | null
  deliverBy: string | null
  status: LoadStatus
  notes: string | null
  truckId: string | null
  truck: Truck | null
  routeDistanceM: number | null
  routeDurationS: number | null
  routePolyline: string | null
  routeWarnings: string[]
  routeComputedAt: string | null
  shipmentId?: string | null
  events?: LoadEvent[]
  preview?: boolean
  previewTruck?: Truck
}

export interface Summary {
  loads: Partial<Record<LoadStatus, { count: number; revenue: number }>>
  trucks: Partial<Record<TruckStatus, number>>
  routingEnabled: boolean
}

export type TruckInput = Omit<Truck, 'id' | 'status' | 'compliance'>
export type LoadInput = Pick<Load,
  'reference' | 'shipperName' | 'commodity' | 'weightKg' | 'hazmatTypes' | 'originAddress' | 'destAddress'
> & { rate?: number; pickupAt?: string; deliverBy?: string; notes?: string }

// ── Endpoints ─────────────────────────────────────────────────────────────────

const d = <T,>(path: string, opts?: RequestInit) => req<T>('dispatch', path, opts)

export const dispatch = {
  summary:     () => d<Summary>('/truck-loads/summary'),
  hazmatTypes: () => d<string[]>('/truck-loads/hazmat-types'),

  trucks:      () => d<Truck[]>('/truck-loads/trucks'),
  createTruck: (t: TruckInput) => d<Truck>('/truck-loads/trucks', { method: 'POST', body: JSON.stringify(t) }),
  updateTruck: (id: string, t: Partial<TruckInput> & { status?: TruckStatus }) =>
    d<Truck>(`/truck-loads/trucks/${id}`, { method: 'PATCH', body: JSON.stringify(t) }),
  deleteTruck: (id: string) => d<{ ok: true }>(`/truck-loads/trucks/${id}`, { method: 'DELETE' }),

  loads:      (status?: LoadStatus) => d<Load[]>(`/truck-loads/loads${status ? `?status=${status}` : ''}`),
  load:       (id: string) => d<Load>(`/truck-loads/loads/${id}`),
  createLoad: (l: LoadInput) => d<Load>('/truck-loads/loads', { method: 'POST', body: JSON.stringify(l) }),
  assign:     (id: string, truckId: string) =>
    d<Load>(`/truck-loads/loads/${id}/assign`, { method: 'POST', body: JSON.stringify({ truckId }) }),
  unassign:   (id: string) => d<Load>(`/truck-loads/loads/${id}/unassign`, { method: 'POST' }),
  setStatus:  (id: string, status: LoadStatus) =>
    d<Load>(`/truck-loads/loads/${id}/status`, { method: 'POST', body: JSON.stringify({ status }) }),
  route:      (id: string, previewTruckId?: string) =>
    d<Load>(`/truck-loads/loads/${id}/route${previewTruckId ? `?truckId=${previewTruckId}` : ''}`, { method: 'POST' }),
}

/** What a driver sees — no rates or dispatcher-only fields. */
export type DriverTruck = Pick<Truck, 'id' | 'name' | 'plate' | 'heightMm' | 'widthMm' | 'lengthMm' | 'tareWeightKg' | 'axleCount' | 'hazmatTypes'>
export type DriverLoad = Omit<Load, 'rate' | 'truckId' | 'truck' | 'routeComputedAt' | 'preview' | 'previewTruck' | 'events'> & {
  truck: DriverTruck | null
  events?: Pick<LoadEvent, 'id' | 'message' | 'createdAt'>[]
}

const dr = <T,>(path: string, opts?: RequestInit) => req<T>('driver', path, opts)

export const driver = {
  loads:     () => dr<{ trucks: DriverTruck[]; loads: DriverLoad[] }>('/truck-loads/driver/loads'),
  load:      (id: string) => dr<DriverLoad>(`/truck-loads/driver/loads/${id}`),
  setStatus: (id: string, status: 'in_transit' | 'delivered', note?: string) =>
    dr<DriverLoad>(`/truck-loads/driver/loads/${id}/status`, { method: 'POST', body: JSON.stringify({ status, note }) }),
}

// ── Compliance & carrier verification ────────────────────────────────────────

export type ItemStatus = 'ok' | 'expiring' | 'expired' | 'missing'
export interface ComplianceItem { key: string; label: string; expiresAt: string | null; status: ItemStatus; daysLeft: number | null; blocking: boolean }
export interface TruckCompliance { overall: ItemStatus; items: ComplianceItem[]; blocked: boolean }
export interface ComplianceIssue {
  scope: 'truck' | 'company'; truckId?: string; subject: string; label: string
  status: 'expired' | 'expiring' | 'missing'; expiresAt: string | null; daysLeft: number | null
}
export interface ComplianceOverview { issues: ComplianceIssue[]; counts: { expired: number; expiring: number; missing: number } }

export type CarrierBadge = 'verified' | 'lapsed' | 'pending' | 'unverified'
export type TruckExpiryField = 'licenceDiscExpiry' | 'roadworthyExpiry' | 'insuranceExpiry' | 'driverLicenceExpiry' | 'driverPrdpExpiry'
export interface CarrierDocSpec { kind: string; label: string; required: boolean; expires: boolean }
export interface CarrierDoc { id: string; kind: string; fileName: string; mimeType: string; size: number; expiresAt: string | null; createdAt: string }
export interface CarrierProfile {
  id: string; ownerId: string; companyName: string; registrationNumber: string; vatNumber: string | null
  contactName: string; contactPhone: string; contactEmail: string | null; address: string | null
  status: 'draft' | 'pending' | 'verified' | 'rejected'; reviewNote: string | null
  submittedAt: string | null; verifiedAt: string | null; createdAt: string
  documents?: CarrierDoc[]
}
export interface CarrierProfileView { profile: CarrierProfile | null; badge: CarrierBadge; documentSpecs: CarrierDocSpec[] }
export type CarrierProfileInput = Pick<CarrierProfile, 'companyName' | 'registrationNumber' | 'contactName' | 'contactPhone'>
  & { vatNumber?: string; contactEmail?: string; address?: string }

/** Authenticated file download as a blob (documents need the bearer token). */
export async function fetchBlob(side: Side, path: string): Promise<Blob> {
  const token = getToken(side)
  let res: Response
  try {
    res = await fetch(`${BASE}${path}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
  } catch {
    throw new ApiError(0, `Can't reach the Truck Loads API at ${BASE} — is it running?`)
  }
  if (!res.ok) throw new ApiError(res.status, `Could not open document (${res.status})`)
  return res.blob()
}

/** Open a blob in a new tab; the tab is opened synchronously so popup blockers allow it. */
export async function openInNewTab(load: () => Promise<Blob>) {
  const tab = window.open('', '_blank')
  try {
    const url = URL.createObjectURL(await load())
    if (tab) tab.location.href = url
    else window.location.href = url
    setTimeout(() => URL.revokeObjectURL(url), 60_000)
  } catch (e) {
    tab?.close()
    throw e
  }
}

async function upload<T>(side: Side, path: string, form: FormData): Promise<T> {
  const token = getToken(side)
  let res: Response
  try {
    res = await fetch(`${BASE}${path}`, { method: 'POST', body: form, headers: token ? { Authorization: `Bearer ${token}` } : {} })
  } catch {
    throw new ApiError(0, `Can't reach the Truck Loads API at ${BASE} — is it running?`)
  }
  const body = await res.json().catch(() => null)
  if (!res.ok) {
    const msg = Array.isArray(body?.message) ? body.message.join('; ') : body?.message ?? `Upload failed (${res.status})`
    throw new ApiError(res.status, msg)
  }
  return body as T
}

export const carrier = {
  profile:    () => d<CarrierProfileView>('/truck-loads/carrier-profile'),
  save:       (p: CarrierProfileInput) => d<CarrierProfileView>('/truck-loads/carrier-profile', { method: 'PUT', body: JSON.stringify(p) }),
  uploadDoc(kind: string, file: File, expiresAt?: string) {
    const f = new FormData()
    f.append('file', file, file.name)
    if (expiresAt) f.append('expiresAt', expiresAt)
    return upload<CarrierProfileView>('dispatch', `/truck-loads/carrier-profile/documents/${kind}`, f)
  },
  document:   (docId: string) => fetchBlob('dispatch', `/truck-loads/carrier-profile/documents/${docId}`),
  submit:     () => d<CarrierProfileView>('/truck-loads/carrier-profile/submit', { method: 'POST' }),
  compliance: () => d<ComplianceOverview>('/truck-loads/compliance'),
}

export interface AdminCarrierRow extends CarrierProfile { badge: CarrierBadge; documentCount: number; fleetSize: number }
export interface AdminCarrierDetail {
  profile: CarrierProfile & { documents: CarrierDoc[] }
  owner: { phone: string; firstName: string | null; lastName: string | null } | null
  badge: CarrierBadge
  documentSpecs: CarrierDocSpec[]
  fleet: { id: string; name: string; plate: string; driverName: string | null; status: string; compliance: TruckCompliance }[]
}

const ad = <T,>(path: string, opts?: RequestInit) => req<T>('admin', path, opts)

export const platformAdmin = {
  carriers: (status?: string) => ad<AdminCarrierRow[]>(`/truck-loads/admin/carriers${status ? `?status=${status}` : ''}`),
  carrier:  (id: string) => ad<AdminCarrierDetail>(`/truck-loads/admin/carriers/${id}`),
  document: (id: string, docId: string) => fetchBlob('admin', `/truck-loads/admin/carriers/${id}/documents/${docId}`),
  verify:   (id: string) => ad<AdminCarrierDetail>(`/truck-loads/admin/carriers/${id}/verify`, { method: 'POST' }),
  reject:   (id: string, note?: string) =>
    ad<AdminCarrierDetail>(`/truck-loads/admin/carriers/${id}/reject`, { method: 'POST', body: JSON.stringify({ note }) }),
}

// ── Marketplace (shippers post, carriers bid) ────────────────────────────────

export type ShipmentStatus = 'open' | 'awarded' | 'in_transit' | 'delivered' | 'cancelled'
export type BidStatus = 'active' | 'withdrawn' | 'accepted' | 'declined'

export interface ShipperProfile {
  id: string; ownerId: string; companyName: string; contactName: string; contactPhone: string
  contactEmail: string | null; vatNumber: string | null; address: string | null
}
export type ShipperProfileInput = Pick<ShipperProfile, 'companyName' | 'contactName' | 'contactPhone'>
  & { contactEmail?: string; vatNumber?: string; address?: string }

export interface Shipment {
  id: string; reference: string; commodity: string; weightKg: number; hazmatTypes: string[]
  truckType: string | null; originAddress: string; destAddress: string
  pickupAt: string | null; deliverBy: string | null; notes: string | null
  targetRate: number | null; verifiedOnly: boolean; biddingClosesAt: string | null
  status: ShipmentStatus; awardedBidId: string | null; loadId: string | null; createdAt: string
}
export interface ShipmentInput {
  commodity: string; weightKg: number; hazmatTypes?: string[]; truckType?: string
  originAddress: string; destAddress: string; pickupAt?: string; deliverBy?: string; notes?: string
  targetRate?: number; verifiedOnly?: boolean; biddingClosesAt?: string
}
export interface CarrierSummary { companyName: string; badge: CarrierBadge; memberSince: string | null; fleetSize: number; completedLoads: number }
export interface ShipperBid { id: string; amount: number; message: string | null; status: BidStatus; createdAt: string; updatedAt: string; carrier: CarrierSummary | null }
export interface ShipperShipmentRow extends Shipment { bidCount: number; lowestBid: number | null; awardedAmount: number | null }
export interface ShipperShipmentDetail extends Shipment {
  bids: ShipperBid[]
  progress: {
    status: LoadStatus; routeDistanceM: number | null; routeDurationS: number | null
    truck: { name: string; plate: string; driverName: string | null } | null
    events: { id: string; message: string; createdAt: string; actor: string }[]
  } | null
}

const sh = <T,>(path: string, opts?: RequestInit) => req<T>('shipper', path, opts)

export const shipper = {
  register: (p: { phone: string; password: string; firstName: string; lastName: string }) =>
    req<{ accessToken: string }>('shipper', '/auth/register', { method: 'POST', body: JSON.stringify({ ...p, role: 'client' }) })
      .then(r => { setToken('shipper', r.accessToken); return r }),
  profile:     () => sh<{ profile: ShipperProfile | null; truckTypes: string[]; hazmatTypes: string[] }>('/truck-loads/shipper/profile'),
  saveProfile: (p: ShipperProfileInput) => sh<ShipperProfile>('/truck-loads/shipper/profile', { method: 'PUT', body: JSON.stringify(p) }),
  shipments:   () => sh<ShipperShipmentRow[]>('/truck-loads/shipper/shipments'),
  shipment:    (id: string) => sh<ShipperShipmentDetail>(`/truck-loads/shipper/shipments/${id}`),
  create:      (s: ShipmentInput) => sh<Shipment>('/truck-loads/shipper/shipments', { method: 'POST', body: JSON.stringify(s) }),
  accept:      (id: string, bidId: string) => sh<Shipment>(`/truck-loads/shipper/shipments/${id}/bids/${bidId}/accept`, { method: 'POST' }),
  cancel:      (id: string) => sh<Shipment>(`/truck-loads/shipper/shipments/${id}/cancel`, { method: 'POST' }),
}

export interface BoardShipment extends Shipment {
  shipperName: string; bidCount: number; fittingTrucks: number; canBid: boolean
  myBid: { id: string; amount: number; message: string | null } | null
}
export interface MyBid {
  id: string; amount: number; message: string | null; status: BidStatus; updatedAt: string
  shipment: {
    id: string; reference: string; status: ShipmentStatus; originAddress: string; destAddress: string
    pickupAt: string | null; weightKg: number; commodity: string; shipperName: string; loadId: string | null
  }
}

export const market = {
  board:    (q?: string) => d<{ badge: CarrierBadge; shipments: BoardShipment[] }>(`/truck-loads/market/shipments${q ? `?q=${encodeURIComponent(q)}` : ''}`),
  bid:      (id: string, amount: number, message?: string) =>
    d<{ id: string }>(`/truck-loads/market/shipments/${id}/bids`, { method: 'POST', body: JSON.stringify({ amount, message }) }),
  withdraw: (id: string) => d<{ id: string }>(`/truck-loads/market/shipments/${id}/bids`, { method: 'DELETE' }),
  myBids:   () => d<MyBid[]>('/truck-loads/market/bids'),
}

// ── Applications (carrier / driver onboarding) ────────────────────────────────

export type ApplicationStatus = 'pending' | 'approved' | 'rejected'

export interface DocumentSpec { kind: string; label: string; required: boolean | 'hazmat' }

export interface ApplicationFormInfo {
  documents: DocumentSpec[]
  truckTypes: string[]
  licenceCodes: string[]
  hazmatTypes: string[]
  maxFileBytes: number
  mimeTypes: string[]
}

export interface ApplicationDocMeta { id: string; kind: string; fileName: string; mimeType: string; size: number; createdAt: string }

export interface TruckApplication {
  id: string
  reference: string
  status: ApplicationStatus
  companyName: string | null
  contactName: string
  contactPhone: string
  contactEmail: string | null
  driverName: string
  driverPhone: string
  driverIdNumber: string
  licenceCode: string
  licenceExpiry: string
  prdpExpiry: string | null
  truckType: string
  make: string
  model: string | null
  year: number | null
  plate: string
  vin: string | null
  heightMm: number
  widthMm: number
  lengthMm: number
  grossWeightKg: number
  tareWeightKg: number
  axleCount: number
  hazmatTypes: string[]
  consentAt: string
  reviewNote: string | null
  reviewedAt: string | null
  truckId: string | null
  createdAt: string
  documentCount?: number
  documents?: ApplicationDocMeta[]
  checks?: { warnings: string[]; driverHasAccount: boolean }
}

export const applications = {
  link:     () => d<{ token: string }>('/truck-loads/application-link'),
  rotate:   () => d<{ token: string }>('/truck-loads/application-link/rotate', { method: 'POST' }),
  list:     (status?: ApplicationStatus) => d<TruckApplication[]>(`/truck-loads/applications${status ? `?status=${status}` : ''}`),
  get:      (id: string) => d<TruckApplication>(`/truck-loads/applications/${id}`),
  approve:  (id: string) =>
    d<{ application: TruckApplication; truck: Truck; driverAccount: 'created' | 'existing' }>(
      `/truck-loads/applications/${id}/approve`, { method: 'POST' }),
  reject:   (id: string, note?: string) =>
    d<TruckApplication>(`/truck-loads/applications/${id}/reject`, { method: 'POST', body: JSON.stringify({ note }) }),
  /** Documents need the dispatcher's token, so fetch them as a blob. */
  async document(id: string, docId: string): Promise<Blob> {
    const token = getToken('dispatch')
    const res = await fetch(`${BASE}/truck-loads/applications/${id}/documents/${docId}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    if (!res.ok) throw new ApiError(res.status, `Could not open document (${res.status})`)
    return res.blob()
  },
}

/** Public application form — no login. */
export const applyForm = {
  info: (token: string) => fetch(`${BASE}/truck-loads/apply/${token}`).then(async res => {
    const body = await res.json().catch(() => null)
    if (!res.ok) throw new ApiError(res.status, body?.message ?? 'This application link is not valid')
    return body as ApplicationFormInfo
  }),
  /** multipart upload with progress (XHR, since fetch can't report upload progress). */
  submit(token: string, form: FormData, onProgress: (fraction: number) => void) {
    return new Promise<{ reference: string }>((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      xhr.open('POST', `${BASE}/truck-loads/apply/${token}`)
      xhr.upload.onprogress = e => { if (e.lengthComputable) onProgress(e.loaded / e.total) }
      xhr.onerror = () => reject(new ApiError(0, 'Upload failed — check your connection and try again'))
      xhr.onload = () => {
        let body: any = null
        try { body = JSON.parse(xhr.responseText) } catch {}
        if (xhr.status >= 200 && xhr.status < 300) return resolve(body)
        const msg = Array.isArray(body?.message) ? body.message.join('; ') : body?.message ?? `Upload failed (${xhr.status})`
        reject(new ApiError(xhr.status, msg))
      }
      xhr.send(form)
    })
  },
}

export const truckTypeLabel = (t: string) => t.charAt(0).toUpperCase() + t.slice(1)
export const fmtFileSize = (b: number) => (b >= 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} MB` : `${Math.ceil(b / 1024)} KB`)
export const fmtDay = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'

// ── Units (metric, South Africa) ─────────────────────────────────────────────

export const mToMm = (m: number) => Math.round(m * 1000)

/** 4115 → "4.12 m" */
export const fmtLength = (mm: number) => `${(mm / 1000).toFixed(2)} m`
/** 13600 → "13 600 kg" */
export const fmtWeight = (kg: number) => `${Math.round(kg).toLocaleString('en-ZA')} kg`
/** 727000 → "727 km" */
export function fmtDistance(m: number) {
  const km = m / 1000
  return km < 10 ? `${km.toFixed(1)} km` : `${Math.round(km).toLocaleString('en-ZA')} km`
}
export function fmtDuration(s: number) {
  const h = Math.floor(s / 3600)
  const m = Math.round((s % 3600) / 60)
  return h ? `${h} h ${m} min` : `${m} min`
}
export const fmtMoney = (n: number) => n.toLocaleString('en-ZA', { style: 'currency', currency: 'ZAR', maximumFractionDigits: 0 })
export function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-ZA', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}
export const hazmatLabel = (h: string) => h.toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())

/** Mirrors the API's dispatch rules so the UI can show fit before assigning. */
export function truckFitProblems(truck: Truck, load: Pick<Load, 'weightKg' | 'hazmatTypes' | 'truckId'>) {
  const problems: string[] = []
  if (truck.status === 'out_of_service') problems.push('out of service')
  if (truck.status === 'on_load' && truck.id !== load.truckId) problems.push('on another load')
  const payload = truck.grossWeightKg - truck.tareWeightKg
  if (load.weightKg > payload) problems.push(`payload ${fmtWeight(payload)}`)
  const missing = load.hazmatTypes.filter(h => !truck.hazmatTypes.includes(h))
  if (missing.length) problems.push(`no ${missing.map(hazmatLabel).join(', ')} cert`)
  return problems
}
