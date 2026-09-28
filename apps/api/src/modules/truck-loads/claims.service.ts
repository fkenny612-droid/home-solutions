import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import { plainToInstance } from 'class-transformer'
import { validate } from 'class-validator'
import { PrismaService } from '../../prisma/prisma.service'
import { SmsService } from '../notifications/sms.service'
import { assertDocType, UploadedDoc } from './documents.util'
import { ChatService } from './chat.service'
import { ClaimDto, ResolveClaimDto } from './truck-loads.dto'

export const MAX_CLAIM_PHOTOS = 5
const round2 = (n: number) => Math.round(n * 100) / 100
const rand = (n: number) => `R ${n.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const CLAIM_LABEL: Record<string, string> = {
  damaged: 'Goods damaged', short: 'Short delivery', late: 'Delivered late', not_delivered: 'Not delivered', other: 'Other problem',
}

const claimSelect = {
  id: true, shipmentId: true, type: true, description: true, amountClaimed: true, carrierResponse: true,
  status: true, outcome: true, refundAmount: true, adminNote: true, refundReference: true,
  resolvedAt: true, closedAt: true, createdAt: true,
  photos: { select: { id: true, fileName: true, mimeType: true, size: true } },
} as const

/**
 * Buyer protection: within the claim window after delivery the shipper can
 * report a problem. The payout freezes ("disputed") until an admin decides.
 */
@Injectable()
export class ClaimsService {
  constructor(private prisma: PrismaService, private sms: SmsService, private chat: ChatService) {}

  async parse(raw: unknown): Promise<ClaimDto> {
    let obj: unknown = raw
    if (typeof raw === 'string') {
      try { obj = JSON.parse(raw) } catch { throw new BadRequestException('Malformed claim data') }
    }
    const dto = plainToInstance(ClaimDto, obj ?? {})
    const errors = await validate(dto, { whitelist: true })
    if (errors.length) throw new BadRequestException(errors.flatMap(e => Object.values(e.constraints ?? {})))
    return dto
  }

  // ── Shipper ─────────────────────────────────────────────────────────────────

  async raise(shipperId: string, shipmentId: string, rawData: unknown, files: UploadedDoc[]) {
    const dto = await this.parse(rawData)
    if (files.length > MAX_CLAIM_PHOTOS) throw new BadRequestException(`Up to ${MAX_CLAIM_PHOTOS} photos`)
    for (const f of files) {
      if (f.fieldname !== 'photos') throw new BadRequestException(`Unexpected file "${f.fieldname}"`)
      assertDocType(f, 'Claim photo')
    }
    const shipment = await this.prisma.shipment.findFirst({ where: { id: shipmentId, shipperId } })
    if (!shipment) throw new NotFoundException('Shipment not found')
    if (shipment.status !== 'delivered') throw new ConflictException('You can report a problem once the load is delivered')
    const payment = await this.prisma.payment.findFirst({ where: { shipmentId, status: { in: ['release_pending', 'disputed'] } }, orderBy: { createdAt: 'desc' } })
    if (!payment) throw new ConflictException('The claim window for this shipment has closed')
    if (payment.status === 'disputed') throw new ConflictException('A claim is already open for this shipment')
    if (payment.releaseAfter && payment.releaseAfter <= new Date()) throw new ConflictException('The claim window for this shipment has closed')
    if (dto.amountClaimed != null && dto.amountClaimed > payment.amount) throw new BadRequestException(`You can claim at most ${rand(payment.amount)}`)

    const claim = await this.prisma.$transaction(async tx => {
      // Guard against the release job racing us: only freeze a still-pending release
      const frozen = await tx.payment.updateMany({ where: { id: payment.id, status: 'release_pending' }, data: { status: 'disputed' } })
      if (!frozen.count) throw new ConflictException('The claim window for this shipment has closed')
      await tx.paymentEvent.create({ data: { paymentId: payment.id, message: `Payout frozen — shipper reported: ${CLAIM_LABEL[dto.type]}` } })
      return tx.claim.create({
        data: {
          shipmentId, paymentId: payment.id, shipperId, carrierId: payment.carrierId,
          type: dto.type, description: dto.description.trim(), amountClaimed: dto.amountClaimed ?? null,
          photos: { create: files.map(f => ({ fileName: f.originalname.slice(0, 200), mimeType: f.mimetype, size: f.size, data: f.buffer })) },
        },
        select: claimSelect,
      })
    })
    this.notifyCarrier(payment.carrierId, `Truck Loads: the shipper reported a problem with ${shipment.reference} (${CLAIM_LABEL[dto.type]}). Your payout is on hold until we review it — respond in Truck Loads.`)
    return claim
  }

  forShipper(shipperId: string, shipmentId: string) {
    return this.prisma.claim.findMany({ where: { shipmentId, shipperId }, orderBy: { createdAt: 'desc' }, select: claimSelect })
  }

  // ── Carrier ─────────────────────────────────────────────────────────────────

  forCarrier(carrierId: string, shipmentId: string) {
    return this.prisma.claim.findMany({ where: { shipmentId, carrierId }, orderBy: { createdAt: 'desc' }, select: claimSelect })
  }

  async respond(carrierId: string, claimId: string, response: string) {
    const claim = await this.prisma.claim.findFirst({ where: { id: claimId, carrierId } })
    if (!claim) throw new NotFoundException('Claim not found')
    if (claim.status !== 'open') throw new ConflictException('This claim has already been decided')
    return this.prisma.claim.update({ where: { id: claimId }, data: { carrierResponse: response.trim() }, select: claimSelect })
  }

  async photo(scope: { shipperId?: string; carrierId?: string; admin?: boolean }, claimId: string, photoId: string) {
    const where = scope.admin ? { id: claimId } : scope.shipperId ? { id: claimId, shipperId: scope.shipperId } : { id: claimId, carrierId: scope.carrierId }
    const photo = await this.prisma.claimPhoto.findFirst({ where: { id: photoId, claim: where } })
    if (!photo) throw new NotFoundException('Photo not found')
    return photo
  }

  // ── Platform admin ──────────────────────────────────────────────────────────

  async adminList(status?: string) {
    const rows = await this.prisma.claim.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: 'desc' },
      take: 200,
      select: { ...claimSelect, paymentId: true, shipperId: true, carrierId: true, shipment: { select: { reference: true, originAddress: true, destAddress: true } } },
    })
    const ids = [...new Set(rows.flatMap(r => [r.shipperId, r.carrierId]))]
    const [shippers, carriers, payments] = await Promise.all([
      this.prisma.shipperProfile.findMany({ where: { ownerId: { in: ids } }, select: { ownerId: true, companyName: true, contactPhone: true } }),
      this.prisma.carrierProfile.findMany({ where: { ownerId: { in: ids } }, select: { ownerId: true, companyName: true, contactPhone: true } }),
      this.prisma.payment.findMany({ where: { id: { in: rows.map(r => r.paymentId) } }, select: { id: true, status: true, amount: true, payoutAmount: true, feeAmount: true } }),
    ])
    return rows.map(r => ({
      ...r,
      shipper: shippers.find(s => s.ownerId === r.shipperId) ?? null,
      carrier: carriers.find(c => c.ownerId === r.carrierId) ?? null,
      payment: payments.find(p => p.id === r.paymentId) ?? null,
    }))
  }

  /** Everything the admin needs to decide: the claim, the POD and the chat. */
  async adminGet(id: string) {
    const claim = await this.prisma.claim.findUnique({ where: { id }, select: { ...claimSelect, carrierId: true, shipment: { select: { loadId: true } } } })
    if (!claim) throw new NotFoundException('Claim not found')
    const [messages, pod] = await Promise.all([
      this.chat.thread({ shipmentId: claim.shipmentId, carrierId: claim.carrierId }),
      claim.shipment.loadId
        ? this.prisma.proofOfDelivery.findUnique({
            where: { loadId: claim.shipment.loadId },
            select: { id: true, receiverName: true, note: true, lat: true, lng: true, accuracyM: true, deliveredAt: true, capturedBy: true, photos: { select: { id: true, fileName: true, mimeType: true, size: true } } },
          })
        : null,
    ])
    return { messages, pod }
  }

  async adminPodPhoto(claimId: string, photoId: string) {
    const claim = await this.prisma.claim.findUnique({ where: { id: claimId }, select: { shipment: { select: { loadId: true } } } })
    const loadId = claim?.shipment.loadId
    const photo = loadId && await this.prisma.podPhoto.findFirst({ where: { id: photoId, pod: { loadId } } })
    if (!photo) throw new NotFoundException('Photo not found')
    return photo
  }

  async resolve(id: string, dto: ResolveClaimDto) {
    const claim = await this.prisma.claim.findUnique({ where: { id }, include: { shipment: { select: { reference: true } } } })
    if (!claim) throw new NotFoundException('Claim not found')
    if (claim.status !== 'open') throw new ConflictException('This claim has already been decided')
    const payment = await this.prisma.payment.findUnique({ where: { id: claim.paymentId } })
    if (!payment || payment.status !== 'disputed') throw new ConflictException('The payment for this claim is not on hold')

    const note = dto.note?.trim() || null
    let refund = 0
    if (dto.outcome === 'split') {
      refund = round2(dto.refundAmount ?? 0)
      if (refund <= 0) throw new BadRequestException('Enter the amount to refund the shipper')
      if (refund >= payment.payoutAmount) throw new BadRequestException(`A split refund must be less than the carrier payout (${rand(payment.payoutAmount)}) — use "Refund shipper" for a full refund`)
    }

    const updated = await this.prisma.$transaction(async tx => {
      const [status, paymentData, message] =
        dto.outcome === 'carrier' ? ['payout_due', {}, 'Claim declined — payout released to carrier']
        : dto.outcome === 'shipper' ? ['refund_due', {}, 'Claim upheld — full refund due to shipper']
        : ['payout_due', { payoutAmount: round2(payment.payoutAmount - refund) },
           `Claim settled — ${rand(refund)} refund to shipper, ${rand(payment.payoutAmount - refund)} payout to carrier`]
      const moved = await tx.payment.updateMany({ where: { id: payment.id, status: 'disputed' }, data: { status, ...paymentData } })
      if (!moved.count) throw new ConflictException('The payment for this claim is not on hold')
      await tx.paymentEvent.create({ data: { paymentId: payment.id, message } })
      return tx.claim.update({
        where: { id },
        data: {
          outcome: dto.outcome, adminNote: note, resolvedAt: new Date(),
          ...(dto.outcome === 'split'
            ? { status: 'refund_due', refundAmount: refund }
            : { status: 'closed', closedAt: new Date(), refundAmount: dto.outcome === 'shipper' ? payment.amount : null }),
        },
        select: claimSelect,
      })
    })

    const ref = claim.shipment.reference
    const summary = dto.outcome === 'carrier' ? 'no refund; the carrier will be paid'
      : dto.outcome === 'shipper' ? `full refund of ${rand(payment.amount)} to the shipper`
      : `${rand(refund)} refunded to the shipper`
    this.notifyCarrier(claim.carrierId, `Truck Loads: claim on ${ref} decided — ${summary}.`)
    this.notifyShipper(claim.shipperId, `Truck Loads: your claim on ${ref} was decided — ${summary}.`)
    return updated
  }

  /** A split refund was paid back to the shipper by EFT. */
  async adminRefunded(id: string, reference: string) {
    const r = await this.prisma.claim.updateMany({
      where: { id, status: 'refund_due' },
      data: { status: 'closed', closedAt: new Date(), refundReference: reference },
    })
    if (!r.count) throw new ConflictException('This claim has no refund due')
    const claim = await this.prisma.claim.findUniqueOrThrow({ where: { id }, select: { ...claimSelect, paymentId: true } })
    await this.prisma.paymentEvent.create({ data: { paymentId: claim.paymentId, message: `Claim refund of ${rand(claim.refundAmount ?? 0)} paid to shipper (ref ${reference})` } })
    return claim
  }

  private notifyCarrier(ownerId: string, text: string) {
    this.prisma.carrierProfile.findUnique({ where: { ownerId }, select: { contactPhone: true } })
      .then(p => p?.contactPhone && this.sms.send(p.contactPhone, text)).catch(() => {})
  }

  private notifyShipper(ownerId: string, text: string) {
    this.prisma.shipperProfile.findUnique({ where: { ownerId }, select: { contactPhone: true } })
      .then(p => p?.contactPhone && this.sms.send(p.contactPhone, text)).catch(() => {})
  }
}
