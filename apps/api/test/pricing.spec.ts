import { test } from 'node:test'
import * as assert from 'node:assert/strict'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { SERVICE_PRICING } from '../src/modules/bookings/pricing.generated'
import {
  calculateEstimate, baseQuote, priceBooking, isKnownService, unansweredQuestions,
  EMERGENCY_CALLOUT_FEE, MIN_PAYABLE,
} from '../src/modules/bookings/pricing'

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { loadMobileCatalogue } = require('./helpers/mobile-catalogue')
const mobile = loadMobileCatalogue()
// The app's file is evaluated in a separate vm realm; round-trip its output so strict deep-equal compares values, not prototypes.
const plain = <T,>(x: T): T => JSON.parse(JSON.stringify(x))
const appEstimate = (id: string, answers: Record<string, unknown>) => plain(mobile.calculateEstimate(id, answers))

// Small deterministic PRNG so failures are reproducible.
function rng(seed: number) { return () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296 }

test('server table covers exactly the services the app sells', () => {
  const appIds = plain(mobile.SERVICES.map((s: any) => s.id)).sort()
  assert.deepEqual(Object.keys(SERVICE_PRICING).sort(), appIds)
})

test('every ServiceType the API accepts has a price table', () => {
  const src = fs.readFileSync(path.join(__dirname, '../src/modules/bookings/booking.types.ts'), 'utf8')
  const block = src.slice(src.indexOf('export type ServiceType'), src.indexOf('export interface Booking'))
  const types = [...block.matchAll(/'([a-z_]+)'/g)].map(m => m[1])
  assert.ok(types.length > 30)
  for (const t of types) assert.ok(isKnownService(t), `ServiceType "${t}" has no price table — run pnpm sync:pricing or add it to the app`)
})

test('server estimate equals the app estimate: no answers, every service', () => {
  for (const s of mobile.SERVICES) {
    assert.deepEqual(calculateEstimate(s.id, {}), appEstimate(s.id, {}), s.id)
  }
})

test('server estimate equals the app estimate: every single option of every question', () => {
  for (const s of mobile.SERVICES) {
    for (const q of s.questions.filter((q: any) => q.type === 'select')) {
      for (const o of q.options) {
        const answers = { [q.key]: o.value }
        assert.deepEqual(calculateEstimate(s.id, answers), appEstimate(s.id, answers), `${s.id}.${q.key}=${o.value}`)
      }
    }
  }
})

test('server estimate equals the app estimate: 2000 random answer sets (incl. junk values)', () => {
  const rand = rng(42)
  for (let i = 0; i < 2000; i++) {
    const s = mobile.SERVICES[Math.floor(rand() * mobile.SERVICES.length)]
    const answers: Record<string, unknown> = {}
    for (const q of s.questions) {
      const r = rand()
      if (q.type === 'select' && q.options && r < 0.7) answers[q.key] = q.options[Math.floor(rand() * q.options.length)].value
      else if (r < 0.8) answers[q.key] = Math.floor(rand() * 10)           // counters / toggles
      else if (r < 0.9) answers[q.key] = 'not-a-real-option'                // junk
    }
    assert.deepEqual(calculateEstimate(s.id, answers), appEstimate(s.id, answers), JSON.stringify([s.id, answers]))
  }
})

test('unknown services price to nothing and are rejected as unknown', () => {
  assert.equal(isKnownService('constructor'), false)
  assert.equal(isKnownService('__proto__'), false)
  assert.equal(isKnownService('made_up'), false)
  assert.deepEqual(calculateEstimate('made_up', { issue: 'x' }), { min: 0, max: 0 })
})

test('the charge is the midpoint of the estimate', () => {
  const { min, max } = calculateEstimate('plumbing', { issue: 'burst_pipe' })
  assert.equal(baseQuote('plumbing', { issue: 'burst_pipe' }), Math.round((min + max) / 2))
})

test('emergency call-outs are a flat fee whatever the answers say', () => {
  assert.equal(priceBooking({ serviceType: 'plumbing', answers: { issue: 'geyser_replacement' }, emergency: true }).total, EMERGENCY_CALLOUT_FEE)
})

test('discounts reduce the total but can never take it below the minimum payable', () => {
  const base = baseQuote('plumbing', { issue: 'burst_pipe' })
  assert.deepEqual(priceBooking({ serviceType: 'plumbing', answers: { issue: 'burst_pipe' }, discount: 50 }), { base, discount: 50, total: base - 50 })
  assert.throws(() => priceBooking({ serviceType: 'plumbing', answers: {}, discount: 500 }), /at least R/)
  assert.doesNotThrow(() => priceBooking({ serviceType: 'plumbing', answers: {}, discount: baseQuote('plumbing', {}) - MIN_PAYABLE }))
})

test('totals are never zero, negative, or fractional', () => {
  for (const id of Object.keys(SERVICE_PRICING)) {
    const t = priceBooking({ serviceType: id, answers: {} }).total
    assert.ok(Number.isInteger(t) && t >= 150, `${id} -> ${t}`)
  }
})

test('a booking must answer every price-bearing question (an empty form is not the cheapest job)', () => {
  assert.deepEqual(unansweredQuestions('plumbing', {}).sort(), ['issue', 'urgency'].sort())
  assert.deepEqual(unansweredQuestions('plumbing', { issue: 'burst_pipe' }), ['urgency'])
  assert.deepEqual(unansweredQuestions('plumbing', { issue: 'burst_pipe', urgency: 'standard' }), [])
})

test('junk answers do not count as answered', () => {
  assert.deepEqual(unansweredQuestions('plumbing', { issue: 'not-a-real-option', urgency: 12 }).sort(), ['issue', 'urgency'])
})

test('unknown services have nothing to answer (they are rejected elsewhere)', () => {
  assert.deepEqual(unansweredQuestions('made_up', {}), [])
})
