import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { PrismaService } from '../../prisma/prisma.service'
import { GoogleRoutesService } from './google-routes.service'
import { ACTIVE_LOAD_STATUSES, canTransition, phoneKey, truckLoadProblems } from './truck-loads.rules'
import {
  AssignLoadDto, CreateLoadDto, CreateTruckDto, DriverNavigationDto, DriverStatusDto, LoadStatus, LoadStatusDto, UpdateLoadDto, UpdateTruckDto,
} from './truck-loads.dto'

const DRIVER_HISTORY_DAYS = 14

const LOAD_INCLUDE = {
  truck:  true,
  events: { orderBy: { createdAt: 'desc' as const } },
}

@Injectable()
export class TruckLoadsService {
  constructor(
    private prisma: PrismaService,
    private routes: GoogleRoutesService,
  ) {}

  // ── Trucks ──────────────────────────────────────────────────────────────────

  listTrucks(ownerId: string) {
    return this.prisma.truck.findMany({ where: { ownerId }, orderBy: { name: 'asc' } })
  }

  async createTruck(ownerId: string, dto: CreateTruckDto) {
    this.assertTare(dto.grossWeightKg, dto.tareWeightKg)
    try {
      return await this.prisma.truck.create({
        data: { ...dto, hazmatTypes: dto.hazmatTypes ?? [], driverPhoneKey: phoneKey(dto.driverPhone), ownerId },
      })
    } catch (e) {
      throw this.mapUnique(e, `A truck with plate ${dto.plate} already exists`)
    }
  }

  async updateTruck(ownerId: string, id: string, dto: UpdateTruckDto) {
    const truck = await this.getTruck(ownerId, id)
    this.assertTare(dto.grossWeightKg ?? truck.grossWeightKg, dto.tareWeightKg ?? truck.tareWeightKg)
    if (dto.status === 'available' && await this.activeLoadFor(id)) {
      throw new ConflictException('Truck still has an active load')
    }
    try {
      return await this.prisma.truck.update({
        where: { id },
        data: { ...dto, ...(dto.driverPhone !== undefined ? { driverPhoneKey: phoneKey(dto.driverPhone) } : {}) },
      })
    } catch (e) {
      throw this.mapUnique(e, `A truck with plate ${dto.plate} already exists`)
    }
  }

  async deleteTruck(ownerId: string, id: string) {
    await this.getTruck(ownerId, id)
    if (await this.prisma.load.count({ where: { truckId: id } })) {
      throw new ConflictException('Truck has load history — mark it out of service instead')
    }
    await this.prisma.truck.delete({ where: { id } })
    return { ok: true }
  }

  // ── Loads ───────────────────────────────────────────────────────────────────

  listLoads(ownerId: string, status?: string) {
    return this.prisma.load.findMany({
      where:   { ownerId, ...(status ? { status } : {}) },
      include: { truck: true },
      orderBy: [{ pickupAt: 'asc' }, { createdAt: 'desc' }],
      take:    500,
    })
  }

  async getLoad(ownerId: string, id: string) {
    const load = await this.prisma.load.findFirst({ where: { id, ownerId }, include: LOAD_INCLUDE })
    if (!load) throw new NotFoundException('Load not found')
    return load
  }

  async createLoad(ownerId: string, dto: CreateLoadDto) {
    this.assertWindow(dto.pickupAt, dto.deliverBy)
    try {
      return await this.prisma.load.create({
        data: {
          ...dto,
          ownerId,
          hazmatTypes: dto.hazmatTypes ?? [],
          pickupAt:    dto.pickupAt ? new Date(dto.pickupAt) : null,
          deliverBy:   dto.deliverBy ? new Date(dto.deliverBy) : null,
          events:      { create: { type: 'created', message: `Load booked for ${dto.shipperName}` } },
        },
        include: LOAD_INCLUDE,
      })
    } catch (e) {
      throw this.mapUnique(e, `Load reference ${dto.reference} already exists`)
    }
  }

