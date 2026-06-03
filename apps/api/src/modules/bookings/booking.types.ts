export type BookingStatus = 'pending' | 'accepted' | 'en_route' | 'in_progress' | 'completed' | 'cancelled' | 'emergency'
export type ServiceType = 'plumbing' | 'electrical' | 'cleaning' | 'hvac' | 'gas' | 'handyman'
export type PaymentMethod = 'card' | 'eft' | 'payfast'

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
  paymentMethod: PaymentMethod
  paymentHeld: boolean
  paymentReleased: boolean
  warrantyExpiresAt: Date | null
  notes: string | null
  createdAt: Date
  updatedAt: Date
}
