/**
 * Truck Loads API client + unit helpers.
 * The API stores mm / kg (what Google's truck routing expects); the UI shows
 * metres, kg and km.
 */

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'https://railway-up-deploy-production.up.railway.app/api/v1'

/** Dispatcher and driver sign in separately, so one device can run both. */
export type Side = 'dispatch' | 'driver'
const TOKEN_KEYS: Record<Side, string> = { dispatch: 'tl_dispatch_token', driver: 'tl_driver_token' }

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
  const res = await fetch(`${BASE}${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...opts.headers,
    },
  })
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
  events?: LoadEvent[]
  preview?: boolean
  previewTruck?: Truck
}

export interface Summary {
  loads: Partial<Record<LoadStatus, { count: number; revenue: number }>>
  trucks: Partial<Record<TruckStatus, number>>
  routingEnabled: boolean
}

export type TruckInput = Omit<Truck, 'id' | 'status'>
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
