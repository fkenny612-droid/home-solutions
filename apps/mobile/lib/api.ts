/**
 * Home Solutions — React Native API client
 * Set API_BASE to your deployed API URL (Railway) once live.
 * In Expo Go on a physical device, use your machine's LAN IP.
 */
const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1'

let _token: string | null = null

async function req<T>(path: string, options?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(_token ? { Authorization: `Bearer ${_token}` } : {}),
    ...(options?.headers as Record<string, string> ?? {}),
  }
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers })
  if (!res.ok) throw new Error(`API ${res.status}`)
  return res.json()
}

export type ServiceType =
  // Original
  | 'plumbing' | 'electrical' | 'cleaning' | 'hvac' | 'gas' | 'handyman'
  // Home trades
  | 'tiling' | 'painting' | 'landscaping' | 'pool' | 'pest_control' | 'locksmith'
  | 'carpentry' | 'solar' | 'security' | 'paving' | 'waterproofing' | 'roofing'
  | 'gate_motor' | 'moving' | 'bricklaying' | 'borehole' | 'septic_tank' | 'dstv'
  // Event hire
  | 'tent_hire' | 'chair_table_hire' | 'decor_hire' | 'sound_pa_hire'
  | 'jumping_castle_hire' | 'catering_equipment_hire' | 'cold_room_hire' | 'mobile_toilet_hire'
  // Plant & equipment
  | 'generator_hire' | 'water_bowser_hire'
  // Transport & logistics
  | 'van_hire' | 'bakkie_hire' | 'furniture_removal' | 'last_mile_delivery' | 'livestock_transport'
  // Security
  | 'security_guard_hire'
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
  transactionId: string | null
  warrantyExpiresAt: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
}

export const api = {
  setToken: (t: string | null) => { _token = t },

  auth: {
    login:         (phone: string, password: string) =>
      req<{ accessToken: string; user: { id: string; phone: string; role: string } }>('/auth/login', { method: 'POST', body: JSON.stringify({ phone, password }) }),
    register: (data: {
      phone: string; email: string; password: string
      firstName: string; lastName: string; role: 'client' | 'provider'
      companyName?: string; companyRegistration?: string
      vatNumber?: string; serviceArea?: string
    }) => req<{ accessToken: string; user: { id: string; phone: string; role: string; firstName: string; lastName: string } }>('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
    savePushToken: (pushToken: string) =>
      req<void>('/auth/push-token', { method: 'PATCH', body: JSON.stringify({ pushToken }) }),
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
    getDocuments: (id: string) =>
      req<{ id: string; type: string; fileName: string; fileUrl: string; status: string }[]>(`/providers/${id}/documents`),
    saveDocument: (id: string, type: string, fileName: string, fileUrl: string) =>
      req<void>(`/providers/${id}/documents`, { method: 'POST', body: JSON.stringify({ type, fileName, fileUrl }) }),
  },

  hardware: {
    stores:       (area?: string) =>
      req<any[]>(`/hardware/stores${area ? `?area=${area}` : ''}`),
    products:     (storeId: string, category?: string) =>
      req<any[]>(`/hardware/stores/${storeId}/products${category ? `?category=${category}` : ''}`),
    search:       (q: string, category?: string) =>
      req<any[]>(`/hardware/products/search?q=${encodeURIComponent(q)}${category ? `&category=${category}` : ''}`),
    createOrder:  (dto: { bookingId: string; providerId: string; storeId: string; notes?: string; items: { productId: string; quantity: number }[] }) =>
      req<any>('/hardware/orders', { method: 'POST', body: JSON.stringify(dto) }),
    ordersByBooking: (bookingId: string) =>
      req<any[]>(`/hardware/orders/booking/${bookingId}`),
    updateOrderStatus: (id: string, status: string) =>
      req<any>(`/hardware/orders/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
    storeOrders:  (storeId: string) =>
      req<any[]>(`/hardware/stores/${storeId}/orders`),
    storeStats:   (storeId: string) =>
      req<any>(`/hardware/stores/${storeId}/stats`),
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

  chat: {
    list: (bookingId: string) =>
      req<Message[]>(`/bookings/${bookingId}/messages`),
    send: (bookingId: string, msg: { senderId: string; senderRole: string; senderName: string; text: string }) =>
      req<Message>(`/bookings/${bookingId}/messages`, { method: 'POST', body: JSON.stringify(msg) }),
  },
}

export interface Message {
  id:         string
  bookingId:  string
  senderId:   string
  senderRole: string
  senderName: string
  text:       string
  createdAt:  string
}
