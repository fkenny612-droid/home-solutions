import {
  BadRequestException, ConflictException, ServiceUnavailableException, Injectable, Logger, NotFoundException, OnModuleDestroy, OnModuleInit,
} from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { PrismaService } from '../../prisma/prisma.service'
import { SmsService } from '../notifications/sms.service'
import { PaymentGatewayProvider } from './payment-gateway'

type Tx = Prisma.TransactionClient

export const PLATFORM_FEE_PERCENT = Number(process.env.PLATFORM_FEE_PERCENT ?? 5)
/** After delivery the shipper has this long to raise a claim before payout. */
export const CLAIM_WINDOW_HOURS = Number(process.env.CLAIM_WINDOW_HOURS ?? 48)
const RELEASE_CHECK_MS = 3_600_000

const round2 = (n: number) => Math.round(n * 100) / 100
const rand = (n: number) => `R ${n.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

@Injectable()
export class EscrowService implements OnModuleInit, OnModuleDestroy {
  private readonly log = new Logger(EscrowService.name)
  private timer?: NodeJS.Timeout

  constructor(private prisma: PrismaService, private gateways: PaymentGatewayProvider, private sms: SmsService) {}

  get provider() { return this.gateways.gateway?.name ?? 'off' }

  /** Fails fast before a bid is reserved when online payment isn't switched on. */
  assertEnabled() {
    if (!this.gateways.gateway) {
      throw new ServiceUnavailableException("Online payment isn't switched on yet — please contact Truck Loads to book this carrier")
    }
    return this.gateways.gateway
  }

  // ── Checkout ────────────────────────────────────────────────────────────────

  /** Creates a pending payment for an accepted bid and a hosted checkout for it. */
  async startCheckout(shipment: { id: string; reference: string; shipperId: string }, bid: { id: string; carrierId: string; amount: number }) {
    const gateway = this.assertEnabled()
    const feeAmount = round2(bid.amount * PLATFORM_FEE_PERCENT / 100)
    const payment = await this.prisma.payment.create({
      data: {
        shipmentId: shipment.id, bidId: bid.id, shipperId: shipment.shipperId, carrierId: bid.carrierId,
        amount: bid.amount, feePercent: PLATFORM_FEE_PERCENT, feeAmount, payoutAmount: round2(bid.amount - feeAmount),
        provider: gateway.name,
        events: { create: { message: `Checkout started for ${rand(bid.amount)}` } },
      },
    })
    const web = process.env.WEB_URL ?? 'http://localhost:3000'
    const api = process.env.API_PUBLIC_URL ?? 'http://localhost:4000'
    try {
      const checkout = await gateway.createCheckout({
        paymentId: payment.id,
        amount: bid.amount,
        description: `Truck Loads ${shipment.reference}`,
        returnUrl: `${web}/truck-loads/shipper?shipment=${shipment.id}&paid=1`,
        notifyUrl: `${api}/api/v1/truck-loads/payments/webhook`,
      })
      return this.prisma.payment.update({
        where: { id: payment.id },
        data: { checkoutId: checkout.checkoutId, checkoutUrl: checkout.redirectUrl },
      })
    } catch (e) {
      await this.setStatus(this.prisma, payment.id, 'failed', `Checkout could not be started: ${(e as Error).message}`)
      throw new BadRequestException('The payment page could not be opened — please try again')
    }
  }

  latestFor(shipmentId: string) {
    return this.prisma.payment.findFirst({ where: { shipmentId }, orderBy: { createdAt: 'desc' } })
  }

  async cancelPending(tx: Tx, shipmentId: string, why: string) {
    const pending = await tx.payment.findMany({ where: { shipmentId, status: 'pending' } })
    for (const p of pending) await this.setStatus(tx, p.id, 'cancelled', why)
  }

  // ── Lifecycle hooks (called inside the caller's transaction) ────────────────

  /** Pending → held. Returns false if the payment was not pending (duplicate webhook). */
  async markHeld(tx: Tx, paymentId: string, providerPaymentId?: string) {
    const r = await tx.payment.updateMany({
      where: { id: paymentId, status: 'pending' },
      data: { status: 'held', heldAt: new Date(), providerPaymentId: providerPaymentId ?? null },
    })
    if (r.count) await tx.paymentEvent.create({ data: { paymentId, message: 'Payment received — funds held in escrow' } })
    return r.count > 0
  }

  async markFailed(tx: Tx, paymentId: string, why?: string) {
    const r = await tx.payment.updateMany({ where: { id: paymentId, status: 'pending' }, data: { status: 'failed' } })
    if (r.count) await tx.paymentEvent.create({ data: { paymentId, message: `Payment failed${why ? `: ${why}` : ''}` } })
  }

  /** Delivery starts the claim window; payout follows once it passes. */
  async onDelivered(tx: Tx, shipmentId: string) {
    const releaseAfter = new Date(Date.now() + CLAIM_WINDOW_HOURS * 3_600_000)
    const held = await tx.payment.findMany({ where: { shipmentId, status: 'held' } })
    for (const p of held) {
      await tx.payment.update({ where: { id: p.id }, data: { status: 'release_pending', releaseAfter } })
      await tx.paymentEvent.create({ data: { paymentId: p.id, message: `Delivered — payout after the ${CLAIM_WINDOW_HOURS}h claim window` } })
    }
  }

  /** The job fell through after the shipper paid: their money goes back. */
  async onCancelledAfterFunding(tx: Tx, shipmentId: string, why: string) {
    const funded = await tx.payment.findMany({ where: { shipmentId, status: { in: ['held', 'release_pending'] } } })
    for (const p of funded) await this.setStatus(tx, p.id, 'refund_due', why)
    await this.cancelPending(tx, shipmentId, why)
  }

  // ── Release job ─────────────────────────────────────────────────────────────

  onModuleInit() {
    if (process.env.TRUCK_LOADS_JOBS === 'off') return
    this.timer = setInterval(() => this.releaseDue().catch(e => this.log.error('Release job failed', e)), RELEASE_CHECK_MS)
    this.timer.unref()
  }

  onModuleDestroy() { if (this.timer) clearInterval(this.timer) }

  /** Claim window over, no dispute: the carrier's payout becomes due. */
  async releaseDue(now = new Date()) {
    const due = await this.prisma.payment.findMany({ where: { status: 'release_pending', releaseAfter: { lte: now } } })
    for (const p of due) {
      const moved = await this.prisma.payment.updateMany({ where: { id: p.id, status: 'release_pending' }, data: { status: 'payout_due' } })
      if (!moved.count) continue
      await this.prisma.paymentEvent.create({ data: { paymentId: p.id, message: `Released — ${rand(p.payoutAmount)} payout due to carrier` } })
      const carrier = await this.prisma.carrierProfile.findUnique({ where: { ownerId: p.carrierId } })
      if (carrier?.contactPhone) {
        this.sms.send(carrier.contactPhone, `Truck Loads: payment of ${rand(p.payoutAmount)} released for your delivery. It will be paid to your bank account.`).catch(() => {})
      }
    }
    if (due.length) this.log.log(`Released ${due.length} payment(s)`)
    return due.length
  }

  // ── Views ───────────────────────────────────────────────────────────────────

  async forCarrierLoad(carrierId: string, loadId: string) {
    const load = await this.prisma.load.findFirst({ where: { id: loadId, ownerId: carrierId }, select: { shipmentId: true } })
    if (!load?.shipmentId) return null
    const p = await this.prisma.payment.findFirst({
      where: { shipmentId: load.shipmentId, carrierId, status: { notIn: ['pending', 'failed', 'cancelled'] } },
      orderBy: { createdAt: 'desc' },
      include: { events: { orderBy: { createdAt: 'desc' } } },
    })
    return p && this.carrierView(p)
  }

  async carrierPayments(carrierId: string) {
    const rows = await this.prisma.payment.findMany({
      where: { carrierId, status: { notIn: ['pending', 'failed', 'cancelled'] } },
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: { shipment: { select: { reference: true, originAddress: true, destAddress: true } } },
    })
    return rows.map(p => ({ ...this.carrierView(p), shipment: p.shipment }))
  }

  private carrierView(p: any) {
    return {
      id: p.id, status: p.status, amount: p.amount, feePercent: p.feePercent, feeAmount: p.feeAmount,
      payoutAmount: p.payoutAmount, heldAt: p.heldAt, releaseAfter: p.releaseAfter, paidOutAt: p.paidOutAt,
      payoutReference: p.payoutReference, events: p.events,
    }
  }

  // ── Platform admin ──────────────────────────────────────────────────────────

  async adminList(status?: string) {
    const rows = await this.prisma.payment.findMany({
      where: status ? { status } : { status: { notIn: ['pending', 'failed', 'cancelled'] } },
      orderBy: { updatedAt: 'desc' },
      take: 300,
      include: { shipment: { select: { reference: true, originAddress: true, destAddress: true } } },
    })
    const ids = [...new Set(rows.flatMap(r => [r.carrierId, r.shipperId]))]
    const [carriers, shippers] = await Promise.all([
      this.prisma.carrierProfile.findMany({ where: { ownerId: { in: ids } }, include: { documents: { where: { kind: 'bank_confirmation' }, select: { id: true } } } }),
      this.prisma.shipperProfile.findMany({ where: { ownerId: { in: ids } } }),
    ])
    return rows.map(r => {
      const c = carriers.find(x => x.ownerId === r.carrierId)
      const s = shippers.find(x => x.ownerId === r.shipperId)
      return {
        ...r,
        carrier: c ? { profileId: c.id, companyName: c.companyName, contactPhone: c.contactPhone, bankDocumentId: c.documents[0]?.id ?? null } : null,
        shipper: s ? { companyName: s.companyName, contactPhone: s.contactPhone, contactEmail: s.contactEmail } : null,
      }
    })
  }

  async adminMarkPaidOut(id: string, reference: string) {
    return this.adminSettle(id, 'payout_due', 'paid_out', { paidOutAt: new Date(), payoutReference: reference }, `Paid out to carrier (ref ${reference})`)
  }

  async adminMarkRefunded(id: string, reference: string) {
    return this.adminSettle(id, 'refund_due', 'refunded', { refundedAt: new Date(), refundReference: reference }, `Refunded to shipper (ref ${reference})`)
  }

  private async adminSettle(id: string, from: string, to: string, data: object, message: string) {
    if (!(await this.prisma.payment.findUnique({ where: { id } }))) throw new NotFoundException('Payment not found')
    const r = await this.prisma.payment.updateMany({ where: { id, status: from }, data: { status: to, ...data } })
    if (!r.count) throw new ConflictException(`Payment is not ${from.replace('_', ' ')}`)
    await this.prisma.paymentEvent.create({ data: { paymentId: id, message } })
    return this.prisma.payment.findUnique({ where: { id }, include: { events: { orderBy: { createdAt: 'desc' } } } })
  }

  private async setStatus(db: Tx | PrismaService, id: string, status: string, message: string) {
    await db.payment.update({ where: { id }, data: { status } })
    await db.paymentEvent.create({ data: { paymentId: id, message } })
  }
}
