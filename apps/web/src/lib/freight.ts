/**
 * Freight (truck load management) API client + unit helpers.
 * The API stores mm / kg (what Google's truck routing expects); the UI works
 * in feet / lbs / miles because truck routing coverage is the US.
 */

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'https://railway-up-deploy-production.up.railway.app/api/v1'
const TOKEN_KEY = 'hs_freight_token'

export function getToken() {
  try { return localStorage.getItem(TOKEN_KEY) } catch { return null }
}
export function setToken(t: string | null) {
  try {
    if (t) localStorage.setItem(TOKEN_KEY, t)
    else localStorage.removeItem(TOKEN_KEY)
  } catch {}
}

export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message) }
}

async function req<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const token = getToken()
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

export const freight = {
  login: (phone: string, password: string) =>
    req<{ accessToken: string }>('/auth/login', { method: 'POST', body: JSON.stringify({ phone, password }) }),

  summary:     () => req<Summary>('/freight/summary'),
  hazmatTypes: () => req<string[]>('/freight/hazmat-types'),

  trucks:      () => req<Truck[]>('/freight/trucks'),
  createTruck: (t: TruckInput) => req<Truck>('/freight/trucks', { method: 'POST', body: JSON.stringify(t) }),
  updateTruck: (id: string, t: Partial<TruckInput> & { status?: TruckStatus }) =>
    req<Truck>(`/freight/trucks/${id}`, { method: 'PATCH', body: JSON.stringify(t) }),
  deleteTruck: (id: string) => req<{ ok: true }>(`/freight/trucks/${id}`, { method: 'DELETE' }),

  loads:      (status?: LoadStatus) => req<Load[]>(`/freight/loads${status ? `?status=${status}` : ''}`),
  load:       (id: string) => req<Load>(`/freight/loads/${id}`),
  createLoad: (l: LoadInput) => req<Load>('/freight/loads', { method: 'POST', body: JSON.stringify(l) }),
  assign:     (id: string, truckId: string) =>
    req<Load>(`/freight/loads/${id}/assign`, { method: 'POST', body: JSON.stringify({ truckId }) }),
  unassign:   (id: string) => req<Load>(`/freight/loads/${id}/unassign`, { method: 'POST' }),
  setStatus:  (id: string, status: LoadStatus) =>
    req<Load>(`/freight/loads/${id}/status`, { method: 'POST', body: JSON.stringify({ status }) }),
  route:      (id: string, previewTruckId?: string) =>
    req<Load>(`/freight/loads/${id}/route${previewTruckId ? `?truckId=${previewTruckId}` : ''}`, { method: 'POST' }),
}

// ── Units ─────────────────────────────────────────────────────────────────────

const MM_PER_FT = 304.8
const LB_PER_KG = 2.20462

export const ftToMm  = (ft: number) => Math.round(ft * MM_PER_FT)
export const mmToFt  = (mm: number) => mm / MM_PER_FT
export const lbToKg  = (lb: number) => Math.round(lb / LB_PER_KG)
export const kgToLb  = (kg: number) => Math.round(kg * LB_PER_KG)

export function fmtFeet(mm: number) {
  const totalIn = Math.round(mm / 25.4)
  return `${Math.floor(totalIn / 12)}′${totalIn % 12}″`
}
// Weights are stored as whole kg, so round to 10 lb to hide the lb→kg→lb drift
export const fmtLb    = (kg: number) => `${(Math.round(kg * LB_PER_KG / 10) * 10).toLocaleString()} lb`
export const fmtMiles = (m: number) => `${Math.round(m / 1609.344).toLocaleString()} mi`
export function fmtDuration(s: number) {
  const h = Math.floor(s / 3600)
  const m = Math.round((s % 3600) / 60)
  return h ? `${h} h ${m} min` : `${m} min`
}
export const fmtMoney = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
export function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}
export const hazmatLabel = (h: string) => h.toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())

/** Mirrors the API's dispatch rules so the UI can show fit before assigning. */
export function truckFitProblems(truck: Truck, load: Pick<Load, 'weightKg' | 'hazmatTypes' | 'truckId'>) {
  const problems: string[] = []
  if (truck.status === 'out_of_service') problems.push('out of service')
  if (truck.status === 'on_load' && truck.id !== load.truckId) problems.push('on another load')
  const payload = truck.grossWeightKg - truck.tareWeightKg
  if (load.weightKg > payload) problems.push(`payload ${fmtLb(payload)}`)
  const missing = load.hazmatTypes.filter(h => !truck.hazmatTypes.includes(h))
  if (missing.length) problems.push(`no ${missing.map(hazmatLabel).join(', ')} cert`)
  return problems
}
