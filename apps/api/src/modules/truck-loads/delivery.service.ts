import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { randomBytes } from 'crypto'
import { plainToInstance } from 'class-transformer'
import { validate } from 'class-validator'
import { PrismaService } from '../../prisma/prisma.service'
import { SmsService } from '../notifications/sms.service'
import { assertDocType, UploadedDoc } from './documents.util'
import { phoneKey } from './truck-loads.rules'
import { CLAIM_WINDOW_HOURS } from './escrow.service'
import { LocationDto, PodDto, RatingDto } from './truck-loads.dto'

export const MAX_POD_PHOTOS = 3
/** Store a trail point at most this often per load (the latest position always updates). */
const TRAIL_EVERY_MS = 20_000
const TRAIL_POINTS = 300

export type RatingRole = 'shipper_rates_carrier' | 'carrier_rates_shipper'

export const newTrackingToken = () => randomBytes(12).toString('base64url')

@Injectable()
export class DeliveryService {
  constructor(private prisma: PrismaService, private sms: SmsService) {}

  // ── Proof of delivery ───────────────────────────────────────────────────────

  async parsePod(raw: unknown): Promise<PodDto> {
    let obj: unknown = raw
    if (typeof raw === 'string') {
      try { obj = JSON.parse(raw) } catch { throw new BadRequestException('Malformed delivery data') }
    }
    const dto = plainToInstance(PodDto, obj ?? {})
    const errors = await validate(dto, { whitelist: true })
    if (errors.length) throw new BadRequestException(errors.flatMap(e => Object.values(e.constraints ?? {})))
    return dto
  }

  checkPhotos(files: UploadedDoc[]) {
    if (files.length > MAX_POD_PHOTOS) throw new BadRequestException(`Up to ${MAX_POD_PHOTOS} photos`)
    for (const f of files) {
      if (f.fieldname !== 'photos') throw new BadRequestException(`Unexpected file "${f.fieldname}"`)
      assertDocType(f, 'Delivery photo')
    }
  }

  /** Called by TruckLoadsService.deliver before the status change. */
  async createPod(loadId: string, capturedBy: 'driver' | 'dispatcher', dto: PodDto, files: UploadedDoc[]) {
    if (await this.prisma.proofOfDelivery.findUnique({ where: { loadId } })) throw new ConflictException('Delivery already recorded')
    return this.prisma.proofOfDelivery.create({
      data: {
        loadId, capturedBy,
        receiverName: dto.receiverName.trim(),
        note: dto.note?.trim() || null,
        lat: dto.lat ?? null, lng: dto.lng ?? null, accuracyM: dto.accuracyM ?? null,
        photos: {
          create: files.map(f => ({ fileName: f.originalname.slice(0, 200), mimeType: f.mimetype, size: f.size, data: f.buffer })),
        },
      },
    })
  }

  hasPod(loadId: string) {
    return this.prisma.proofOfDelivery.findUnique({ where: { loadId }, select: { id: true } }).then(Boolean)
  }

  private podView(loadId: string) {
    return this.prisma.proofOfDelivery.findUnique({
      where: { loadId },
      select: {
        id: true, receiverName: true, note: true, lat: true, lng: true, accuracyM: true, capturedBy: true, deliveredAt: true,
        photos: { select: { id: true, fileName: true, mimeType: true, size: true } },
      },
    })
  }

  async podForCarrier(ownerId: string, loadId: string) {
    if (!(await this.prisma.load.findFirst({ where: { id: loadId, ownerId }, select: { id: true } }))) throw new NotFoundException('Load not found')
    return this.podView(loadId)
  }

  async podForShipper(shipperId: string, shipmentId: string) {
    const s = await this.prisma.shipment.findFirst({ where: { id: shipmentId, shipperId }, select: { loadId: true } })
    if (!s) throw new NotFoundException('Shipment not found')
    return s.loadId ? this.podView(s.loadId) : null
  }

