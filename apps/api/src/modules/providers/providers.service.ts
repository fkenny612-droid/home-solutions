import { Injectable, NotFoundException } from '@nestjs/common'

export type ProviderStatus = 'pending_kyc' | 'active' | 'suspended'
export type KycStatus = 'pending' | 'in_review' | 'approved' | 'rejected'

export interface Provider {
  id: string
  name: string
  phone: string
  email: string
  skills: string[]
  kycStatus: KycStatus
  status: ProviderStatus
  rating: number
  reviewCount: number
  jobCount: number
  earningsBalance: number
  availability: { monFri: boolean; saturday: boolean; sunday: boolean; emergency: boolean }
  location: { lat: number; lng: number } | null
  createdAt: Date
}

const store: Provider[] = [
  { id: 'prov-raj', name: 'Raj Pillay', phone: '+27831234567', email: 'raj@example.com', skills: ['plumbing'], kycStatus: 'approved', status: 'active', rating: 4.9, reviewCount: 214, jobCount: 892, earningsBalance: 4840, availability: { monFri: true, saturday: true, sunday: false, emergency: true }, location: { lat: -29.8587, lng: 31.0218 }, createdAt: new Date() },
  { id: 'prov-kevin', name: 'Kevin Mhlongo', phone: '+27831234568', email: 'kevin@example.com', skills: ['electrical'], kycStatus: 'approved', status: 'active', rating: 5.0, reviewCount: 188, jobCount: 651, earningsBalance: 7200, availability: { monFri: true, saturday: true, sunday: true, emergency: true }, location: { lat: -29.7289, lng: 31.0789 }, createdAt: new Date() },
  { id: 'prov-zanele', name: 'Zanele Dlamini', phone: '+27831234569', email: 'zanele@example.com', skills: ['cleaning'], kycStatus: 'approved', status: 'active', rating: 5.0, reviewCount: 143, jobCount: 412, earningsBalance: 3100, availability: { monFri: true, saturday: true, sunday: false, emergency: false }, location: null, createdAt: new Date() },
  { id: 'prov-sipho', name: 'Sipho Ndlovu', phone: '+27831234570', email: 'sipho@example.com', skills: ['plumbing', 'handyman'], kycStatus: 'in_review', status: 'pending_kyc', rating: 0, reviewCount: 0, jobCount: 0, earningsBalance: 0, availability: { monFri: true, saturday: false, sunday: false, emergency: false }, location: null, createdAt: new Date() },
]

@Injectable()
export class ProvidersService {
  findAll(status?: ProviderStatus, skill?: string) {
    let result = [...store]
    if (status) result = result.filter(p => p.status === status)
    if (skill) result = result.filter(p => p.skills.includes(skill))
    return result
  }

  findOne(id: string) {
    const p = store.find(p => p.id === id)
    if (!p) throw new NotFoundException(`Provider ${id} not found`)
    return p
  }

  findNearby(serviceType: string, lat: number, lng: number) {
    return store.filter(p => p.status === 'active' && p.skills.includes(serviceType))
  }

  updateKyc(id: string, kycStatus: KycStatus) {
    const p = this.findOne(id)
    p.kycStatus = kycStatus
    if (kycStatus === 'approved') p.status = 'active'
    return p
  }

  updateLocation(id: string, lat: number, lng: number) {
    const p = this.findOne(id)
    p.location = { lat, lng }
    return p
  }

  earnings(id: string) {
    const p = this.findOne(id)
    return { available: p.earningsBalance, thisMonth: p.earningsBalance * 5.87, total: p.jobCount * 1200 }
  }
}