  async updateLoad(ownerId: string, id: string, dto: UpdateLoadDto) {
    const load = await this.getLoad(ownerId, id)
    if (['delivered', 'cancelled'].includes(load.status)) {
      throw new ConflictException(`Cannot edit a ${load.status} load`)
    }
    this.assertWindow(dto.pickupAt ?? load.pickupAt?.toISOString(), dto.deliverBy ?? load.deliverBy?.toISOString())

    // Re-check the assigned truck still fits if weight/hazmat changed
    if (load.truck && (dto.weightKg !== undefined || dto.hazmatTypes !== undefined)) {
      const problems = truckLoadProblems(load.truck, {
        weightKg:    dto.weightKg ?? load.weightKg,
        hazmatTypes: dto.hazmatTypes ?? load.hazmatTypes,
      })
      if (problems.length) throw new BadRequestException(problems.join('; '))
    }

    // A moved endpoint or heavier/different cargo invalidates the cached route
    const originMoved = dto.originAddress !== undefined && dto.originAddress !== load.originAddress
    const destMoved   = dto.destAddress   !== undefined && dto.destAddress   !== load.destAddress
    const routeStale  = originMoved || destMoved || dto.weightKg !== undefined || dto.hazmatTypes !== undefined

    try {
      return await this.prisma.load.update({
        where: { id },
        data: {
          ...dto,
          ...(dto.pickupAt  !== undefined ? { pickupAt:  new Date(dto.pickupAt) }  : {}),
          ...(dto.deliverBy !== undefined ? { deliverBy: new Date(dto.deliverBy) } : {}),
          ...(routeStale  ? this.clearedRoute() : {}),
          ...(originMoved ? { originLat: null, originLng: null } : {}),
          ...(destMoved   ? { destLat:   null, destLng:   null } : {}),
        },
        include: LOAD_INCLUDE,
      })
    } catch (e) {
      throw this.mapUnique(e, `Load reference ${dto.reference} already exists`)
    }
  }

  async assign(ownerId: string, id: string, dto: AssignLoadDto) {
    const load  = await this.getLoad(ownerId, id)
    const truck = await this.getTruck(ownerId, dto.truckId)

    if (!['booked', 'assigned'].includes(load.status)) {
      throw new ConflictException(`Cannot reassign a load that is ${load.status}`)
    }
    if (load.truckId === truck.id) return load

    const problems = truckLoadProblems(truck, load)
    const busy = await this.activeLoadFor(truck.id)
    if (busy) problems.push(`Truck is already on load ${busy.reference}`)
    if (problems.length) throw new BadRequestException(problems.join('; '))

    return this.prisma.$transaction(async tx => {
      if (load.truckId) {
        await tx.truck.update({ where: { id: load.truckId }, data: { status: 'available' } })
      }
      await tx.truck.update({ where: { id: truck.id }, data: { status: 'on_load' } })
      return tx.load.update({
        where: { id },
        data: {
          truckId: truck.id,
          status:  'assigned',
          ...this.clearedRoute(), // route depends on the rig's dimensions
          events: { create: { type: 'assigned', message: `Assigned to ${truck.name} (${truck.plate})` } },
        },
        include: LOAD_INCLUDE,
      })
    })
  }

  async unassign(ownerId: string, id: string) {
    const load = await this.getLoad(ownerId, id)
    if (load.status !== 'assigned') throw new ConflictException('Only assigned loads can be unassigned')
    return this.prisma.$transaction(async tx => {
      await tx.truck.update({ where: { id: load.truckId! }, data: { status: 'available' } })
      return tx.load.update({
        where: { id },
        data: {
          truckId: null,
          status:  'booked',
          ...this.clearedRoute(),
          events: { create: { type: 'unassigned', message: `Removed from ${load.truck!.name}` } },
        },
        include: LOAD_INCLUDE,
      })
    })
  }

  async setStatus(ownerId: string, id: string, dto: LoadStatusDto) {
    const load = await this.getLoad(ownerId, id)
    return this.applyStatus(load, dto.status, 'dispatcher')
  }

  private async applyStatus(
    load: { id: string; status: string; truckId: string | null; truck?: { driverPhoneKey: string | null } | null },
    status: LoadStatus,
    actor: 'dispatcher' | 'driver',
    note?: string,
  ) {
    if (!canTransition(load.status, status)) {
      throw new ConflictException(`Cannot move a load from ${load.status.replace('_', ' ')} to ${status.replace('_', ' ')}`)
    }
    const releasesTruck = load.truckId && !ACTIVE_LOAD_STATUSES.includes(status)
    const who = actor === 'driver' ? 'Driver' : 'Dispatcher'
    const message = `${who} changed status to ${status.replace('_', ' ')}${note ? ` — “${note}”` : ''}`
    return this.prisma.$transaction(async tx => {
      if (releasesTruck) {
        await tx.truck.update({ where: { id: load.truckId! }, data: { status: 'available' } })
      }
      return tx.load.update({
        where: { id: load.id },
        data: {
          status,
          ...(status === 'delivered' ? { deliveredByKey: load.truck?.driverPhoneKey ?? null } : {}),
          events: { create: { type: 'status', actor, message } },
        },
        include: LOAD_INCLUDE,
      })
    })
  }

