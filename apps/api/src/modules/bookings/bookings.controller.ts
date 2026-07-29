import { Controller, Get, Post, Patch, Param, Body, Query, Req, UseGuards } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { AdminGuard } from '../../common/guards/admin.guard'
import { BookingsService } from './bookings.service'
import { BookingStatus, ServiceType } from './booking.types'

@Controller('bookings')
@UseGuards(AuthGuard('jwt'))
export class BookingsController {
  constructor(private readonly svc: BookingsService) {}

  @Get()
  findAll(@Req() req: any, @Query('status') status?: BookingStatus, @Query('serviceType') serviceType?: ServiceType) {
    return this.svc.findAll(req.user, status, serviceType)
  }

  @Get('stats')
  @UseGuards(AdminGuard)
  stats() {
    return this.svc.stats()
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: any) {
    return this.svc.findOne(id, req.user)
  }

  @Post()
  create(@Req() req: any, @Body() dto: any) {
    return this.svc.create(req.user, dto)
  }

  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body('status') status: BookingStatus, @Req() req: any) {
    return this.svc.updateStatus(id, status, req.user)
  }

  @Patch(':id/assign')
  assignProvider(@Param('id') id: string, @Body('providerId') providerId: string, @Req() req: any) {
    return this.svc.assignProvider(id, providerId, req.user)
  }
}
