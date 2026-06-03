import { Controller, Get, Patch, Param, Body, Query } from '@nestjs/common'
import { ProvidersService, ProviderStatus, KycStatus } from './providers.service'

@Controller('providers')
export class ProvidersController {
  constructor(private readonly svc: ProvidersService) {}

  @Get()
  findAll(@Query('status') status?: ProviderStatus, @Query('skill') skill?: string) {
    return this.svc.findAll(status, skill)
  }

  @Get('nearby')
  findNearby(@Query('serviceType') serviceType: string, @Query('lat') lat: string, @Query('lng') lng: string) {
    return this.svc.findNearby(serviceType, parseFloat(lat), parseFloat(lng))
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.svc.findOne(id)
  }

  @Get(':id/earnings')
  earnings(@Param('id') id: string) {
    return this.svc.earnings(id)
  }

  @Patch(':id/kyc')
  updateKyc(@Param('id') id: string, @Body('status') status: KycStatus) {
    return this.svc.updateKyc(id, status)
  }

  @Patch(':id/location')
  updateLocation(@Param('id') id: string, @Body('lat') lat: number, @Body('lng') lng: number) {
    return this.svc.updateLocation(id, lat, lng)
  }
}
