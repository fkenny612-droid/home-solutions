/**
 * Home Solutions — API client
 * Points to NEXT_PUBLIC_API_URL (set in .env.local) or localhost:4000 in dev
 */

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'https://home-solutions-ds5b.onrender.com/api/v1'

async function req<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  })
  if (!res.ok) {
    const error = await res.text()
    throw new Error(`API ${res.status}: ${error}`)
  }
  return res.json()
}

// ── Auth ────────────────────────────────────────────────────────────────────
export const auth = {
  login: (phone: string, password: string) =>
    req<{ accessToken: string; user: { id: string; phone: string; role: string } }>(
      '/auth/login', { method: 'POST', body: JSON.stringify({ phone, password }) }
    ),
  register: (phone: string, password: string, role: 'client' | 'provider') =>
    req<{ accessToken: string; user: { id: string; phone: string; role: string } }>(
      '/auth/register', { method: 'POST', body: JSON.stringify({ phone, password, role }) }
    ),
}

// ── Bookings ────────────────────────────────────────────────────────────────
export type BookingStatus = 'pending' | 'accepted' | 'en_route' | 'in_progress' | 'completed' | 'cancelled' | 'emergency'
export type ServiceType   =
  // Home trades
  | 'plumbing' | 'electrical' | 'cleaning' | 'hvac' | 'gas' | 'handyman'
  | 'tiling' | 'painting' | 'landscaping' | 'pool' | 'pest_control'
  | 'locksmith' | 'carpentry' | 'solar' | 'security' | 'paving'
  | 'waterproofing' | 'roofing' | 'gate_motor' | 'moving'
  | 'bricklaying' | 'septic_tank' | 'dstv' | 'borehole'
  // Event hire
  | 'tent_hire' | 'chair_table_hire' | 'decor_hire' | 'jumping_castle_hire'
  | 'sound_pa_hire' | 'catering_equipment_hire' | 'cold_room_hire'
  | 'mobile_toilet_hire'
  // Plant & equipment hire
  | 'generator_hire' | 'water_bowser_hire'
  // Transport & logistics
  | 'van_hire' | 'bakkie_hire' | 'furniture_removal'
  | 'last_mile_delivery' | 'livestock_transport'
  // Security
  | 'security_guard_hire'

export interface Booking {
  id: string
  clientId: string
  providerId: string | null
  serviceType: ServiceType
  status: BookingStatus
  location: string
  address: string
  quotedAmount: number
  finalAmount: number | null
  paymentMethod: string
  paymentHeld: boolean
  paymentReleased: boolean
  warrantyExpiresAt: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
}

export interface BookingStats {
  total: number
  active: number
  emergency: number
  pending: number
  revenueToday: number
}

export const bookings = {
  list: (status?: BookingStatus, serviceType?: ServiceType) => {
    const params = new URLSearchParams()
    if (status) params.set('status', status)
    if (serviceType) params.set('serviceType', serviceType)
    return req<Booking[]>(`/bookings?${params}`)
  },
  get: (id: string) => req<Booking>(`/bookings/${id}`),
  stats: () => req<BookingStats>('/bookings/stats'),
  create: (dto: { clientId: string; serviceType: ServiceType; location: string; address: string; quotedAmount: number; paymentMethod: string; notes?: string }) =>
    req<Booking>('/bookings', { method: 'POST', body: JSON.stringify(dto) }),
  updateStatus: (id: string, status: BookingStatus) =>
    req<Booking>(`/bookings/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  assignProvider: (id: string, providerId: string) =>
    req<Booking>(`/bookings/${id}/assign`, { method: 'PATCH', body: JSON.stringify({ providerId }) }),
}

// ── Providers ───────────────────────────────────────────────────────────────
export interface Provider {
  id: string
  name: string
  phone: string
  email: string
  skills: string[]
  kycStatus: 'pending' | 'in_review' | 'approved' | 'rejected'
  status: 'pending_kyc' | 'active' | 'suspended'
  rating: number
  reviewCount: number
  jobCount: number
  earningsBalance: number
  availability: { monFri: boolean; saturday: boolean; sunday: boolean; emergency: boolean }
  location: { lat: number; lng: number } | null
  createdAt: string
}

export const providers = {
  list: (status?: string, skill?: string) => {
    const params = new URLSearchParams()
    if (status) params.set('status', status)
    if (skill) params.set('skill', skill)
    return req<Provider[]>(`/providers?${params}`)
  },
  get: (id: string) => req<Provider>(`/providers/${id}`),
  nearby: (serviceType: string, lat: number, lng: number) =>
    req<Provider[]>(`/providers/nearby?serviceType=${serviceType}&lat=${lat}&lng=${lng}`),
  earnings: (id: string) =>
    req<{ available: number; thisMonth: number; total: number }>(`/providers/${id}/earnings`),
  updateKyc: (id: string, status: string) =>
    req<Provider>(`/providers/${id}/kyc`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  updateLocation: (id: string, lat: number, lng: number) =>
    req<Provider>(`/providers/${id}/location`, { method: 'PATCH', body: JSON.stringify({ lat, lng }) }),
}

// ── Subscriptions ────────────────────────────────────────────────────────────
export interface MrrData {
  basicHome:    { count: number; mrr: number }
  premiumHome:  { count: number; mrr: number }
  estateBiz:    { count: number; mrr: number }
  total:        number
}

export const subscriptions = {
  plans: () => req<Record<string, { name: string; priceMonthly: number; discount: number; warrantyDays: number; emergencyCallouts: number }>>('/subscriptions/plans'),
  mrr:   () => req<MrrData>('/subscriptions/mrr'),
}

// ── Payments ─────────────────────────────────────────────────────────────────
export const payments = {
  hold: (bookingId: string, amount: number, paymentBrand: string, descriptor: string) =>
    req<{ success: boolean; transactionId: string }>('/payments/hold', {
      method: 'POST',
      body: JSON.stringify({ bookingId, amount, paymentBrand, descriptor }),
    }),
  release: (transactionId: string, amount: number) =>
    req<{ success: boolean }>(`/payments/release/${transactionId}`, {
      method: 'POST',
      body: JSON.stringify({ amount }),
    }),
  batchPayout: (payouts: unknown[]) =>
    req<{ success: boolean; batchId: string }>('/payments/payout/batch', {
      method: 'POST',
      body: JSON.stringify({ payouts }),
    }),
}
