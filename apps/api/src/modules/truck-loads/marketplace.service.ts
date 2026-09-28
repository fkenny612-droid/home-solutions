import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { randomBytes } from 'crypto'
import { Prisma } from '@prisma/client'
import { PrismaService } from '../../prisma/prisma.service'
import { EscrowService, PLATFORM_FEE_PERCENT, CLAIM_WINDOW_HOURS } from './escrow.service'
import { DeliveryService, newTrackingToken } from './delivery.service'
import { SmsService } from '../notifications/sms.service'
import { carrierBadge, complianceBlockers } from './compliance'
import { truckLoadProblems } from './truck-loads.rules'
import { BidDto, CreateShipmentDto, ShipperProfileDto } from './truck-loads.dto'

const REF_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'
const newReference = () => 'SH-' + [...randomBytes(6)].map(b => REF_ALPHABET[b % REF_ALPHABET.length]).join('')

type Shipment = Awaited<ReturnType<PrismaService['shipment']['findUniqueOrThrow']>>

@Injectable()
export class MarketplaceService {
  constructor(private prisma: PrismaService, private sms: SmsService, private escrow: EscrowService, private delivery: DeliveryService) {}

  // ── Shipper profile ─────────────────────────────────────────────────────────

  getShipperProfile(ownerId: string) {
    return this.prisma.shipperProfile.findUnique({ where: { ownerId } })
  }

  saveShipperProfile(ownerId: string, dto: ShipperProfileDto) {
    const data = {
      companyName:  dto.companyName.trim(),
      contactName:  dto.contactName.trim(),
      contactPhone: dto.contactPhone.trim(),
      contactEmail: dto.contactEmail?.trim() || null,
      vatNumber:    dto.vatNumber?.trim() || null,
      address:      dto.address?.trim() || null,
    }
    return this.prisma.shipperProfile.upsert({ where: { ownerId }, create: { ...data, ownerId }, update: data })
  }

  // ── Shipper: shipments ──────────────────────────────────────────────────────

  async createShipment(shipperId: string, dto: CreateShipmentDto) {
    if (!(await this.getShipperProfile(shipperId))) throw new BadRequestException('Add your company details first')
    if (dto.pickupAt && dto.deliverBy && new Date(dto.deliverBy) <= new Date(dto.pickupAt)) {
      throw new BadRequestException('Delivery deadline must be after pickup')
    }
    if (dto.biddingClosesAt && new Date(dto.biddingClosesAt) <= new Date()) {
      throw new BadRequestException('Bidding must close in the future')
    }
    let reference = newReference()
    while (await this.prisma.shipment.findUnique({ where: { reference } })) reference = newReference()
    return this.prisma.shipment.create({
      data: {
        shipperId, reference,
        commodity:       dto.commodity.trim(),
        weightKg:        dto.weightKg,
        hazmatTypes:     dto.hazmatTypes ?? [],
        truckType:       dto.truckType ?? null,
        originAddress:   dto.originAddress.trim(),
        destAddress:     dto.destAddress.trim(),
        pickupAt:        dto.pickupAt ? new Date(dto.pickupAt) : null,
        deliverBy:       dto.deliverBy ? new Date(dto.deliverBy) : null,
        notes:           dto.notes?.trim() || null,
        targetRate:      dto.targetRate ?? null,
        verifiedOnly:    dto.verifiedOnly ?? true,
        biddingClosesAt: dto.biddingClosesAt ? new Date(dto.biddingClosesAt) : null,
      },
    })
  }

  async shipperShipments(shipperId: string) {
    const rows = await this.prisma.shipment.findMany({
      where: { shipperId },
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: { bids: { where: { status: { in: ['active', 'accepted'] } }, select: { amount: true, status: true } } },
    })
    return rows.map(({ bids, ...s }) => ({
      ...s,
      bidCount:  bids.filter(b => b.status === 'active').length,
      lowestBid: bids.filter(b => b.status === 'active').reduce<number | null>((m, b) => (m === null || b.amount < m ? b.amount : m), null),
      awardedAmount: bids.find(b => b.status === 'accepted')?.amount ?? null,
    }))
  }

