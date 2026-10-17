import { test } from 'node:test'
import * as assert from 'node:assert/strict'
import { canTransition, nextStatuses, ALL_STATUSES, Actor } from '../src/modules/bookings/booking-status'

const ok  = (from: string, to: any, who: Actor) => assert.equal(canTransition(from, to, who), true,  `${who}: ${from} -> ${to} should be allowed`)
const bad = (from: string, to: any, who: Actor) => assert.equal(canTransition(from, to, who), false, `${who}: ${from} -> ${to} should be refused`)

test('the normal job lifecycle works for the right people', () => {
  ok('accepted', 'en_route', 'provider')
  ok('en_route', 'in_progress', 'provider')
  ok('in_progress', 'completed', 'provider')
})

test('a client can never complete a job, start it, or mark it en route (the payment exploit)', () => {
  for (const from of ['pending', 'accepted', 'en_route', 'in_progress']) {
    bad(from, 'completed', 'client'); bad(from, 'in_progress', 'client'); bad(from, 'en_route', 'client')
  }
})

test('only the work-site statuses can be set by the provider; a provider cannot cancel a job they have not accepted', () => {
  bad('pending', 'cancelled', 'provider'); bad('pending', 'accepted', 'provider'); bad('pending', 'completed', 'provider')
  bad('accepted', 'completed', 'provider')   // cannot skip straight to done
  bad('en_route', 'completed', 'provider')
})

test('nothing is ever "accepted" through the status endpoint — that is assignProvider', () => {
  for (const from of ALL_STATUSES) for (const who of ['client', 'provider', 'admin'] as Actor[]) bad(from, 'accepted', who)
})

test('clients can cancel until work starts, not after', () => {
  ok('pending', 'cancelled', 'client'); ok('accepted', 'cancelled', 'client'); ok('en_route', 'cancelled', 'client')
  bad('in_progress', 'cancelled', 'client')
})

test('completed and cancelled are final for everyone, admin included', () => {
  for (const final of ['completed', 'cancelled']) {
    for (const who of ['client', 'provider', 'admin'] as Actor[]) {
      for (const to of ALL_STATUSES) bad(final, to, who)
    }
  }
})

test('completing twice is impossible (stops double-crediting earnings and points)', () => {
  bad('completed', 'completed', 'provider'); bad('completed', 'completed', 'admin')
})

test('admin can step a job forward and cancel it, but cannot jump to completed', () => {
  ok('accepted', 'en_route', 'admin'); ok('accepted', 'in_progress', 'admin'); ok('in_progress', 'completed', 'admin'); ok('in_progress', 'cancelled', 'admin')
  bad('accepted', 'completed', 'admin'); bad('pending', 'completed', 'admin')
})

test("legacy 'emergency' behaves like 'pending'", () => {
  ok('emergency', 'cancelled', 'client'); bad('emergency', 'completed', 'client'); bad('emergency', 'cancelled', 'provider')
})

test('unknown statuses and unknown source states are refused', () => {
  bad('pending', 'bogus', 'admin'); bad('bogus', 'cancelled', 'admin')
})

test('nextStatuses lists exactly what the actor may do', () => {
  assert.deepEqual(nextStatuses('accepted', 'provider').sort(), ['cancelled', 'en_route'])
  assert.deepEqual(nextStatuses('in_progress', 'client'), [])
  assert.deepEqual(nextStatuses('completed', 'admin'), [])
})