  async podPhoto(scope: { ownerId?: string; shipperId?: string }, loadOrShipmentId: string, photoId: string) {
    const loadId = scope.shipperId
      ? (await this.prisma.shipment.findFirst({ where: { id: loadOrShipmentId, shipperId: scope.shipperId }, select: { loadId: true } }))?.loadId
      : (await this.prisma.load.findFirst({ where: { id: loadOrShipmentId, ownerId: scope.ownerId }, select: { id: true } }))?.id
    const photo = loadId && await this.prisma.podPhoto.findFirst({ where: { id: photoId, pod: { loadId } } })
    if (!photo) throw new NotFoundException('Photo not found')
    return photo
  }

  // ── Live tracking ───────────────────────────────────────────────────────────

  /** Driver app position report while heading to pickup or on the trip. */
  async reportLocation(driverPhone: string, loadId: string, dto: LocationDto) {
    const key = phoneKey(driverPhone)
    const load = key && await this.prisma.load.findFirst({
      where: { id: loadId, truck: { driverPhoneKey: key } },
      select: { id: true, status: true, lastLocationAt: true },
    })
    if (!load) throw new NotFoundException('Load not found')
    if (!['assigned', 'in_transit'].includes(load.status)) throw new ConflictException('Tracking only runs on active loads')
    const now = new Date()
    const keepTrail = !load.lastLocationAt || now.getTime() - load.lastLocationAt.getTime() >= TRAIL_EVERY_MS
    await this.prisma.load.update({
      where: { id: loadId },
      data: {
        lastLat: dto.lat, lastLng: dto.lng, lastSpeedKmh: dto.speedKmh ?? null, lastLocationAt: now,
        ...(keepTrail ? { trackingPoints: { create: {
          lat: dto.lat, lng: dto.lng, speedKmh: dto.speedKmh ?? null, heading: dto.heading ?? null, accuracyM: dto.accuracyM ?? null,
        } } } : {}),
      },
    })
    return { ok: true, stored: keepTrail }
  }

  async tracking(loadId: string) {
    const [load, trail] = await Promise.all([
      this.prisma.load.findUnique({
        where: { id: loadId },
        select: { status: true, lastLat: true, lastLng: true, lastSpeedKmh: true, lastLocationAt: true, routePolyline: true, originLat: true, originLng: true, destLat: true, destLng: true },
      }),
      this.prisma.trackingPoint.findMany({
        where: { loadId }, orderBy: { createdAt: 'desc' }, take: TRAIL_POINTS, select: { lat: true, lng: true, createdAt: true },
      }),
    ])
    if (!load) return null
    return {
      status: load.status,
      last: load.lastLat != null ? { lat: load.lastLat, lng: load.lastLng!, speedKmh: load.lastSpeedKmh, at: load.lastLocationAt } : null,
      trail: trail.reverse(),
      routePolyline: load.routePolyline,
      origin: load.originLat != null ? { lat: load.originLat, lng: load.originLng! } : null,
      destination: load.destLat != null ? { lat: load.destLat, lng: load.destLng! } : null,
    }
  }

  async trackingForShipper(shipperId: string, shipmentId: string) {
    const s = await this.prisma.shipment.findFirst({ where: { id: shipmentId, shipperId }, select: { loadId: true, trackingToken: true } })
    if (!s) throw new NotFoundException('Shipment not found')
    return { trackingToken: s.trackingToken, ...(s.loadId ? await this.tracking(s.loadId) : {}) }
  }

