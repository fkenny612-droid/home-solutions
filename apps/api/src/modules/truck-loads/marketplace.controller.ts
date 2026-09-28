import { Body, Controller, Delete, Get, Param, Post, Put, Query, Req, UseGuards } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { MarketplaceService } from './marketplace.service'
import { TRUCK_TYPES } from './applications.constants'
import { HAZMAT_TYPES } from './google-routes.service'
import { BidDto, CreateShipmentDto, ShipperProfileDto } from './truck-loads.dto'

/** Shipper portal: post shipments, compare bids, award. */
@Controller('truck-loads/shipper')
@UseGuards(AuthGuard('jwt'))
export class ShipperController {
  constructor(private readonly svc: MarketplaceService) {}

  @Get('profile')
  async profile(@Req() req: any) {
    return { profile: await this.svc.getShipperProfile(req.user.sub), truckTypes: TRUCK_TYPES, hazmatTypes: HAZMAT_TYPES }
  }

  @Put('profile')
  saveProfile(@Req() req: any, @Body() dto: ShipperProfileDto) {
    return this.svc.saveShipperProfile(req.user.sub, dto)
  }

  @Get('shipments')
  list(@Req() req: any) {
    return this.svc.shipperShipments(req.user.sub)
  }

  @Post('shipments')
  create(@Req() req: any, @Body() dto: CreateShipmentDto) {
    return this.svc.createShipment(req.user.sub, dto)
  }

  @Get('shipments/:id')
  get(@Req() req: any, @Param('id') id: string) {
    return this.svc.shipperShipment(req.user.sub, id)
  }

  @Post('shipments/:id/bids/:bidId/accept')
  accept(@Req() req: any, @Param('id') id: string, @Param('bidId') bidId: string) {
    return this.svc.acceptBid(req.user.sub, id, bidId)
  }

  @Post('shipments/:id/pay')
  pay(@Req() req: any, @Param('id') id: string) {
    return this.svc.payNow(req.user.sub, id)
  }

  @Post('shipments/:id/change-carrier')
  changeCarrier(@Req() req: any, @Param('id') id: string) {
    return this.svc.changeCarrier(req.user.sub, id)
  }

  @Post('shipments/:id/cancel')
  cancel(@Req() req: any, @Param('id') id: string) {
    return this.svc.cancelShipment(req.user.sub, id)
  }
}

/** Carrier side of the marketplace: the load board and bids. */
@Controller('truck-loads/market')
@UseGuards(AuthGuard('jwt'))
export class MarketController {
  constructor(private readonly svc: MarketplaceService) {}

  @Get('shipments')
  board(@Req() req: any, @Query('q') q?: string) {
    return this.svc.board(req.user.sub, q?.trim() || undefined)
  }

  @Post('shipments/:id/bids')
  bid(@Req() req: any, @Param('id') id: string, @Body() dto: BidDto) {
    return this.svc.placeBid(req.user.sub, id, dto)
  }

  @Delete('shipments/:id/bids')
  withdraw(@Req() req: any, @Param('id') id: string) {
    return this.svc.withdrawBid(req.user.sub, id)
  }

  @Get('bids')
  myBids(@Req() req: any) {
    return this.svc.myBids(req.user.sub)
  }
}