  /** A shipment with every bid and what the shipper needs to compare carriers. */
  async shipperShipment(shipperId: string, id: string) {
    const shipment = await this.prisma.shipment.findFirst({ where: { id, shipperId }, include: { bids: { orderBy: { amount: 'asc' } } } })
    if (!shipment) throw new NotFoundException('Shipment not found')
    const carriers = await this.carrierSummaries(shipment.bids.map(b => b.carrierId))
    const [load, payment] = await Promise.all([
      shipment.loadId
        ? this.prisma.load.findUnique({
            where: { id: shipment.loadId },
            select: {
              status: true, routeDistanceM: true, routeDurationS: true,
              lastLat: true, lastLng: true, lastSpeedKmh: true, lastLocationAt: true,
              truck: { select: { name: true, plate: true, driverName: true } },
              events: { orderBy: { createdAt: 'desc' }, take: 20, select: { id: true, message: true, createdAt: true, actor: true } },
            },
          })
        : null,
      this.escrow.latestFor(shipment.id),
    ])
    const myRating = await this.delivery.myRating(shipment.id, 'shipper_rates_carrier')
    return {
      ...shipment,
      bids: shipment.bids.map(b => ({ ...b, carrier: carriers.get(b.carrierId) ?? null })),
      progress: load,
      myRating,
      payment: payment && {
        id: payment.id, status: payment.status, amount: payment.amount, provider: payment.provider,
        checkoutUrl: payment.status === 'pending' ? payment.checkoutUrl : null,
        heldAt: payment.heldAt, releaseAfter: payment.releaseAfter, refundedAt: payment.refundedAt,
      },
    }
  }

  /**
   * Accepting a bid reserves it and sends the shipper to pay. The carrier only
   * gets the load once the payment is held in escrow (see onPaymentResult).
   */
  async acceptBid(shipperId: string, shipmentId: string, bidId: string) {
    const shipment = await this.prisma.shipment.findFirst({ where: { id: shipmentId, shipperId } })
    if (!shipment) throw new NotFoundException('Shipment not found')
    if (shipment.status !== 'open') throw new ConflictException(`Shipment is already ${shipment.status.replace('_', ' ')}`)
    const bid = await this.prisma.bid.findFirst({ where: { id: bidId, shipmentId } })
    if (!bid || bid.status !== 'active') throw new ConflictException('That bid is no longer available')

    const reserved = await this.prisma.shipment.updateMany({
      where: { id: shipmentId, status: 'open' },
      data: { status: 'awaiting_payment', awardedBidId: bid.id },
    })
    if (!reserved.count) throw new ConflictException('Shipment is no longer open')
    try {
      const payment = await this.escrow.startCheckout(shipment, bid)
      return { shipmentId, checkoutUrl: payment.checkoutUrl }
    } catch (e) {
      await this.prisma.shipment.update({ where: { id: shipmentId }, data: { status: 'open', awardedBidId: null } })
      throw e
    }
  }

  /** Resume (or restart after a failed attempt) the checkout for an accepted bid. */
  async payNow(shipperId: string, shipmentId: string) {
    const shipment = await this.prisma.shipment.findFirst({ where: { id: shipmentId, shipperId } })
    if (!shipment) throw new NotFoundException('Shipment not found')
    if (shipment.status !== 'awaiting_payment' || !shipment.awardedBidId) throw new ConflictException('Nothing to pay for this shipment')
    const latest = await this.escrow.latestFor(shipmentId)
    if (latest?.status === 'pending' && latest.checkoutUrl) return { shipmentId, checkoutUrl: latest.checkoutUrl }
    const bid = await this.prisma.bid.findUniqueOrThrow({ where: { id: shipment.awardedBidId } })
    const payment = await this.escrow.startCheckout(shipment, bid)
    return { shipmentId, checkoutUrl: payment.checkoutUrl }
  }

  /** Back out of an accepted-but-unpaid bid and reopen bidding. */
  async changeCarrier(shipperId: string, shipmentId: string) {
    const shipment = await this.prisma.shipment.findFirst({ where: { id: shipmentId, shipperId } })
    if (!shipment) throw new NotFoundException('Shipment not found')
    if (shipment.status !== 'awaiting_payment') throw new ConflictException('Only an unpaid award can be changed')
    return this.prisma.$transaction(async tx => {
      await this.escrow.cancelPending(tx, shipmentId, 'Shipper chose another carrier before paying')
      return tx.shipment.update({ where: { id: shipmentId }, data: { status: 'open', awardedBidId: null } })
    })
  }

