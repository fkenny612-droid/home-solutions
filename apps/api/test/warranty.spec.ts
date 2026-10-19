import { test } from 'node:test'
import * as assert from 'node:assert/strict'
import { CLIENT_PLANS, SubscriptionsService } from '../src/modules/subscriptions/subscriptions.service'

const svcWith = (sub: { status: string; planId: string } | null) =>
  new SubscriptionsService({ subscription: { findUnique: async () => sub } } as any)

test('warranty length follows the customer plan, as the Terms say', async () => {
  assert.equal(await svcWith({ status: 'active', planId: 'basic_home' }).getWarrantyDays('u'), 30)
  assert.equal(await svcWith({ status: 'active', planId: 'premium_home' }).getWarrantyDays('u'), 90)
  assert.equal(await svcWith({ status: 'active', planId: 'estate_biz' }).getWarrantyDays('u'), 90)
})

test('no plan, a cancelled plan or an unknown plan means no warranty', async () => {
  assert.equal(await svcWith(null).getWarrantyDays('u'), 0)
  assert.equal(await svcWith({ status: 'cancelled', planId: 'premium_home' }).getWarrantyDays('u'), 0)
  assert.equal(await svcWith({ status: 'active', planId: 'mystery' }).getWarrantyDays('u'), 0)
})

test('plan table still matches the published Terms (30 / 90 / 90)', () => {
  assert.deepEqual(Object.values(CLIENT_PLANS).map(p => p.warrantyDays), [30, 90, 90])
})
