import { Controller, Get, Post, Patch, Param, Body, Query } from '@nestjs/common'
import { BookingsService } from './bookings.service'
import { BookingStatus, ServiceType } from './booking.types'

@Controller('bookings')
export class BookingsController {
  constructor(private readonly svc: BookingsService) {}

  @Get()
  findAll(@Query('status') status?: BookingStatus, @Query('serviceType') serviceType?: ServiceType) {
    return this.svc.findAll(status, serviceType)
  }

  @Get('stats')
  stats() {
    return this.svc.stats()
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.svc.findOne(id)
  }

  @Post()
  create(@Body() dto: any) {
    return this.svc.create(dto)
  }

  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body('status') status: BookingStatus) {
    return this.svc.updateStatus(id, status)
  }

  @Patch(':id/assign')
  assignProvider(@Param('id') id: string, @Body('providerId') providerId: string) {
    return this.svc.assignProvider(id, providerId)
  }
}
