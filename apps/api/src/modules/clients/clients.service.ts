import { Injectable, NotFoundException } from '@nestjs/common'

export type SubscriptionPlan = 'basic_home' | 'premium_home' | 'estate_biz' | 'none'

export interface Client {
  id: string
  name: string
  phone: string
  email: string
  plan: SubscriptionPlan
  loyaltyPoints: number
  addresses: { label: string; address: string; lat: number; lng: number }[]
  createdAt: Date
}

const store: Client[] = [
  { id: 'client-1', name: 'Thabo Nkosi', phone: '+27821234567', email: 'thabo@example.com', plan: 'premium_home', loyaltyPoints: 340, addresses: [{ label: 'Home', address: '14 Marine Drive, Umhlanga', lat: -29.7289, lng: 31.0789 }], createdAt: new Date() },
  { id: 'client-2', name: 'Sarah van der Merwe', phone: '+27821234568', email: 'sarah@example.com', plan: 'basic_home', loyaltyPoints: 120, addresses: [{ label: 'Home', address: '4 Dunkirk Estate, Ballito', lat: -29.5438, lng: 31.2134 }], createdAt: new Date() },
  { id: 'client-3', name: 'Priya Govender', phone: '+27821234569', email: 'priya@example.com', plan: 'premium_home', loyaltyPoints: 340, addresses: [{ label: 'Home', address: '22 Glenwood Road, Durban', lat: -29.8587, lng: 31.0218 }], createdAt: new Date() },
]

@Injectable()
export class ClientsService {
  findAll() {
    return store
  }

  findOne(id: string) {
    const c = store.find(c => c.id === id)
    if (!c) throw new NotFoundException(`Client ${id} not found`)
    return c
  }

  addPoints(id: string, points: number) {
    const c = this.findOne(id)
    c.loyaltyPoints += points
    return c
  }

  upgradeSubscription(id: string, plan: SubscriptionPlan) {
    const c = this.findOne(id)
    c.plan = plan
    return c
  }
}
