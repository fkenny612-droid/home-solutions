import { PartialType } from '@nestjs/mapped-types'
import {
  ArrayUnique, Equals, IsArray, IsDateString, IsEmail, IsIn, IsInt, IsNumber, IsOptional, IsString,
  Matches, Max, MaxLength, Min, MinLength,
} from 'class-validator'
import { HAZMAT_TYPES } from './google-routes.service'
import { LICENCE_CODES, TRUCK_TYPES } from './applications.constants'

export const TRUCK_STATUSES = ['available', 'on_load', 'out_of_service'] as const
export const LOAD_STATUSES  = ['booked', 'assigned', 'in_transit', 'delivered', 'cancelled'] as const
export type LoadStatus = (typeof LOAD_STATUSES)[number]

export class CreateTruckDto {
  @IsString() @MinLength(1) @MaxLength(80)  name: string
  @IsString() @MinLength(1) @MaxLength(20)  plate: string
  @IsOptional() @IsString() @MaxLength(80)  driverName?: string
  @IsOptional() @IsString() @MaxLength(30)  driverPhone?: string
  @IsInt() @Min(1000)  @Max(6000)   heightMm: number
  @IsInt() @Min(1000)  @Max(4000)   widthMm: number
  @IsInt() @Min(3000)  @Max(40000)  lengthMm: number
  @IsInt() @Min(1000)  @Max(100000) grossWeightKg: number
  @IsInt() @Min(500)   @Max(60000)  tareWeightKg: number
  @IsInt() @Min(2)     @Max(12)     axleCount: number
  @IsOptional() @IsArray() @ArrayUnique() @IsIn(HAZMAT_TYPES, { each: true }) hazmatTypes?: string[]
  // Compliance expiry dates (YYYY-MM-DD); null clears
  @IsOptional() @IsDateString() licenceDiscExpiry?: string | null
  @IsOptional() @IsDateString() roadworthyExpiry?: string | null
  @IsOptional() @IsDateString() insuranceExpiry?: string | null
  @IsOptional() @IsDateString() driverLicenceExpiry?: string | null
  @IsOptional() @IsDateString() driverPrdpExpiry?: string | null
}

/** Expiry fields as Dates for Prisma (date-only strings aren't valid DateTimes). */
export const TRUCK_EXPIRY_FIELDS = [
  'licenceDiscExpiry', 'roadworthyExpiry', 'insuranceExpiry', 'driverLicenceExpiry', 'driverPrdpExpiry',
] as const
export function withExpiryDates<T extends Partial<Record<(typeof TRUCK_EXPIRY_FIELDS)[number], string | null>>>(dto: T) {
  const out: any = { ...dto }
  for (const k of TRUCK_EXPIRY_FIELDS) {
    if (k in dto) out[k] = dto[k] ? new Date(dto[k] as string) : null
  }
  return out
}

export class UpdateTruckDto extends PartialType(CreateTruckDto) {
  @IsOptional() @IsIn(TRUCK_STATUSES) status?: string
}

export class CreateLoadDto {
  @IsString() @MinLength(1) @MaxLength(40)   reference: string
  @IsString() @MinLength(1) @MaxLength(120)  shipperName: string
  @IsString() @MinLength(1) @MaxLength(120)  commodity: string
  @IsInt() @Min(1) @Max(60000)               weightKg: number
  @IsOptional() @IsArray() @ArrayUnique() @IsIn(HAZMAT_TYPES, { each: true }) hazmatTypes?: string[]
  @IsOptional() @IsNumber() @Min(0)          rate?: number
  @IsString() @MinLength(3) @MaxLength(300)  originAddress: string
  @IsString() @MinLength(3) @MaxLength(300)  destAddress: string
  @IsOptional() @IsDateString()              pickupAt?: string
  @IsOptional() @IsDateString()              deliverBy?: string
  @IsOptional() @IsString() @MaxLength(2000) notes?: string
}

export class UpdateLoadDto extends PartialType(CreateLoadDto) {}

