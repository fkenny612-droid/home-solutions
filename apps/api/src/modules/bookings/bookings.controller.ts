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

  /** Admin: re-run the payment side of a booking (capture a completed job, void a cancelled one). Safe to repeat. */
  @Post(':id/reconcile-payment')
  @UseGuards(AdminGuard)
  reconcilePayment(@Param('id') id: string) {
    return this.svc.reconcilePayment(id)
  }

  /** A provider turns down a job requested from them — cancels it and returns the customer's payment. */
  @Post(':id/decline')
  declineJob(@Param('id') id: string, @Req() req: any) {
    return this.svc.declineJob(id, req.user)
  }

  @Patch(':id/assign')
  assignProvider(@Param('id') id: string, @Body('providerId') providerId: string, @Req() req: any) {
    return this.svc.assignProvider(id, providerId, req.user)
  }
}
