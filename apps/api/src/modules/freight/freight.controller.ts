import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { FreightService } from './freight.service'
import { HAZMAT_TYPES } from './google-routes.service'
import {
  AssignLoadDto, CreateLoadDto, CreateTruckDto, LoadStatusDto, UpdateLoadDto, UpdateTruckDto,
} from './freight.dto'

/** Truck load management. All data is scoped to the signed-in dispatcher. */
@Controller('freight')
@UseGuards(AuthGuard('jwt'))
export class FreightController {
  constructor(private readonly svc: FreightService) {}

  @Get('summary')
  summary(@Req() req: any) {
    return this.svc.summary(req.user.sub)
  }

  @Get('hazmat-types')
  hazmatTypes() {
    return HAZMAT_TYPES
  }

  // ── Trucks ──
  @Get('trucks')
  listTrucks(@Req() req: any) {
    return this.svc.listTrucks(req.user.sub)
  }

  @Post('trucks')
  createTruck(@Req() req: any, @Body() dto: CreateTruckDto) {
    return this.svc.createTruck(req.user.sub, dto)
  }

  @Patch('trucks/:id')
  updateTruck(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateTruckDto) {
    return this.svc.updateTruck(req.user.sub, id, dto)
  }

  @Delete('trucks/:id')
  deleteTruck(@Req() req: any, @Param('id') id: string) {
    return this.svc.deleteTruck(req.user.sub, id)
  }

  // ── Loads ──
  @Get('loads')
  listLoads(@Req() req: any, @Query('status') status?: string) {
    return this.svc.listLoads(req.user.sub, status)
  }

  @Get('loads/:id')
  getLoad(@Req() req: any, @Param('id') id: string) {
    return this.svc.getLoad(req.user.sub, id)
  }

  @Post('loads')
  createLoad(@Req() req: any, @Body() dto: CreateLoadDto) {
    return this.svc.createLoad(req.user.sub, dto)
  }

  @Patch('loads/:id')
  updateLoad(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateLoadDto) {
    return this.svc.updateLoad(req.user.sub, id, dto)
  }

  @Post('loads/:id/assign')
  assign(@Req() req: any, @Param('id') id: string, @Body() dto: AssignLoadDto) {
    return this.svc.assign(req.user.sub, id, dto)
  }

  @Post('loads/:id/unassign')
  unassign(@Req() req: any, @Param('id') id: string) {
    return this.svc.unassign(req.user.sub, id)
  }

  @Post('loads/:id/status')
  setStatus(@Req() req: any, @Param('id') id: string, @Body() dto: LoadStatusDto) {
    return this.svc.setStatus(req.user.sub, id, dto)
  }

  /** Compute a truck-legal route via Google. ?truckId= previews with another rig. */
  @Post('loads/:id/route')
  route(@Req() req: any, @Param('id') id: string, @Query('truckId') truckId?: string) {
    return this.svc.route(req.user.sub, id, truckId)
  }
}
