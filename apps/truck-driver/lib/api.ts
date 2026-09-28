/**
 * Truck Loads driver API client (same endpoints as the web driver app).
 */
const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'https://railway-up-deploy-production.up.railway.app/api/v1'

let token: string | null = null
let onUnauthorized: (() => void) | null = null

export function setAuthToken(t: string | null) { token = t }
export function setOnUnauthorized(fn: (() => void) | null) { onUnauthorized = fn }

export class ApiError extends Error {
  constructor(message: string, public status: number) { super(message) }
}

async function req<T>(path: string, opts: RequestInit = {}): Promise<T> {
  let res: Response
  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...opts,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(opts.headers as Record<string, string> | undefined),
      },
    })
  } catch {
    throw new ApiError('No connection — check your signal and try again', 0)
  }
  const body = await res.json().catch(() => null)
  if (!res.ok) {
    if (res.status === 401 && token) onUnauthorized?.()
    const msg = Array.isArray(body?.message) ? body.message.join('; ') : body?.message ?? `Request failed (${res.status})`
    throw new ApiError(msg, res.status)
  }
  return body as T
}

export interface DriverTruck {
  id: string
  name: string
  plate: string
  heightMm: number
  widthMm: number
  lengthMm: number
  tareWeightKg: number
  axleCount: number
  hazmatTypes: string[]
}

export interface DriverLoad {
  id: string
  reference: string
  shipperName: string
  commodity: string
  weightKg: number
  hazmatTypes: string[]
  notes: string | null
  status: 'assigned' | 'in_transit' | 'delivered' | 'cancelled' | 'booked'
  originAddress: string
  originLat: number | null
  originLng: number | null
  destAddress: string
  destLat: number | null
  destLng: number | null
  pickupAt: string | null
  deliverBy: string | null
  routeDistanceM: number | null
  routeDurationS: number | null
  routeWarnings: string[]
  truck: DriverTruck | null
  events?: { id: string; message: string; createdAt: string }[]
}

export interface NavigationPlan {
  leg: 'pickup' | 'delivery'
  destination: { lat: number; lng: number; title: string }
  /** Routes API token for this rig; the Navigation SDK follows it. */
  routeToken: string
  distanceMeters: number
  durationSeconds: number
  warnings: string[]
}

export interface PodInput { receiverName: string; note?: string; lat?: number; lng?: number; accuracyM?: number }
export interface LocationReport { lat: number; lng: number; speedKmh?: number; heading?: number; accuracyM?: number }

export const api = {
  login: (phone: string, password: string) =>
    req<{ accessToken: string }>('/auth/login', { method: 'POST', body: JSON.stringify({ phone, password }) }),

  loads: () => req<{ trucks: DriverTruck[]; loads: DriverLoad[] }>('/truck-loads/driver/loads'),
  load:  (id: string) => req<DriverLoad>(`/truck-loads/driver/loads/${id}`),
  setStatus: (id: string, status: 'in_transit' | 'delivered', note?: string) =>
    req<DriverLoad>(`/truck-loads/driver/loads/${id}/status`, { method: 'POST', body: JSON.stringify({ status, note }) }),
  /** Deliver with proof: who signed, a note and where. Marketplace loads require this. */
  deliver: (id: string, pod: PodInput) =>
    req<DriverLoad>(`/truck-loads/driver/loads/${id}/deliver`, { method: 'POST', body: JSON.stringify({ data: pod }) }),
  location: (id: string, p: LocationReport) =>
    req<{ ok: boolean }>(`/truck-loads/driver/loads/${id}/location`, { method: 'POST', body: JSON.stringify(p) }),
  navigation: (id: string, here: { lat: number; lng: number }) =>
    req<NavigationPlan>(`/truck-loads/driver/loads/${id}/navigation`, { method: 'POST', body: JSON.stringify(here) }),
}
