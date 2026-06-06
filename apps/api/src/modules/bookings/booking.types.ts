export type BookingStatus   = 'pending' | 'accepted' | 'en_route' | 'in_progress' | 'completed' | 'cancelled' | 'emergency'
export type PaymentMethod   = 'card' | 'eft' | 'payfast'
export type ServiceType =
  | 'plumbing' | 'electrical' | 'cleaning' | 'hvac' | 'gas' | 'handyman'
  | 'tiling' | 'painting' | 'landscaping' | 'pool' | 'pest_control'
  | 'locksmith' | 'carpentry' | 'solar' | 'security' | 'paving'
  | 'waterproofing' | 'roofing' | 'gate_motor' | 'moving'

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
