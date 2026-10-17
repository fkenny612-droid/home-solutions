import { test } from 'node:test'
import * as assert from 'node:assert/strict'
import { presentProvider } from '../src/modules/providers/provider-presenter'

const row = {
  id: 'prov-1', name: 'Pat Plumber', phone: '+27820000001', email: 'pat@example.com', earningsBalance: 4820.5,
  hireInventory: { tents: { small: 3 } }, skills: ['plumbing'], rating: 4.8, status: 'active', kycStatus: 'approved',
  monFri: true, saturday: false, sunday: false, emergency: true, lat: -29.8, lng: 31.0,
}
const PRIVATE = ['phone', 'email', 'earningsBalance', 'hireInventory']

test("a customer never sees a provider's phone, email, earnings or hire stock", () => {
  const seen = presentProvider(row, { sub: 'some-client', role: 'client' }) as Record<string, unknown>
  for (const key of PRIVATE) assert.equal(key in seen, false, `${key} leaked to a customer`)
})

test("another provider doesn't see them either", () => {
  const seen = presentProvider(row, { sub: 'prov-2', role: 'provider' }) as Record<string, unknown>
  for (const key of PRIVATE) assert.equal(key in seen, false, `${key} leaked to another provider`)
})

test('the provider themself and admins see everything', () => {
  for (const viewer of [{ sub: 'prov-1', role: 'provider' }, { sub: 'admin-1', role: 'admin' }]) {
    const seen = presentProvider(row, viewer) as Record<string, unknown>
    for (const key of PRIVATE) assert.equal(seen[key], (row as Record<string, unknown>)[key], `${viewer.role} should see ${key}`)
  }
})

test('public fields customers need are untouched', () => {
  const seen = presentProvider(row, { sub: 'c', role: 'client' }) as Record<string, unknown>
  for (const key of ['id', 'name', 'skills', 'rating', 'status', 'kycStatus', 'lat', 'lng']) {
    assert.deepEqual(seen[key], (row as Record<string, unknown>)[key], key)
  }
})

test('everyone gets the nested availability object the app expects', () => {
  for (const viewer of [{ sub: 'c', role: 'client' }, { sub: 'prov-1', role: 'provider' }, { sub: 'a', role: 'admin' }]) {
    const seen = presentProvider(row, viewer) as { availability: unknown }
    assert.deepEqual(seen.availability, { monFri: true, saturday: false, sunday: false, emergency: true })
  }
})

test('the original row is not mutated', () => {
  const copy = JSON.parse(JSON.stringify(row))
  presentProvider(row, { sub: 'c', role: 'client' })
  assert.deepEqual(row, copy)
})