  /**
   * Compute a truck-legal route with Google's Routes API. Uses the assigned
   * truck, or a candidate `truckId` to preview before assigning (preview is
   * returned but not saved).
   */
  async route(ownerId: string, id: string, previewTruckId?: string) {
    const load  = await this.getLoad(ownerId, id)
    if (['delivered', 'cancelled'].includes(load.status)) {
      throw new ConflictException(`Cannot route a ${load.status} load`)
    }
    const truck = previewTruckId ? await this.getTruck(ownerId, previewTruckId) : load.truck
    if (!truck) throw new BadRequestException('Assign a truck (or pass truckId to preview) — truck routing needs its dimensions')

    const result = await this.routes.computeTruckRoute(
      load.originLat != null ? { lat: load.originLat, lng: load.originLng! } : { address: load.originAddress },
      load.destLat   != null ? { lat: load.destLat,   lng: load.destLng! }   : { address: load.destAddress },
      {
        heightMm:    truck.heightMm,
        widthMm:     truck.widthMm,
        lengthMm:    truck.lengthMm,
        // Route on actual laden weight, not the rig's max rating
        weightKg:    truck.tareWeightKg + load.weightKg,
        axleCount:   truck.axleCount,
        hazmatTypes: load.hazmatTypes,
      },
    )

    const data = {
      routeDistanceM:  result.distanceMeters,
      routeDurationS:  result.durationSeconds,
      routePolyline:   result.encodedPolyline,
      routeWarnings:   result.warnings,
      routeComputedAt: new Date(),
      // Cache geocoded endpoints from Google so re-routing skips geocoding
      ...(result.origin      && load.originLat == null ? { originLat: result.origin.lat,      originLng: result.origin.lng }      : {}),
      ...(result.destination && load.destLat   == null ? { destLat:   result.destination.lat, destLng:   result.destination.lng } : {}),
    }

    if (previewTruckId && previewTruckId !== load.truckId) {
      return { ...load, ...data, preview: true, previewTruck: truck }
    }
    const miles = (result.distanceMeters / 1609.344).toFixed(0)
    return this.prisma.load.update({
      where: { id },
      data: {
        ...data,
        events: { create: { type: 'routed', message: `Truck route computed: ${miles} mi via ${truck.name}` } },
      },
      include: LOAD_INCLUDE,
    })
  }

  // ── Driver app ──────────────────────────────────────────────────────────────
  // A driver is whoever signs in with the phone number on a truck. They see
  // that truck's current and recent loads, and can only start / deliver them.

  async driverLoads(phone: string) {
    const key = phoneKey(phone)
    if (!key) return { trucks: [], loads: [] }
    const since = new Date(Date.now() - DRIVER_HISTORY_DAYS * 86_400_000)
    const [trucks, loads] = await Promise.all([
      this.prisma.truck.findMany({ where: { driverPhoneKey: key }, orderBy: { name: 'asc' } }),
      this.prisma.load.findMany({
        where: {
          OR: [
            { truck: { driverPhoneKey: key }, status: { in: ACTIVE_LOAD_STATUSES } },
            { deliveredByKey: key, status: 'delivered', updatedAt: { gte: since } },
          ],
        },
        include: { truck: true },
        orderBy: [{ pickupAt: 'asc' }, { createdAt: 'asc' }],
      }),
    ])
    return { trucks: trucks.map(t => this.toDriverTruck(t)), loads: loads.map(l => this.toDriverLoad(l)) }
  }

  async driverLoad(phone: string, id: string) {
    return this.toDriverLoad(await this.getDriverLoad(phone, id))
  }

  async driverSetStatus(phone: string, id: string, dto: DriverStatusDto) {
    const load = await this.getDriverLoad(phone, id)
    return this.toDriverLoad(await this.applyStatus(load, dto.status, 'driver', dto.note?.trim() || undefined))
  }

  /**
   * Turn-by-turn guidance for the driver's next stop: the pickup while the
   * load is assigned, the delivery once the trip has started. Returns a
   * Routes API route token computed for this rig from where the driver is
   * now; the Navigation SDK follows it and keeps re-routes truck-legal.
   * There is deliberately no car-routing fallback.
   */
  async driverNavigation(phone: string, id: string, dto: DriverNavigationDto) {
    const load = await this.getDriverLoad(phone, id)
    if (!ACTIVE_LOAD_STATUSES.includes(load.status) || !load.truck) {
      throw new ConflictException(`Load is ${load.status.replace('_', ' ')} — nothing to navigate to`)
    }
    const leg = load.status === 'assigned' ? 'pickup' : 'delivery'
    const address = leg === 'pickup' ? load.originAddress : load.destAddress
    const truck = {
      heightMm:    load.truck.heightMm,
      widthMm:     load.truck.widthMm,
      lengthMm:    load.truck.lengthMm,
      // Heading to pickup the trailer is empty; after that it's laden
      weightKg:    load.truck.tareWeightKg + (leg === 'pickup' ? 0 : load.weightKg),
      axleCount:   load.truck.axleCount,
      // Keep hazmat restrictions on the empty leg too: residue-carrying
      // (e.g. tank) trailers stay placarded. Only ever over-restricts.
      hazmatTypes: load.hazmatTypes,
    }
    const here = { lat: dto.lat, lng: dto.lng }

    // The Navigation SDK needs the same waypoint the token was built with, so
    // pin the stop to coordinates first (geocoded by Google on first use).
    let stop = leg === 'pickup'
      ? (load.originLat != null ? { lat: load.originLat, lng: load.originLng! } : null)
      : (load.destLat   != null ? { lat: load.destLat,   lng: load.destLng! }   : null)
    if (!stop) {
      stop = (await this.routes.computeTruckRoute(here, { address }, truck)).destination
      if (!stop) throw new ConflictException(`Google couldn't locate ${address}`)
      await this.prisma.load.update({
        where: { id },
        data: leg === 'pickup' ? { originLat: stop.lat, originLng: stop.lng } : { destLat: stop.lat, destLng: stop.lng },
      })
    }

    const route = await this.routes.computeTruckRoute(here, stop, truck, { routeToken: true })
    if (!route.routeToken) throw new ConflictException('Google did not return a truck route token for this trip')
    return {
      leg,
      destination:     { ...stop, title: address },
      routeToken:      route.routeToken,
      distanceMeters:  route.distanceMeters,
      durationSeconds: route.durationSeconds,
      warnings:        route.warnings,
    }
  }

