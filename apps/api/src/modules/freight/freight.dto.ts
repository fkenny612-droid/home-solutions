import { PartialType } from '@nestjs/mapped-types'
import {
  ArrayUnique, IsArray, IsDateString, IsIn, IsInt, IsNumber, IsOptional, IsString,
  Max, MaxLength, Min, MinLength,
} from 'class-validator'
import { HAZMAT_TYPES } from './google-routes.service'

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
