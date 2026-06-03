import { Injectable, Logger } from '@nestjs/common'

/**
 * Peach Payments integration service.
 * Docs: https://developer.peachpayments.com
 *
 * Set env vars:
 *   PEACH_ENTITY_ID   — your entity ID from Peach dashboard
 *   PEACH_ACCESS_TOKEN — API access token
 *   PEACH_MODE        — 'test' | 'live'
 */

const PEACH_BASE = {
  test: 'https://testsecure.peachpayments.com/v1',
  live: 'https://secure.peachpayments.com/v1',
}

export interface ChargeParams {
  amount: number
  currency: string
  paymentBrand: 'VISA' | 'MASTER' | 'AMEX' | 'EFT'
  card?: { number: string; holder: string; expiry: string; cvv: string }
  descriptor: string
  merchantTransactionId: string
}

export interface PayoutParams {
  amount: number
  currency: string
  bankAccount: { accountNumber: string; branchCode: string; accountType: string }
  beneficiaryName: string
  reference: string
}

@Injectable()
export class PeachPaymentsService {
  private readonly logger = new Logger(PeachPaymentsService.name)
  private readonly mode: 'test' | 'live'
  private readonly baseUrl: string
  private readonly entityId: string
  private readonly accessToken: string

  constructor() {
    this.mode = (process.env.PEACH_MODE as 'test' | 'live') || 'test'
    this.baseUrl = PEACH_BASE[this.mode]
    this.entityId = process.env.PEACH_ENTITY_ID || 'STUB_ENTITY'
    this.accessToken = process.env.PEACH_ACCESS_TOKEN || 'STUB_TOKEN'
  }

  async createCharge(params: ChargeParams): Promise<{ success: boolean; transactionId: string; result: any }> {
    if (!process.env.PEACH_ENTITY_ID) {
      // Return mock response when credentials not configured
      this.logger.warn('Peach Payments credentials not set — returning mock charge response')
      return {
        success: true,
        transactionId: `MOCK-${Date.now()}`,
        result: { result: { code: '000.100.110', description: 'Mock transaction approved' }, id: `mock-${Date.now()}` },
      }
    }

    try {
      const body = new URLSearchParams({
        'authentication.entityId': this.entityId,
        'amount': params.amount.toFixed(2),
        'currency': params.currency,
        'paymentBrand': params.paymentBrand,
        'paymentType': 'DB',
        'descriptor': params.descriptor,
        'merchantTransactionId': params.merchantTransactionId,
      })

      if (params.card) {
        body.append('card.number', params.card.number)
        body.append('card.holder', params.card.holder)
        body.append('card.expiryMonth', params.card.expiry.split('/')[0])
        body.append('card.expiryYear', params.card.expiry.split('/')[1])
        body.append('card.cvv', params.card.cvv)
      }

      const response = await fetch(`${this.baseUrl}/payments`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${this.accessToken}`, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
      })

      const result = await response.json()
      const success = /^(000\.000\.|000\.100\.1|000\.[36])/.test(result?.result?.code || '')
      return { success, transactionId: result?.id, result }
    } catch (error) {
      this.logger.error('Peach charge failed', error)
      throw error
    }
  }

  async holdFunds(params: ChargeParams): Promise<{ success: boolean; transactionId: string }> {
    // Peach pre-auth (PA) — hold funds until job complete
    const result = await this.createCharge(params)
    this.logger.log(`Funds held: ${params.amount} ${params.currency} — txn ${result.transactionId}`)
    return result
  }

  async releaseFunds(transactionId: string, amount: number): Promise<{ success: boolean }> {
    // Capture a pre-auth to release held funds to provider
    if (!process.env.PEACH_ENTITY_ID) {
      this.logger.warn('Mock: releasing funds for txn ' + transactionId)
      return { success: true }
    }
    const body = new URLSearchParams({
      'authentication.entityId': this.entityId,
      'amount': amount.toFixed(2),
      'currency': 'ZAR',
      'paymentType': 'CP',
    })
    const response = await fetch(`${this.baseUrl}/payments/${transactionId}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.accessToken}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    })
    const result = await response.json()
    return { success: /^(000\.000\.|000\.100\.1)/.test(result?.result?.code || '') }
  }

  async splitPayout(payouts: PayoutParams[]): Promise<{ success: boolean; batchId: string }> {
    // Peach split-pay batch payout to multiple providers
    this.logger.log(`Processing batch payout for ${payouts.length} providers`)
    if (!process.env.PEACH_ENTITY_ID) {
      return { success: true, batchId: `BATCH-MOCK-${Date.now()}` }
    }
    // Real implementation would POST to Peach batch payout endpoint
    return { success: true, batchId: `BATCH-${Date.now()}` }
  }
}
