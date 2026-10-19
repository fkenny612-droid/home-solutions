/**
 * Easyfix — React Native API client
 * Set API_BASE to your deployed API URL (Render) once live.
 * In Expo Go on a physical device, use your machine's LAN IP.
 */
const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'https://home-solutions-ds5b.onrender.com/api/v1'

let _token: string | null = null

// Thrown by req() on any failure. `status` is 0 for a network-level failure
// (couldn't reach the server at all) and the HTTP status code otherwise, so
// callers can tell "server said no" apart from "couldn't reach the server."
export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

async function req<T>(path: string, options?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(_token ? { Authorization: `Bearer ${_token}` } : {}),
    ...(options?.headers as Record<string, string> ?? {}),
  }
  let res: Response
  try {
    res = await fetch(`${API_BASE}${path}`, { ...options, headers })
  } catch {
    throw new ApiError('Network request failed', 0)
  }
  if (!res.ok) {
    let message = `API ${res.status}`
    try {
      const body = await res.json()
      if (body?.message) message = Array.isArray(body.message) ? body.message[0] : body.message
    } catch {}
    throw new ApiError(message, res.status)
  }
  const text = await res.text()
  if (!text) return undefined as T
  return JSON.parse(text)
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
  lat: number | null
  lng: number | null
  distanceKm: number | null
  etaMinutes: number | null
  serviceAreas: string[]
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
  images: string[] | null
  providerName: string | null
  discountCode?: string | null
  discountAmount?: number
  isEmergency?: boolean
  /** Only present for the provider who has accepted the job — so they can reach the customer. */
  clientName?: string | null
  clientPhone?: string | null
  /** Statuses the signed-in user may move this booking to right now — decided by the server. */
  allowedNext?: BookingStatus[]
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
      vatNumber?: string; serviceArea?: string; referralCode?: string
    }) => req<{ accessToken: string; user: { id: string; phone: string; role: string; firstName: string; lastName: string } }>('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
    getReferral:     () => req<{ code: string | null; referredCount: number; rewardedCount: number }>('/auth/referral'),
    savePushToken:   (pushToken: string) =>
      req<void>('/auth/push-token', { method: 'PATCH', body: JSON.stringify({ pushToken }) }),
    updateProfile:   (data: { firstName?: string; lastName?: string; email?: string }) =>
      req<{ id: string; phone: string; role: string; firstName: string | null; lastName: string | null; email: string | null }>('/auth/profile', { method: 'PATCH', body: JSON.stringify(data) }),
    me:              () =>
      req<{ id: string; phone: string; role: string; firstName: string | null; lastName: string | null; email: string | null; idVerified: boolean }>('/auth/me'),
    deleteAccount:   () => req<{ ok: boolean }>('/auth/account', { method: 'DELETE' }),
    verifyId:        (idNumber: string) =>
      req<{ idVerified: boolean; age: number }>('/auth/verify-id', { method: 'POST', body: JSON.stringify({ idNumber }) }),
    getBankAccount:  () => req<BankAccount | null>('/auth/bank-account'),
    saveBankAccount: (data: Omit<BankAccount, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) =>
      req<BankAccount>('/auth/bank-account', { method: 'POST', body: JSON.stringify(data) }),
    getAddresses:    () => req<SavedAddress[]>('/auth/addresses'),
    saveAddress:     (data: { label: string; address: string }) =>
      req<SavedAddress>('/auth/addresses', { method: 'POST', body: JSON.stringify(data) }),
    setDefaultAddress: (id: string) =>
      req<SavedAddress>(`/auth/addresses/${id}/default`, { method: 'PATCH' }),
    deleteAddress:   (id: string) =>
      req<{ ok: boolean }>(`/auth/addresses/${id}`, { method: 'DELETE' }),
  },

  bookings: {
    list:           (status?: BookingStatus) => req<Booking[]>(`/bookings${status ? `?status=${status}` : ''}`),
    get:            (id: string)             => req<Booking>(`/bookings/${id}`),
    // The server prices the job itself. `expectedAmount` is the total shown to the customer — the server
    // rejects the booking if its own price differs, so nobody is charged more than they were shown.
    create:         (dto: { serviceType: ServiceType; location: string; address: string; paymentMethod: string; notes?: string; serviceDetails?: Record<string, any>; images?: string[]; discountCode?: string; emergency?: boolean; expectedAmount?: number }) =>
      req<Booking>('/bookings', { method: 'POST', body: JSON.stringify(dto) }),
    updateStatus:   (id: string, status: BookingStatus) =>
      req<Booking>(`/bookings/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
    // A provider turns down a job requested from them — cancels it and returns the customer's payment.
    decline:        (id: string) => req<Booking>(`/bookings/${id}/decline`, { method: 'POST' }),
    // Customers REQUEST a provider (stays pending); a provider calling this for themselves ACCEPTS.
    assignProvider: (id: string, providerId: string) =>
      req<Booking>(`/bookings/${id}/assign`, { method: 'PATCH', body: JSON.stringify({ providerId }) }),
  },

  providers: {
    list:           (skill?: string, lat?: number, lng?: number) => {
      const params = new URLSearchParams({ status: 'active' })
      if (skill) params.set('skill', skill)
      if (lat != null) params.set('lat', String(lat))
      if (lng != null) params.set('lng', String(lng))
      return req<Provider[]>(`/providers?${params}`)
    },
    get:            (id: string)             => req<Provider>(`/providers/${id}`),
    earnings:       (id: string)             => req<{ available: number; thisMonth: number; total: number; pendingPayout: { id: string; amount: number; requestedAt: string } | null }>(`/providers/${id}/earnings`),
    updateLocation: (id: string, lat: number, lng: number) =>
      req<Provider>(`/providers/${id}/location`, { method: 'PATCH', body: JSON.stringify({ lat, lng }) }),
    getDocuments: (id: string) =>
      req<{ id: string; type: string; fileName: string; fileUrl: string; status: string }[]>(`/providers/${id}/documents`),
    saveDocument: (id: string, type: string, fileName: string, fileUrl: string) =>
      req<void>(`/providers/${id}/documents`, { method: 'POST', body: JSON.stringify({ type, fileName, fileUrl }) }),
    getHireInventory: (id: string) =>
      req<Record<string, Record<string, number>>>(`/providers/${id}/hire-inventory`),
    updateHireInventory: (id: string, inventory: Record<string, Record<string, number>>) =>
      req<void>(`/providers/${id}/hire-inventory`, { method: 'PATCH', body: JSON.stringify(inventory) }),
    reviews:    (id: string) => req<Review[]>(`/providers/${id}/reviews`),
    addReview:  (id: string, stars: number, tags: string[], comment?: string, clientId?: string, bookingId?: string) =>
      req<Provider>(`/providers/${id}/review`, { method: 'POST', body: JSON.stringify({ stars, tags, comment, clientId, bookingId }) }),
    updateKyc:  (id: string, status: 'pending' | 'in_review' | 'approved' | 'rejected') =>
      req<Provider>(`/providers/${id}/kyc`, { method: 'PATCH', body: JSON.stringify({ status }) }),
    // Asks for a payout. Your balance only goes down once our team has actually paid you.
    requestPayout: (id: string, amount: number) =>
      req<{ id: string; amount: number; status: string }>(`/providers/${id}/payout-request`, { method: 'POST', body: JSON.stringify({ amount }) }),
    updateAvailability: (id: string, dto: { monFri?: boolean; saturday?: boolean; sunday?: boolean; emergency?: boolean }) =>
      req<Provider>(`/providers/${id}/availability`, { method: 'PATCH', body: JSON.stringify(dto) }),
    updateServiceAreas: (id: string, areas: string[]) =>
      req<Provider>(`/providers/${id}/service-areas`, { method: 'PATCH', body: JSON.stringify({ areas }) }),
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
    // The amount held is the booking's price, decided by the server. Funds are captured/returned by the server
    // when the provider completes the job or the booking is cancelled — the app never releases money itself.
    hold: (bookingId: string, card: CardDetails) =>
      req<{ success: boolean; transactionId: string }>('/payments/hold', {
        method: 'POST',
        body: JSON.stringify({
          bookingId,
          paymentBrand: card.brand,
          card: { number: card.number.replace(/\s/g, ''), holder: card.holder, expiry: card.expiry, cvv: card.cvv },
        }),
      }),
  },

  chat: {
    list: (bookingId: string) =>
      req<Message[]>(`/bookings/${bookingId}/messages`),
    send: (bookingId: string, msg: { senderId: string; senderRole: string; senderName: string; text?: string; attachments?: ChatAttachment[] }) =>
      req<Message>(`/bookings/${bookingId}/messages`, { method: 'POST', body: JSON.stringify(msg) }),
  },

  notifications: {
    list:        () => req<AppNotification[]>('/notifications'),
    unreadCount: () => req<{ count: number }>('/notifications/unread-count'),
    markRead:    (ids?: string[]) => req<void>('/notifications/mark-read', { method: 'PATCH', body: JSON.stringify({ ids }) }),
  },

  subscriptions: {
    clientPlans:   ()                                         => req<SubscriptionPlan[]>('/subscriptions/client-plans'),
    providerPlans: ()                                         => req<SubscriptionPlan[]>('/subscriptions/provider-plans'),
    my:            ()                                         => req<ActiveSubscription | null>('/subscriptions/my'),
    subscribe:     (planId: string, peachTokenId?: string)   => req<ActiveSubscription>('/subscriptions/subscribe', { method: 'POST', body: JSON.stringify({ planId, peachTokenId }) }),
    cancel:        ()                                         => req<void>('/subscriptions/cancel', { method: 'DELETE' }),
  },

  loyalty: {
    rewards:     ()             => req<LoyaltyReward[]>('/loyalty/rewards'),
    balance:     ()             => req<{ points: number }>('/loyalty/balance'),
    redemptions: ()             => req<LoyaltyRedemption[]>('/loyalty/redemptions'),
    redeem:      (rewardId: string) => req<LoyaltyRedemption>('/loyalty/redeem', { method: 'POST', body: JSON.stringify({ rewardId }) }),
  },

  listings: {
    list:    (params?: { category?: ListingCategory; q?: string; city?: string }) => {
      const p = new URLSearchParams()
      if (params?.category) p.set('category', params.category)
      if (params?.q)        p.set('q', params.q)
      if (params?.city)     p.set('city', params.city)
      return req<Listing[]>(`/listings${p.toString() ? `?${p}` : ''}`)
    },
    get:     (id: string)          => req<Listing>(`/listings/${id}`),
    create:  (dto: Omit<Listing, 'id' | 'sellerId' | 'sellerName' | 'sellerPhone' | 'sellerAvatar' | 'createdAt' | 'views' | 'saved'>) =>
      req<Listing>('/listings', { method: 'POST', body: JSON.stringify(dto) }),
    update:  (id: string, dto: Partial<Listing>) =>
      req<Listing>(`/listings/${id}`, { method: 'PATCH', body: JSON.stringify(dto) }),
    delete:  (id: string)          => req<{ ok: boolean }>(`/listings/${id}`, { method: 'DELETE' }),
    mine:    ()                    => req<Listing[]>('/listings/mine'),
    save:    (id: string)          => req<{ saved: boolean }>(`/listings/${id}/save`, { method: 'POST' }),
  },

  reports: {
    create: (dto: { targetType: ReportTarget; targetId: string; reason: ReportReason; details?: string }) =>
      req<{ id: string; status: string }>('/reports', { method: 'POST', body: JSON.stringify(dto) }),
  },

  blocks: {
    list:    ()               => req<BlockedUser[]>('/blocks'),
    block:   (userId: string) => req<{ ok: boolean }>('/blocks', { method: 'POST', body: JSON.stringify({ userId }) }),
    unblock: (userId: string) => req<{ ok: boolean }>(`/blocks/${userId}`, { method: 'DELETE' }),
  },

  paymentMethods: {
    list:       ()                                                                       => req<SavedCard[]>('/payment-methods'),
    add:        (dto: { brand: string; last4: string; expiry: string; holderName: string }) => req<SavedCard>('/payment-methods', { method: 'POST', body: JSON.stringify(dto) }),
    setDefault: (id: string)                                                             => req<SavedCard>(`/payment-methods/${id}/default`, { method: 'PATCH' }),
    remove:     (id: string)                                                             => req<{ success: boolean }>(`/payment-methods/${id}`, { method: 'DELETE' }),
  },
}

export interface SubscriptionPlan {
  id:               string
  name:             string
  priceMonthly:     number
  features:         string[]
  discount?:        number
  warrantyDays?:    number
  emergencyCallouts?: number
  commissionPct?:   number
  featured?:        boolean
}

export interface ActiveSubscription {
  id:          string
  userId:      string
  userRole:    string
  planId:      string
  status:      string
  startsAt:    string
  expiresAt:   string | null
  plan:        SubscriptionPlan | null
}

export interface CardDetails {
  number: string
  holder: string
  expiry: string
  cvv:    string
  brand:  'VISA' | 'MASTER' | 'AMEX'
}

export interface AppNotification {
  id:        string
  userId:    string
  title:     string
  body:      string
  type:      string
  data:      Record<string, any> | null
  read:      boolean
  createdAt: string
}

export interface ChatAttachment {
  url:      string
  type:     'image' | 'file'
  fileName: string
}

export interface Review {
  id:         string
  providerId: string
  clientId:   string
  bookingId:  string | null
  stars:      number
  tags:       string[]
  comment:    string | null
  createdAt:  string
}

export interface BankAccount {
  id:            string
  userId:        string
  accountHolder: string
  bankName:      string
  accountNumber: string
  branchCode:    string
  accountType:   string
  createdAt:     string
  updatedAt:     string
}

export interface SavedAddress {
  id:        string
  userId:    string
  label:     string
  address:   string
  isDefault: boolean
  createdAt: string
}

export interface LoyaltyReward {
  id:             string
  label:          string
  description:    string
  pointsCost:     number
  discountAmount: number
}

export interface LoyaltyRedemption {
  id:             string
  userId:         string
  rewardId:       string
  pointsSpent:    number
  discountAmount: number
  code:           string
  used:           boolean
  createdAt:      string
}

export interface BlockedUser { userId: string; name: string; blockedAt: string }

export type ReportTarget = 'listing' | 'message'
export type ReportReason = 'spam_or_scam' | 'prohibited_item' | 'inappropriate' | 'harassment' | 'other'

export type ListingCategory = 'goods' | 'property' | 'jobs'

export type ListingSubcategory =
  // goods
  | 'furniture' | 'appliances' | 'electronics' | 'tools' | 'clothing' | 'vehicles' | 'garden' | 'other_goods'
  // property
  | 'room_to_rent' | 'house_to_rent' | 'flat_to_rent' | 'property_for_sale' | 'commercial'
  // jobs
  | 'full_time' | 'part_time' | 'contract' | 'freelance' | 'domestic'

export type ListingCondition = 'new' | 'like_new' | 'good' | 'fair' | 'for_parts'

export interface Listing {
  id:            string
  sellerId:      string
  sellerName:    string
  sellerPhone:   string
  sellerAvatar:  string | null
  category:      ListingCategory
  subcategory:   ListingSubcategory
  title:         string
  description:   string
  price:         number | null          // null = negotiable / free / contact
  priceLabel:    string                 // e.g. "R 1 500", "Negotiable", "Free"
  condition:     ListingCondition | null
  images:        string[]
  city:          string
  suburb:        string
  views:         number
  saved:         boolean
  urgent:        boolean
  createdAt:     string
}

export interface SavedCard {
  id:         string
  brand:      string
  last4:      string
  expiry:     string
  holderName: string
  isDefault:  boolean
  createdAt:  string
}

export interface Message {
  id:          string
  bookingId:   string
  senderId:    string
  senderRole:  string
  senderName:  string
  text:        string
  attachments: ChatAttachment[]
  createdAt:   string
}
