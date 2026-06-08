export type BookingStatus   = 'pending' | 'accepted' | 'en_route' | 'in_progress' | 'completed' | 'cancelled' | 'emergency'
export type PaymentMethod   = 'card' | 'eft' | 'payfast'
export type ServiceType =
  // ── Home trades ────────────────────────────────────────────────────────────
  | 'plumbing' | 'electrical' | 'cleaning' | 'hvac' | 'gas' | 'handyman'
  | 'tiling' | 'painting' | 'landscaping' | 'pool' | 'pest_control'
  | 'locksmith' | 'carpentry' | 'solar' | 'security' | 'paving'
  | 'waterproofing' | 'roofing' | 'gate_motor' | 'moving'
  | 'bricklaying' | 'septic_tank' | 'dstv' | 'borehole'
  // ── Event hire ─────────────────────────────────────────────────────────────
  | 'tent_hire' | 'chair_table_hire' | 'decor_hire' | 'jumping_castle_hire'
  | 'sound_pa_hire' | 'catering_equipment_hire' | 'cold_room_hire'
  | 'mobile_toilet_hire'
  // ── Plant & equipment hire ──────────────────────────────────────────────────
  | 'generator_hire' | 'water_bowser_hire'
  // ── Transport & logistics ───────────────────────────────────────────────────
  | 'van_hire' | 'bakkie_hire' | 'furniture_removal'
  | 'last_mile_delivery' | 'livestock_transport'
  // ── Security ───────────────────────────────────────────────────────────────
  | 'security_guard_hire'

export interface Booking {
  id:               string
  clientId:         string
  providerId:       string | null
  serviceType:      ServiceType
  status:           BookingStatus
  location:         string
  address:          string
  quotedAmount:     number
  finalAmount:      number | null
  paymentMethod:    PaymentMethod
  paymentHeld:      boolean
  paymentReleased:  boolean
  serviceDetails:   Record<string, any> | null  // service-specific form answers
  images:           string[]                     // Cloudinary URLs
  warrantyExpiresAt: Date | null
  notes:            string | null
  createdAt:        Date
  updatedAt:        Date
}
