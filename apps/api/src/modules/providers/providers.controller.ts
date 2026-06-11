import { Controller, Get, Post, Patch, Param, Body, Query } from '@nestjs/common'
import { ProvidersService, ProviderStatus, KycStatus } from './providers.service'

@Controller('providers')
export class ProvidersController {
  constructor(private readonly svc: ProvidersService) {}

  @Get()
  findAll(
    @Query('status') status?: ProviderStatus,
    @Query('skill')  skill?: string,
    @Query('lat')    lat?: string,
    @Query('lng')    lng?: string,
  ) {
    return this.svc.findAll(status, skill, lat ? parseFloat(lat) : undefined, lng ? parseFloat(lng) : undefined)
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.svc.findOne(id)
  }

  @Get(':id/earnings')
  earnings(@Param('id') id: string) {
    return this.svc.earnings(id)
  }

  @Get(':id/documents')
  getDocuments(@Param('id') id: string) {
    return this.svc.getDocuments(id)
  }

  @Post(':id/documents')
  uploadDocument(
    @Param('id') id: string,
    @Body() body: { type: string; fileName: string; fileUrl: string },
  ) {
    return this.svc.saveDocument(id, body.type, body.fileName, body.fileUrl)
  }

  @Get(':id/hire-inventory')
  getHireInventory(@Param('id') id: string) {
    return this.svc.getHireInventory(id)
  }

  @Patch(':id/hire-inventory')
  updateHireInventory(
    @Param('id') id: string,
    @Body() inventory: Record<string, Record<string, number>>,
  ) {
    return this.svc.updateHireInventory(id, inventory)
  }

  @Get(':id/reviews')
  getReviews(@Param('id') id: string) {
    return this.svc.getReviews(id)
  }

  @Post(':id/review')
  addReview(
    @Param('id') id: string,
    @Body() body: { stars: number; tags: string[]; comment?: string; clientId?: string; bookingId?: string },
  ) {
    return this.svc.addReview(id, body.stars, body.tags, body.comment, body.clientId, body.bookingId)
  }

  @Post(':id/withdraw')
  requestWithdrawal(@Param('id') id: string, @Body('amount') amount: number) {
    return this.svc.requestWithdrawal(id, amount)
  }

  @Patch(':id/kyc')
  updateKyc(@Param('id') id: string, @Body('status') status: KycStatus) {
    return this.svc.updateKyc(id, status)
  }

  @Patch(':id/location')
  updateLocation(@Param('id') id: string, @Body('lat') lat: number, @Body('lng') lng: number) {
    return this.svc.updateLocation(id, lat, lng)
  }

  @Patch(':id/service-areas')
  updateServiceAreas(@Param('id') id: string, @Body('areas') areas: string[]) {
    return this.svc.updateServiceAreas(id, areas)
  }

  @Patch(':id/availability')
  updateAvailability(
    @Param('id') id: string,
    @Body() body: { monFri?: boolean; saturday?: boolean; sunday?: boolean; emergency?: boolean },
  ) {
    return this.svc.updateAvailability(id, body)
  }
}