  private async getDriverLoad(phone: string, id: string) {
    const key = phoneKey(phone)
    const load = key && await this.prisma.load.findFirst({
      where: {
        id,
        OR: [
          { truck: { driverPhoneKey: key }, status: { in: ACTIVE_LOAD_STATUSES } },
          { deliveredByKey: key, status: 'delivered' },
        ],
      },
      include: LOAD_INCLUDE,
    })
    if (!load) throw new NotFoundException('Load not found')
    return load
  }

  /** What a driver may see: no rates, owner ids or dispatcher-only fields. */
  private toDriverLoad(l: any) {
    return {
      id: l.id, reference: l.reference, shipperName: l.shipperName, commodity: l.commodity,
      weightKg: l.weightKg, hazmatTypes: l.hazmatTypes, notes: l.notes, status: l.status,
      originAddress: l.originAddress, originLat: l.originLat, originLng: l.originLng,
      destAddress: l.destAddress, destLat: l.destLat, destLng: l.destLng,
      pickupAt: l.pickupAt, deliverBy: l.deliverBy,
      routeDistanceM: l.routeDistanceM, routeDurationS: l.routeDurationS,
      routePolyline: l.routePolyline, routeWarnings: l.routeWarnings,
      truck: l.truck ? this.toDriverTruck(l.truck) : null,
      ...(l.events ? { events: l.events.map((e: any) => ({ id: e.id, message: e.message, createdAt: e.createdAt })) } : {}),
    }
  }

  private toDriverTruck(t: any) {
    return {
      id: t.id, name: t.name, plate: t.plate, heightMm: t.heightMm, widthMm: t.widthMm,
      lengthMm: t.lengthMm, tareWeightKg: t.tareWeightKg, axleCount: t.axleCount, hazmatTypes: t.hazmatTypes,
    }
  }

  /** Board KPIs for the dispatcher header. */
  async summary(ownerId: string) {
    const [byStatus, trucks] = await Promise.all([
      this.prisma.load.groupBy({ by: ['status'], where: { ownerId }, _count: true, _sum: { rate: true } }),
      this.prisma.truck.groupBy({ by: ['status'], where: { ownerId }, _count: true }),
    ])
    return {
      loads:  Object.fromEntries(byStatus.map(r => [r.status, { count: r._count, revenue: r._sum.rate ?? 0 }])),
      trucks: Object.fromEntries(trucks.map(r => [r.status, r._count])),
      routingEnabled: this.routes.configured,
    }
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  private async getTruck(ownerId: string, id: string) {
    const truck = await this.prisma.truck.findFirst({ where: { id, ownerId } })
    if (!truck) throw new NotFoundException('Truck not found')
    return truck
  }

  private activeLoadFor(truckId: string) {
    return this.prisma.load.findFirst({ where: { truckId, status: { in: ACTIVE_LOAD_STATUSES } } })
  }

  private clearedRoute() {
    return { routeDistanceM: null, routeDurationS: null, routePolyline: null, routeWarnings: [], routeComputedAt: null }
  }

  private assertTare(gross: number, tare: number) {
    if (tare >= gross) throw new BadRequestException('Tare weight must be less than gross weight')
  }

  private assertWindow(pickupAt?: string, deliverBy?: string) {
    if (pickupAt && deliverBy && new Date(deliverBy) <= new Date(pickupAt)) {
      throw new BadRequestException('Delivery deadline must be after pickup')
    }
  }

  private mapUnique(e: unknown, message: string) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      return new ConflictException(message)
    }
    return e
  }
}