export class AssignLoadDto {
  @IsString() truckId: string
}

export class LoadStatusDto {
  @IsIn(['in_transit', 'delivered', 'cancelled']) status: LoadStatus
}

export class DriverStatusDto {
  @IsIn(['in_transit', 'delivered']) status: 'in_transit' | 'delivered'
  @IsOptional() @IsString() @MaxLength(500) note?: string
}

/** The driver's current position, where turn-by-turn guidance starts from. */
export class DriverNavigationDto {
  @IsNumber() @Min(-90)  @Max(90)  lat: number
  @IsNumber() @Min(-180) @Max(180) lng: number
}

// ── Applications (public form) ────────────────────────────────────────────────

const PHONE = /^\+?[0-9 ()-]{9,20}$/

export class ApplicationDto {
  // Company / contact
  @IsOptional() @IsString() @MaxLength(120) companyName?: string
  @IsString() @MinLength(2) @MaxLength(120) contactName: string
  @Matches(PHONE, { message: 'contactPhone must be a valid phone number' }) contactPhone: string
  @IsOptional() @IsEmail() @MaxLength(160) contactEmail?: string

  // Driver
  @IsString() @MinLength(2) @MaxLength(120) driverName: string
  @Matches(PHONE, { message: 'driverPhone must be a valid phone number' }) driverPhone: string
  @IsString() @Matches(/^[A-Za-z0-9]{6,20}$/, { message: 'driverIdNumber must be an SA ID or passport number' }) driverIdNumber: string
  @IsIn(LICENCE_CODES) licenceCode: string
  @IsDateString() licenceExpiry: string
  @IsDateString() prdpExpiry: string
  @IsString() @MinLength(8) @MaxLength(100) password: string
  // Optional vehicle document expiries (entered next to the uploads)
  @IsOptional() @IsDateString() discExpiry?: string
  @IsOptional() @IsDateString() roadworthyExpiry?: string
  @IsOptional() @IsDateString() insuranceExpiry?: string

  // Truck
  @IsIn(TRUCK_TYPES) truckType: string
  @IsString() @MinLength(1) @MaxLength(60) make: string
  @IsOptional() @IsString() @MaxLength(60) model?: string
  @IsOptional() @IsInt() @Min(1970) @Max(2100) year?: number
  @IsString() @MinLength(1) @MaxLength(20) plate: string
  @IsOptional() @IsString() @MaxLength(30) vin?: string
  @IsInt() @Min(1000)  @Max(6000)   heightMm: number
  @IsInt() @Min(1000)  @Max(4000)   widthMm: number
  @IsInt() @Min(3000)  @Max(40000)  lengthMm: number
  @IsInt() @Min(1000)  @Max(100000) grossWeightKg: number
  @IsInt() @Min(500)   @Max(60000)  tareWeightKg: number
  @IsInt() @Min(2)     @Max(12)     axleCount: number
  @IsOptional() @IsArray() @ArrayUnique() @IsIn(HAZMAT_TYPES, { each: true }) hazmatTypes?: string[]

  /** POPIA: consent to process the personal information in this application */
  @Equals(true, { message: 'You must agree to the processing of this information' }) consent: boolean
}

export class RejectApplicationDto {
  @IsOptional() @IsString() @MaxLength(500) note?: string
}

// ── Carrier company profile ──────────────────────────────────────────────────

export class CarrierProfileDto {
  @IsString() @MinLength(2) @MaxLength(120) companyName: string
  @IsString() @MinLength(4) @MaxLength(30) registrationNumber: string
  @IsOptional() @IsString() @MaxLength(20) vatNumber?: string
  @IsString() @MinLength(2) @MaxLength(120) contactName: string
  @Matches(PHONE, { message: 'contactPhone must be a valid phone number' }) contactPhone: string
  @IsOptional() @IsEmail() @MaxLength(160) contactEmail?: string
  @IsOptional() @IsString() @MaxLength(300) address?: string
}

export class ReviewNoteDto {
  @IsOptional() @IsString() @MaxLength(500) note?: string
}
