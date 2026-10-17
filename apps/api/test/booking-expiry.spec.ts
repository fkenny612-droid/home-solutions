import { test } from 'node:test'
import * as assert from 'node:assert/strict'
import { isStale, cutoffs, acceptWindowMinutes, EMERGENCY_ACCEPT_WINDOW_MIN, STANDARD_ACCEPT_WINDOW_MIN } from '../src/modules/bookings/booking-expiry'

const now = new Date('2026-10-17T12:00:00Z')
const minsAgo = (m: number) => new Date(now.getTime() - m * 60_000)

test('emergencies expire fast, standard jobs get longer', () => {
  assert.equal(acceptWindowMinutes(true), EMERGENCY_ACCEPT_WINDOW_MIN)
  assert.equal(acceptWindowMinutes(false), STANDARD_ACCEPT_WINDOW_MIN)
  assert.ok(EMERGENCY_ACCEPT_WINDOW_MIN < STANDARD_ACCEPT_WINDOW_MIN)
})

test('an unaccepted emergency is stale just after its window, not before', () => {
  assert.equal(isStale({ status: 'pending', isEmergency: true, createdAt: minsAgo(EMERGENCY_ACCEPT_WINDOW_MIN - 1) }, now), false)
  assert.equal(isStale({ status: 'pending', isEmergency: true, createdAt: minsAgo(EMERGENCY_ACCEPT_WINDOW_MIN + 1) }, now), true)
})

test('a standard job with the same age is not yet stale', () => {
  assert.equal(isStale({ status: 'pending', isEmergency: false, createdAt: minsAgo(EMERGENCY_ACCEPT_WINDOW_MIN + 1) }, now), false)
  assert.equal(isStale({ status: 'pending', isEmergency: false, createdAt: minsAgo(STANDARD_ACCEPT_WINDOW_MIN + 1) }, now), true)
})

test('only waiting bookings can go stale — accepted and finished jobs never do', () => {
  for (const status of ['accepted', 'en_route', 'in_progress', 'completed', 'cancelled']) {
    assert.equal(isStale({ status, isEmergency: true, createdAt: minsAgo(10_000) }, now), false, status)
  }
  assert.equal(isStale({ status: 'emergency', isEmergency: true, createdAt: minsAgo(30) }, now), true, 'legacy emergency status waits too')
})

test('cutoffs match the windows', () => {
  const c = cutoffs(now)
  assert.equal(c.emergency.getTime(), minsAgo(EMERGENCY_ACCEPT_WINDOW_MIN).getTime())
  assert.equal(c.standard.getTime(), minsAgo(STANDARD_ACCEPT_WINDOW_MIN).getTime())
})
