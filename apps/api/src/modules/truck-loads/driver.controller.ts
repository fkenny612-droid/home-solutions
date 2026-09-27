import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { TruckLoadsService } from './truck-loads.service'
import { DriverStatusDto } from './truck-loads.dto'

/**
 * Driver side of Truck Loads. Scoped by the signed-in phone number, not by
 * dispatcher ownership — drivers only see loads on trucks listing their phone.
 */
@Controller('truck-loads/driver')
@UseGuards(AuthGuard('jwt'))
export class DriverController {
  constructor(private readonly svc: TruckLoadsService) {}

  @Get('loads')
  loads(@Req() req: any) {
    return this.svc.driverLoads(req.user.phone)
  }

  @Get('loads/:id')
  load(@Req() req: any, @Param('id') id: string) {
    return this.svc.driverLoad(req.user.phone, id)
  }

  @Post('loads/:id/status')
  setStatus(@Req() req: any, @Param('id') id: string, @Body() dto: DriverStatusDto) {
    return this.svc.driverSetStatus(req.user.phone, id, dto)
  }
}
