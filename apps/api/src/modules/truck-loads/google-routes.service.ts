import { BadGatewayException, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common'

/**
 * Thin client for Google Maps Platform Routes API with Large Vehicle Routing
 * (travelMode TRUCK). Truck routing avoids low bridges, weight/length limits
 * and hazmat-restricted roads based on the vehicle attributes we send.
 *
 * Coverage (as of launch): contiguous US 48 states GA, Japan experimental.
 * Requests outside coverage come back as a normal (non-truck-aware) route or
 * an error — surface Google's warnings to the dispatcher either way.
 *
 * Requires GOOGLE_MAPS_API_KEY (server-side key with Routes API enabled).
 */

const ENDPOINT = 'https://routes.googleapis.com/directions/v2:computeRoutes'

const FIELD_MASK = [
  'routes.distanceMeters',
  'routes.duration',
  'routes.polyline.encodedPolyline',
  'routes.warnings',
  'routes.legs.startLocation',
  'routes.legs.endLocation',
].join(',')

/** Hazmat categories accepted by vehicleInfo.hazardousGoodsTypes. */
export const HAZMAT_TYPES = [
  'EXPLOSIVE',
  'GAS',
  'FLAMMABLE',
  'COMBUSTIBLE',
  'ORGANIC',
  'POISON',
  'CORROSIVE',
  'POISONOUS_INHALATION',
  'HARMFUL_TO_WATER',
  'OTHER',
] as const
export type HazmatType = (typeof HAZMAT_TYPES)[number]

export interface TruckProfile {
  heightMm:    number
  widthMm:     number
  lengthMm:    number
  weightKg:    number
  axleCount:   number
  hazmatTypes: string[]
}

export type Waypoint = { address: string } | { lat: number; lng: number }

export interface TruckRoute {
  distanceMeters: number
  durationSeconds: number
  encodedPolyline: string
  warnings: string[]
  origin:      { lat: number; lng: number } | null
  destination: { lat: number; lng: number } | null
}

function toGoogleWaypoint(w: Waypoint) {
  if ('address' in w) return { address: w.address }
  return { location: { latLng: { latitude: w.lat, longitude: w.lng } } }
}

function toLatLng(loc: any): { lat: number; lng: number } | null {
  const ll = loc?.latLng
  return ll ? { lat: ll.latitude, lng: ll.longitude } : null
}

@Injectable()
export class GoogleRoutesService {
  private readonly log = new Logger(GoogleRoutesService.name)

  get configured() {
    return !!process.env.GOOGLE_MAPS_API_KEY
  }

  async computeTruckRoute(origin: Waypoint, destination: Waypoint, truck: TruckProfile): Promise<TruckRoute> {
    const key = process.env.GOOGLE_MAPS_API_KEY
    if (!key) throw new ServiceUnavailableException('GOOGLE_MAPS_API_KEY is not configured')

    const body = {
      origin:      toGoogleWaypoint(origin),
      destination: toGoogleWaypoint(destination),
      travelMode:  'TRUCK',
      routeModifiers: {
        vehicleInfo: {
          totalHeightMm:  truck.heightMm,
          totalWidthMm:   truck.widthMm,
          totalLengthMm:  truck.lengthMm,
          totalWeightKg:  truck.weightKg,
          totalAxleCount: truck.axleCount,
          ...(truck.hazmatTypes.length ? { hazardousGoodsTypes: truck.hazmatTypes } : {}),
        },
      },
      units: 'IMPERIAL',
    }

    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type':     'application/json',
        'X-Goog-Api-Key':   key,
        'X-Goog-FieldMask': FIELD_MASK,
      },
      body: JSON.stringify(body),
    })

    const json: any = await res.json().catch(() => ({}))
    if (!res.ok) {
      const msg = json?.error?.message ?? `HTTP ${res.status}`
      this.log.warn(`computeRoutes failed: ${msg}`)
      throw new BadGatewayException(`Google Routes API: ${msg}`)
    }

    const route = json.routes?.[0]
    if (!route) throw new BadGatewayException('Google Routes API returned no truck-legal route')

    const legs = route.legs ?? []
    return {
      distanceMeters:  route.distanceMeters ?? 0,
      // duration is a protobuf Duration string, e.g. "12345s"
      durationSeconds: parseInt(String(route.duration ?? '0').replace(/s$/, ''), 10) || 0,
      encodedPolyline: route.polyline?.encodedPolyline ?? '',
      warnings:        route.warnings ?? [],
      origin:          toLatLng(legs[0]?.startLocation),
      destination:     toLatLng(legs[legs.length - 1]?.endLocation),
    }
  }
}
