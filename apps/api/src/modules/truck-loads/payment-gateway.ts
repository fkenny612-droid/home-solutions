import { Injectable, Logger } from '@nestjs/common'
import { createHmac, randomBytes, timingSafeEqual } from 'crypto'

export interface CheckoutRequest {
  paymentId: string       // our id; sent as merchantTransactionId
  amount: number          // ZAR
  description: string
  returnUrl: string       // where the shopper lands afterwards
  notifyUrl: string       // server-to-server webhook
}

export interface CheckoutResult { checkoutId: string; redirectUrl: string }

export interface WebhookResult {
  paymentId: string
  succeeded: boolean
  providerPaymentId?: string
  description?: string
}

export interface PaymentGateway {
  readonly name: 'mock' | 'peach'
  createCheckout(req: CheckoutRequest): Promise<CheckoutResult>
  /** Returns null when the webhook can't be authenticated — never trust it then. */
  verifyWebhook(headers: Record<string, string | string[] | undefined>, rawBody: Buffer | undefined, body: any): WebhookResult | null
}

/**
 * Test mode: no money moves. The shopper is sent to our own clearly-labelled
 * test checkout page, which confirms through an authenticated endpoint.
 */
export class MockGateway implements PaymentGateway {
  readonly name = 'mock' as const

  constructor(private webUrl: string) {}

  async createCheckout(req: CheckoutRequest): Promise<CheckoutResult> {
    const checkoutId = `mock_${randomBytes(8).toString('hex')}`
    const q = new URLSearchParams({ payment: req.paymentId, amount: String(req.amount), return: req.returnUrl })
    return { checkoutId, redirectUrl: `${this.webUrl}/truck-loads/shipper/pay/test?${q}` }
  }

  verifyWebhook() {
    return null // test payments are confirmed through the authenticated test endpoint only
  }
}

/**
 * Peach Payments Hosted Checkout (V2): card details are entered on Peach's
 * page, never on ours (keeps us out of PCI card-data scope).
 *
 * ⚠ Built from Peach's published flow (OAuth token → POST /v2/checkout →
 * redirect → signed webhook) but NOT yet exercised against the sandbox.
 * Verify field names and the webhook signature scheme with sandbox
 * credentials before enabling PAYMENTS_MODE=peach in production.
 *
 * Env: PEACH_CLIENT_ID, PEACH_CLIENT_SECRET, PEACH_MERCHANT_ID,
 *      PEACH_ENTITY_ID, PEACH_WEBHOOK_SECRET, PEACH_MODE=test|live
 */
export class PeachCheckoutGateway implements PaymentGateway {
  readonly name = 'peach' as const
  private readonly log = new Logger('PeachCheckout')
  private token: { value: string; expires: number } | null = null

  private get live() { return process.env.PEACH_MODE === 'live' }
  private get authBase() { return this.live ? 'https://dashboard.peachpayments.com' : 'https://sandbox-dashboard.peachpayments.com' }
  private get checkoutBase() { return this.live ? 'https://secure.peachpayments.com' : 'https://testsecure.peachpayments.com' }

  private async accessToken() {
    if (this.token && this.token.expires > Date.now() + 60_000) return this.token.value
    const res = await fetch(`${this.authBase}/api/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientId: process.env.PEACH_CLIENT_ID,
        clientSecret: process.env.PEACH_CLIENT_SECRET,
        merchantId: process.env.PEACH_MERCHANT_ID,
      }),
    })
    const json: any = await res.json().catch(() => ({}))
    if (!res.ok || !json.access_token) throw new Error(`Peach auth failed (${res.status})`)
    this.token = { value: json.access_token, expires: Date.now() + (Number(json.expires_in) || 3600) * 1000 }
    return this.token.value
  }

  async createCheckout(req: CheckoutRequest): Promise<CheckoutResult> {
    const res = await fetch(`${this.checkoutBase}/v2/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await this.accessToken()}` },
      body: JSON.stringify({
        authentication: { entityId: process.env.PEACH_ENTITY_ID },
        merchantTransactionId: req.paymentId,
        amount: Number(req.amount.toFixed(2)),
        currency: 'ZAR',
        nonce: randomBytes(16).toString('hex'),
        shopperResultUrl: req.returnUrl,
        notificationUrl: req.notifyUrl,
      }),
    })
    const json: any = await res.json().catch(() => ({}))
    if (!res.ok || !json.redirectUrl) {
      this.log.error(`Checkout create failed (${res.status}): ${JSON.stringify(json).slice(0, 300)}`)
      throw new Error('Could not start the Peach checkout')
    }
    return { checkoutId: json.checkoutId ?? json.id, redirectUrl: json.redirectUrl }
  }

  verifyWebhook(headers: Record<string, string | string[] | undefined>, rawBody: Buffer | undefined, body: any): WebhookResult | null {
    const secret = process.env.PEACH_WEBHOOK_SECRET
    const sig = String(headers['x-webhook-signature'] ?? '')
    const ts = String(headers['x-webhook-timestamp'] ?? '')
    if (!secret || !sig || !ts || !rawBody) return null
    // Reject stale deliveries (replay protection)
    if (Math.abs(Date.now() - Number(ts) * (ts.length <= 10 ? 1000 : 1)) > 10 * 60_000) return null
    const expected = createHmac('sha256', secret).update(`${ts}.${rawBody.toString('utf8')}`).digest('hex')
    const a = Buffer.from(expected), b = Buffer.from(sig)
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null

    const code = String(body?.result?.code ?? body?.['result.code'] ?? '')
    const paymentId = String(body?.merchantTransactionId ?? '')
    if (!paymentId) return null
    return {
      paymentId,
      succeeded: /^(000\.000\.|000\.100\.1|000\.[36])/.test(code),
      providerPaymentId: body?.id,
      description: body?.result?.description,
    }
  }
}

/**
 * PAYMENTS_MODE: "peach" (live), "test" (test checkout, no real money) or "off".
 * Production defaults to off so a missing setting can never let shippers
 * "pay" with the test checkout; development defaults to test.
 */
export function paymentsMode(env = process.env): 'peach' | 'test' | 'off' {
  const m = (env.PAYMENTS_MODE ?? '').toLowerCase()
  if (m === 'peach' || m === 'off') return m
  if (m === 'test' || m === 'mock') return 'test'
  return env.NODE_ENV === 'production' ? 'off' : 'test'
}

@Injectable()
export class PaymentGatewayProvider {
  readonly mode = paymentsMode()
  readonly gateway: PaymentGateway | null =
    this.mode === 'peach' ? new PeachCheckoutGateway()
    : this.mode === 'test' ? new MockGateway(process.env.WEB_URL ?? 'http://localhost:3000')
    : null
}