  /** Payment provider (webhook or test checkout) reported the outcome. Idempotent. */
  async onPaymentResult(paymentId: string, succeeded: boolean, providerPaymentId?: string, description?: string) {
    const payment = await this.prisma.payment.findUnique({ where: { id: paymentId } })
    if (!payment) throw new NotFoundException('Payment not found')
    if (!succeeded) {
      await this.prisma.$transaction(tx => this.escrow.markFailed(tx, paymentId, description))
      return { status: 'failed' }
    }
    const shipment = await this.prisma.shipment.findUniqueOrThrow({ where: { id: payment.shipmentId } })
    const bid = await this.prisma.bid.findUniqueOrThrow({ where: { id: payment.bidId } })
    const shipper = await this.getShipperProfile(shipment.shipperId)

    const awarded = await this.prisma.$transaction(async tx => {
      if (!(await this.escrow.markHeld(tx, paymentId, providerPaymentId))) return false // already processed
      if (shipment.status !== 'awaiting_payment' || shipment.awardedBidId !== bid.id || bid.status !== 'active') {
        // Paid for an award that no longer stands (e.g. carrier changed meanwhile)
        await this.escrow.onCancelledAfterFunding(tx, shipment.id, 'Payment arrived after the award changed')
        return false
      }
      await this.award(tx, shipment, bid, shipper)
      return true
    })
    if (awarded) this.notifyWinner(shipment, bid).catch(() => {})
    return { status: awarded ? 'held' : 'ignored' }
  }

  /** Test checkout: only in test mode, only the paying shipper. */
  async testPay(shipperId: string, paymentId: string, succeed: boolean) {
    if (this.escrow.provider !== 'mock') throw new ForbiddenException('Test payments are disabled')
    const payment = await this.prisma.payment.findFirst({ where: { id: paymentId, shipperId, provider: 'mock' } })
    if (!payment) throw new NotFoundException('Payment not found')
    return this.onPaymentResult(paymentId, succeed, `test_${Date.now()}`, succeed ? undefined : 'Declined (test)')
  }

  private async award(tx: Prisma.TransactionClient, shipment: Shipment, bid: { id: string; carrierId: string; amount: number }, shipper: { companyName: string; contactName: string; contactPhone: string; contactEmail: string | null } | null) {
    const load = await tx.load.create({
      data: {
        ownerId:       bid.carrierId,
        reference:     shipment.reference,
        shipperName:   shipper?.companyName ?? 'Marketplace shipper',
        commodity:     shipment.commodity,
        weightKg:      shipment.weightKg,
        hazmatTypes:   shipment.hazmatTypes,
        rate:          bid.amount,
        originAddress: shipment.originAddress,
        destAddress:   shipment.destAddress,
        pickupAt:      shipment.pickupAt,
        deliverBy:     shipment.deliverBy,
        notes:         [
          shipment.notes,
          shipper && `Shipper contact: ${shipper.contactName}, ${shipper.contactPhone}${shipper.contactEmail ? `, ${shipper.contactEmail}` : ''}`,
        ].filter(Boolean).join('\n'),
        shipmentId:    shipment.id,
        events: { create: { type: 'created', message: `Won on the Truck Loads marketplace (${shipment.reference}) at R ${bid.amount.toLocaleString('en-ZA')} — payment secured in escrow` } },
      },
    })
    await tx.bid.update({ where: { id: bid.id }, data: { status: 'accepted' } })
    await tx.bid.updateMany({ where: { shipmentId: shipment.id, status: 'active' }, data: { status: 'declined' } })
    await tx.shipment.update({
      where: { id: shipment.id },
      data: { status: 'awarded', awardedBidId: bid.id, loadId: load.id, trackingToken: shipment.trackingToken ?? newTrackingToken() },
    })
  }

  private async notifyWinner(shipment: Shipment, bid: { carrierId: string; amount: number }) {
    const carrierProfile = await this.prisma.carrierProfile.findUnique({ where: { ownerId: bid.carrierId } })
    const phone = carrierProfile?.contactPhone
      ?? (await this.prisma.user.findUnique({ where: { id: bid.carrierId }, select: { phone: true } }))?.phone
    if (phone) {
      await this.sms.send(phone, `Truck Loads: you won ${shipment.reference} (${shipment.originAddress} → ${shipment.destAddress}) at R ${bid.amount.toLocaleString('en-ZA')}. Payment is secured. Assign a truck on your dispatch board.`)
    }
  }