  /** Public page for the consignee: status and position only — no prices, no contacts. */
  async publicTracking(token: string) {
    if (!token || token.length < 12) throw new NotFoundException('Tracking link not found')
    const s = await this.prisma.shipment.findFirst({ where: { trackingToken: token } })
    if (!s) throw new NotFoundException('Tracking link not found')
    const [track, pod, shipper, load] = await Promise.all([
      s.loadId ? this.tracking(s.loadId) : null,
      s.loadId ? this.prisma.proofOfDelivery.findUnique({ where: { loadId: s.loadId }, select: { receiverName: true, deliveredAt: true } }) : null,
      this.prisma.shipperProfile.findUnique({ where: { ownerId: s.shipperId }, select: { companyName: true } }),
      s.loadId ? this.prisma.load.findUnique({ where: { id: s.loadId }, select: { truck: { select: { name: true } } } }) : null,
    ])
    return {
      reference: s.reference, status: s.status, commodity: s.commodity,
      originAddress: s.originAddress, destAddress: s.destAddress, pickupAt: s.pickupAt, deliverBy: s.deliverBy,
      shipperName: shipper?.companyName ?? null,
      truckName: load?.truck?.name ?? null,
      last: track?.last ?? null, trail: track?.trail ?? [],
      origin: track?.origin ?? null, destination: track?.destination ?? null,
      delivered: pod ? { receiverName: pod.receiverName, at: pod.deliveredAt } : null,
    }
  }

  // ── Ratings ─────────────────────────────────────────────────────────────────

  async rate(userId: string, shipmentId: string, role: RatingRole, dto: RatingDto) {
    const s = await this.prisma.shipment.findUnique({ where: { id: shipmentId }, include: { bids: { where: { status: 'accepted' } } } })
    if (!s) throw new NotFoundException('Shipment not found')
    const carrierId = s.bids[0]?.carrierId
    const [raterId, rateeId] = role === 'shipper_rates_carrier' ? [s.shipperId, carrierId] : [carrierId, s.shipperId]
    if (!rateeId || raterId !== userId) throw new ForbiddenException('Only the shipper and the awarded carrier can rate this job')
    if (s.status !== 'delivered') throw new ConflictException('You can rate once the load is delivered')
    try {
      return await this.prisma.rating.create({
        data: {
          shipmentId, role, raterId, rateeId, stars: dto.stars,
          onTime: dto.onTime ?? null, comment: dto.comment?.trim() || null,
        },
      })
    } catch {
      throw new ConflictException('You have already rated this job')
    }
  }

  myRating(shipmentId: string, role: RatingRole) {
    return this.prisma.rating.findUnique({ where: { shipmentId_role: { shipmentId, role } } })
  }

  /** Average stars, count and on-time share for many users at once. */
  async summaries(userIds: string[], role: RatingRole) {
    const ids = [...new Set(userIds)]
    const rows = await this.prisma.rating.findMany({ where: { rateeId: { in: ids }, role }, select: { rateeId: true, stars: true, onTime: true } })
    return new Map(ids.map(id => {
      const mine = rows.filter(r => r.rateeId === id)
      const timed = mine.filter(r => r.onTime !== null)
      return [id, {
        average: mine.length ? Math.round(mine.reduce((a, r) => a + r.stars, 0) / mine.length * 10) / 10 : null,
        count: mine.length,
        onTimePercent: timed.length ? Math.round(timed.filter(r => r.onTime).length / timed.length * 100) : null,
      }]
    }))
  }

  /** SMS the shipper when their load is delivered, with the POD summary. */
  async notifyShipperDelivered(shipmentId: string) {
    const s = await this.prisma.shipment.findUnique({ where: { id: shipmentId } })
    if (!s?.loadId) return
    const [shipper, pod] = await Promise.all([
      this.prisma.shipperProfile.findUnique({ where: { ownerId: s.shipperId } }),
      this.prisma.proofOfDelivery.findUnique({ where: { loadId: s.loadId } }),
    ])
    if (!shipper?.contactPhone) return
    await this.sms.send(shipper.contactPhone,
      `Truck Loads: ${s.reference} delivered to ${s.destAddress}${pod ? `, received by ${pod.receiverName}` : ''}. Report any problem within ${CLAIM_WINDOW_HOURS} hours in the shipper portal.`)
  }
}
