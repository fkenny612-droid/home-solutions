import { Controller, Get, Post, Patch, Param, Body, Query, Req, UseGuards, ForbiddenException } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { AdminGuard } from '../../common/guards/admin.guard'
import { ProvidersService, ProviderStatus, KycStatus } from './providers.service'
import { presentProvider } from './provider-presenter'

function assertSelfOrAdmin(req: any, providerId: string) {
  if (req.user.role === 'admin') return
  if (req.user.sub === providerId) return
  throw new ForbiddenException()
}

@Controller('providers')
@UseGuards(AuthGuard('jwt'))
export class ProvidersController {
  constructor(private readonly svc: ProvidersService) {}

  @Get()
  async findAll(
    @Req() req: any,
    @Query('status') status?: ProviderStatus,
    @Query('skill')  skill?: string,
    @Query('lat')    lat?: string,
    @Query('lng')    lng?: string,
  ) {
    const providers = await this.svc.findAll(status, skill, lat ? parseFloat(lat) : undefined, lng ? parseFloat(lng) : undefined)
    return providers.map(p => presentProvider(p, req.user))
  }

  /** Admin: every provider with a payout waiting (declared before ':id' so it isn't read as a provider id). */
  @Get('payouts/pending')
  @UseGuards(AdminGuard)
  pendingPayouts() {
    return this.svc.pendingPayouts()
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req: any) {
    return presentProvider(await this.svc.findOne(id), req.user)
  }

  @Get(':id/earnings')
  earnings(@Param('id') id: string, @Req() req: any) {
    assertSelfOrAdmin(req, id)
    return this.svc.earnings(id)
  }

  @Get(':id/documents')
  getDocuments(@Param('id') id: string, @Req() req: any) {
    assertSelfOrAdmin(req, id)
    return this.svc.getDocuments(id)
  }

  @Post(':id/documents')
  uploadDocument(
    @Param('id') id: string,
    @Body() body: { type: string; fileName: string; fileUrl: string },
    @Req() req: any,
  ) {
    assertSelfOrAdmin(req, id)
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
    @Req() req: any,
  ) {
    assertSelfOrAdmin(req, id)
    return this.svc.updateHireInventory(id, inventory)
  }

  @Get(':id/reviews')
  getReviews(@Param('id') id: string) {
    return this.svc.getReviews(id)
  }

  @Post(':id/review')
  addReview(
    @Param('id') id: string,
    @Body() body: { stars: number; tags: string[]; comment?: string; bookingId?: string },
    @Req() req: any,
  ) {
    // clientId always comes from the verified JWT, never the request body
    return this.svc.addReview(id, body.stars, body.tags, body.comment, req.user.sub, body.bookingId)
  }

  /** Provider: ask to be paid out. Does not change the balance. */
  @Post(':id/payout-request')
  requestPayout(@Param('id') id: string, @Body('amount') amount: number, @Req() req: any) {
    if (req.user.sub !== id) throw new ForbiddenException()
    return this.svc.requestPayout(id, amount)
  }

  /** Admin: mark an amount as paid out (reduces the balance, closes the request). */
  @Post(':id/withdraw')
  @UseGuards(AdminGuard)
  markPaidOut(@Param('id') id: string, @Body('amount') amount: number) {
    return this.svc.markPaidOut(id, amount)
  }

  @Get(':id/bank-details')
  @UseGuards(AdminGuard)
  bankDetails(@Param('id') id: string) {
    return this.svc.getBankDetails(id)
  }

  @Patch(':id/kyc')
  @UseGuards(AdminGuard)
  updateKyc(@Param('id') id: string, @Body('status') status: KycStatus) {
    return this.svc.updateKyc(id, status)
  }

  @Patch(':id/location')
  updateLocation(@Param('id') id: string, @Body('lat') lat: number, @Body('lng') lng: number, @Req() req: any) {
    assertSelfOrAdmin(req, id)
    return this.svc.updateLocation(id, lat, lng)
  }

  @Patch(':id/service-areas')
  updateServiceAreas(@Param('id') id: string, @Body('areas') areas: string[], @Req() req: any) {
    assertSelfOrAdmin(req, id)
    return this.svc.updateServiceAreas(id, areas)
  }

  @Patch(':id/availability')
  updateAvailability(
    @Param('id') id: string,
    @Body() body: { monFri?: boolean; saturday?: boolean; sunday?: boolean; emergency?: boolean },
    @Req() req: any,
  ) {
    assertSelfOrAdmin(req, id)
    return this.svc.updateAvailability(id, body)
  }
}