  async cancelShipment(shipperId: string, id: string) {
    const shipment = await this.prisma.shipment.findFirst({ where: { id, shipperId } })
    if (!shipment) throw new NotFoundException('Shipment not found')
    if (!['open', 'awaiting_payment', 'awarded'].includes(shipment.status)) {
      throw new ConflictException(`Can't cancel a shipment that is ${shipment.status.replace('_', ' ')}`)
    }
    return this.prisma.$transaction(async tx => {
      await tx.bid.updateMany({ where: { shipmentId: id, status: 'active' }, data: { status: 'declined' } })
      if (shipment.loadId) {
        const load = await tx.load.findUnique({ where: { id: shipment.loadId } })
        if (load && ['booked', 'assigned'].includes(load.status)) {
          if (load.truckId) await tx.truck.update({ where: { id: load.truckId }, data: { status: 'available' } })
          await tx.load.update({
            where: { id: load.id },
            data: { status: 'cancelled', events: { create: { type: 'status', message: 'Shipper cancelled the shipment' } } },
          })
        }
      }
      // Paid already → refund due; unpaid checkout → cancelled
      await this.escrow.onCancelledAfterFunding(tx, id, 'Shipper cancelled the shipment')
      return tx.shipment.update({ where: { id }, data: { status: 'cancelled' } })
    })
  }

  // ── Carrier: the load board ─────────────────────────────────────────────────

  async board(carrierId: string, q?: string) {
    const now = new Date()
    const [rows, trucks, badge] = await Promise.all([
      this.prisma.shipment.findMany({
        where: {
          status: 'open',
          shipperId: { not: carrierId },
          OR: [{ biddingClosesAt: null }, { biddingClosesAt: { gt: now } }],
          ...(q ? { AND: [{ OR: [
            { originAddress: { contains: q, mode: 'insensitive' } },
            { destAddress:   { contains: q, mode: 'insensitive' } },
            { commodity:     { contains: q, mode: 'insensitive' } },
          ] }] } : {}),
        },
        orderBy: { createdAt: 'desc' },
        take: 200,
        include: { bids: { where: { status: 'active' }, select: { carrierId: true, amount: true, message: true, id: true } } },
      }),
      this.prisma.truck.findMany({ where: { ownerId: carrierId, status: { not: 'out_of_service' } } }),
      this.myBadge(carrierId),
    ])
    const shippers = await this.shipperNames(rows.map(r => r.shipperId))
    const shipperRatings = await this.delivery.summaries(rows.map(r => r.shipperId), 'carrier_rates_shipper')
    return {
      badge,
      feePercent: PLATFORM_FEE_PERCENT,
      claimWindowHours: CLAIM_WINDOW_HOURS,
      shipments: rows.map(({ bids, shipperId, ...s }) => {
        const mine = bids.find(b => b.carrierId === carrierId)
        return {
          ...s,
          shipperName: shippers.get(shipperId) ?? 'Shipper',
          shipperRating: shipperRatings.get(shipperId) ?? null,
          bidCount: bids.length,
          myBid: mine ? { id: mine.id, amount: mine.amount, message: mine.message } : null,
          fittingTrucks: this.fittingTrucks(trucks, s).length,
          canBid: !s.verifiedOnly || badge === 'verified',
        }
      }),
    }
  }

  async placeBid(carrierId: string, shipmentId: string, dto: BidDto) {
    const shipment = await this.prisma.shipment.findUnique({ where: { id: shipmentId } })
    if (!shipment) throw new NotFoundException('Shipment not found')
    this.assertBiddable(shipment, carrierId)
    if (!(await this.prisma.carrierProfile.findUnique({ where: { ownerId: carrierId } }))) {
      throw new BadRequestException('Add your company details (Company tab) before bidding')
    }
    if (shipment.verifiedOnly && (await this.myBadge(carrierId)) !== 'verified') {
      throw new ForbiddenException('This shipper only accepts bids from verified carriers')
    }
    const data = { amount: Math.round(dto.amount * 100) / 100, message: dto.message?.trim() || null, status: 'active' }
    return this.prisma.bid.upsert({
      where:  { shipmentId_carrierId: { shipmentId, carrierId } },
      create: { ...data, shipmentId, carrierId },
      update: data,
    })
  }

