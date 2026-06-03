/**
 * Home Solutions — React Native API client
 * Set API_BASE to your deployed API URL (Railway) once live.
 * In Expo Go on a physical device, use your machine's LAN IP.
 */
const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1'

async function req<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  })
  if (!res.ok) throw new Error(`API ${res.status}`)
  return res.json()
}

export type ServiceType = 'plumbing' | 'electrical' | 'cleaning' | 'hvac' | 'gas' | 'handyman'
export type BookingStatus = 'pending' | 'accepted' | 'en_route' | 'in_progress' | 'completed' | 'cancelled' | 'emergency'

export interface Provider {
  id: string
  name: string
  skills: string[]
  rating: number
  reviewCount: number
  jobCount: number
  earningsBalance: number
  kycStatus: string
  status: string
  location: { lat: number; lng: number } | null
  availability: { monFri: boolean; saturday: boolean; sunday: boolean; emergency: boolean }
}

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
  paymentHeld: boolean
  paymentReleased: boolean
  warrantyExpiresAt: string | null
  notes: string | null
  createdAt: string
}

export const api = {
  auth: {
    login:    (phone: string, password: string) =>
      req<{ accessToken: string; user: { id: string; phone: string; role: string } }>('/auth/login', { method: 'POST', body: JSON.stringify({ phone, password }) }),
    register: (phone: string, password: string, role: 'client' | 'provider') =>
      req<{ accessToken: string; user: { id: string; phone: string; role: string } }>('/auth/register', { method: 'POST', body: JSON.stringify({ phone, password, role }) }),
  },

  bookings: {
    list:           (status?: BookingStatus) => req<Booking[]>(`/bookings${status ? `?status=${status}` : ''}`),
    get:            (id: string)             => req<Booking>(`/bookings/${id}`),
    create:         (dto: { clientId: string; serviceType: ServiceType; location: string; address: string; quotedAmount: number; paymentMethod: string; notes?: string }) =>
      req<Booking>('/bookings', { method: 'POST', body: JSON.stringify(dto) }),
    updateStatus:   (id: string, status: BookingStatus) =>
      req<Booking>(`/bookings/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
    assignProvider: (id: string, providerId: string) =>
      req<Booking>(`/bookings/${id}/assign`, { method: 'PATCH', body: JSON.stringify({ providerId }) }),
  },

  providers: {
    list:           (skill?: string)         => req<Provider[]>(`/providers${skill ? `?skill=${skill}&status=active` : '?status=active'}`),
    get:            (id: string)             => req<Provider>(`/providers/${id}`),
    earnings:       (id: string)             => req<{ available: number; thisMonth: number; total: number }>(`/providers/${id}/earnings`),
    updateLocation: (id: string, lat: number, lng: number) =>
      req<Provider>(`/providers/${id}/location`, { method: 'PATCH', body: JSON.stringify({ lat, lng }) }),
  },

  payments: {
    hold: (bookingId: string, amount: number) =>
      req<{ success: boolean; transactionId: string }>('/payments/hold', {
        method: 'POST',
        body: JSON.stringify({ bookingId, amount, paymentBrand: 'VISA', descriptor: `HomeSolutions-${bookingId}` }),
      }),
    release: (transactionId: string, amount: number) =>
      req<{ success: boolean }>(`/payments/release/${transactionId}`, { method: 'POST', body: JSON.stringify({ amount }) }),
  },
}