  async withdrawBid(carrierId: string, shipmentId: string) {
    const bid = await this.prisma.bid.findUnique({ where: { shipmentId_carrierId: { shipmentId, carrierId } } })
    if (!bid || bid.status !== 'active') throw new NotFoundException('No active bid to withdraw')
    return this.prisma.bid.update({ where: { id: bid.id }, data: { status: 'withdrawn' } })
  }

  async myBids(carrierId: string) {
    const bids = await this.prisma.bid.findMany({
      where: { carrierId },
      orderBy: { updatedAt: 'desc' },
      take: 100,
      include: { shipment: true },
    })
    const shippers = await this.shipperNames(bids.map(b => b.shipment.shipperId))
    const rated = new Set((await this.prisma.rating.findMany({
      where: { raterId: carrierId, role: 'carrier_rates_shipper', shipmentId: { in: bids.map(b => b.shipmentId) } },
      select: { shipmentId: true },
    })).map(r => r.shipmentId))
    return bids.map(b => ({
      id: b.id, amount: b.amount, message: b.message, status: b.status, updatedAt: b.updatedAt,
      shipment: {
        id: b.shipment.id, reference: b.shipment.reference, status: b.shipment.status,
        originAddress: b.shipment.originAddress, destAddress: b.shipment.destAddress,
        pickupAt: b.shipment.pickupAt, weightKg: b.shipment.weightKg, commodity: b.shipment.commodity,
        shipperName: shippers.get(b.shipment.shipperId) ?? 'Shipper',
        loadId: b.status === 'accepted' ? b.shipment.loadId : null,
        awardedToMe: b.shipment.awardedBidId === b.id,
        ratedByMe: rated.has(b.shipmentId),
      },
    }))
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  private assertBiddable(s: Shipment, carrierId: string) {
    if (s.shipperId === carrierId) throw new ForbiddenException("You can't bid on your own shipment")
    if (s.status !== 'open') throw new ConflictException('Bidding on this shipment has closed')
    if (s.biddingClosesAt && s.biddingClosesAt <= new Date()) throw new ConflictException('Bidding on this shipment has closed')
  }

  private fittingTrucks(trucks: any[], s: { weightKg: number; hazmatTypes: string[] }) {
    return trucks.filter(t => !truckLoadProblems(t, s).length && !complianceBlockers(t).length)
  }

  private async myBadge(ownerId: string) {
    const p = await this.prisma.carrierProfile.findUnique({ where: { ownerId }, include: { documents: { select: { kind: true, expiresAt: true } } } })
    return carrierBadge(p, p?.documents ?? [])
  }

  private async shipperNames(ids: string[]) {
    const rows = await this.prisma.shipperProfile.findMany({ where: { ownerId: { in: [...new Set(ids)] } }, select: { ownerId: true, companyName: true } })
    return new Map(rows.map(r => [r.ownerId, r.companyName]))
  }

  /** Trust signals a shipper sees next to each bid. */
  private async carrierSummaries(ids: string[]) {
    const unique = [...new Set(ids)]
    const [profiles, fleets, delivered, ratings] = await Promise.all([
      this.prisma.carrierProfile.findMany({ where: { ownerId: { in: unique } }, include: { documents: { select: { kind: true, expiresAt: true } } } }),
      this.prisma.truck.groupBy({ by: ['ownerId'], _count: true, where: { ownerId: { in: unique } } }),
      this.prisma.load.groupBy({ by: ['ownerId'], _count: true, where: { ownerId: { in: unique }, status: 'delivered' } }),
      this.delivery.summaries(unique, 'shipper_rates_carrier'),
    ])
    return new Map(unique.map(id => {
      const p = profiles.find(x => x.ownerId === id) ?? null
      return [id, {
        companyName:    p?.companyName ?? 'Carrier',
        badge:          carrierBadge(p, p?.documents ?? []),
        memberSince:    p?.createdAt ?? null,
        fleetSize:      fleets.find(f => f.ownerId === id)?._count ?? 0,
        completedLoads: delivered.find(d => d.ownerId === id)?._count ?? 0,
        rating:         ratings.get(id) ?? null,
      }]
    }))
  }
}
