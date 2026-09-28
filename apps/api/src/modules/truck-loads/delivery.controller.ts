import { Body, Controller, Get, Param, Post, Req, Res, UploadedFiles, UseGuards, UseInterceptors } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { AnyFilesInterceptor } from '@nestjs/platform-express'
import { DeliveryService, MAX_POD_PHOTOS } from './delivery.service'
import { TruckLoadsService } from './truck-loads.service'
import { sendDocument, UploadedDoc } from './documents.util'
import { MAX_FILE_BYTES } from './applications.constants'
import { LocationDto, RatingDto } from './truck-loads.dto'

const podUpload = AnyFilesInterceptor({ limits: { fileSize: MAX_FILE_BYTES, files: MAX_POD_PHOTOS, fields: 2 } })

/** Driver app: deliver with proof, report position. */
@Controller('truck-loads/driver/loads')
@UseGuards(AuthGuard('jwt'))
export class DriverDeliveryController {
  constructor(private loads: TruckLoadsService, private delivery: DeliveryService) {}

  /** multipart: `data` = { receiverName, note?, lat?, lng?, accuracyM? }, `photos` = up to 3 images/PDFs */
  @Post(':id/deliver')
  @UseInterceptors(podUpload)
  deliver(@Req() req: any, @Param('id') id: string, @Body('data') data: string, @UploadedFiles() files: UploadedDoc[] = []) {
    return this.loads.deliver({ driverPhone: req.user.phone }, id, data, files)
  }

  @Post(':id/location')
  location(@Req() req: any, @Param('id') id: string, @Body() dto: LocationDto) {
    return this.delivery.reportLocation(req.user.phone, id, dto)
  }
}

/** Dispatcher (carrier): deliver on the driver's behalf, view POD and tracking. */
@Controller('truck-loads/loads')
@UseGuards(AuthGuard('jwt'))
export class CarrierDeliveryController {
  constructor(private loads: TruckLoadsService, private delivery: DeliveryService) {}

  @Post(':id/deliver')
  @UseInterceptors(podUpload)
  deliver(@Req() req: any, @Param('id') id: string, @Body('data') data: string, @UploadedFiles() files: UploadedDoc[] = []) {
    return this.loads.deliver({ ownerId: req.user.sub }, id, data, files)
  }

  @Get(':id/pod')
  pod(@Req() req: any, @Param('id') id: string) {
    return this.delivery.podForCarrier(req.user.sub, id)
  }

  @Get(':id/pod/photos/:photoId')
  async photo(@Req() req: any, @Param('id') id: string, @Param('photoId') photoId: string, @Res() res: any) {
    sendDocument(res, await this.delivery.podPhoto({ ownerId: req.user.sub }, id, photoId))
  }
}

/** Shipper: POD, tracking and rating the carrier. */
@Controller('truck-loads/shipper/shipments')
@UseGuards(AuthGuard('jwt'))
export class ShipperDeliveryController {
  constructor(private delivery: DeliveryService) {}

  @Get(':id/pod')
  pod(@Req() req: any, @Param('id') id: string) {
    return this.delivery.podForShipper(req.user.sub, id)
  }

  @Get(':id/pod/photos/:photoId')
  async photo(@Req() req: any, @Param('id') id: string, @Param('photoId') photoId: string, @Res() res: any) {
    sendDocument(res, await this.delivery.podPhoto({ shipperId: req.user.sub }, id, photoId))
  }

  @Get(':id/tracking')
  tracking(@Req() req: any, @Param('id') id: string) {
    return this.delivery.trackingForShipper(req.user.sub, id)
  }

  @Post(':id/rating')
  rate(@Req() req: any, @Param('id') id: string, @Body() dto: RatingDto) {
    return this.delivery.rate(req.user.sub, id, 'shipper_rates_carrier', dto)
  }
}

/** Carrier rates the shipper after a marketplace delivery. */
@Controller('truck-loads/market/shipments')
@UseGuards(AuthGuard('jwt'))
export class CarrierRatingController {
  constructor(private delivery: DeliveryService) {}

  @Post(':id/rating')
  rate(@Req() req: any, @Param('id') id: string, @Body() dto: RatingDto) {
    return this.delivery.rate(req.user.sub, id, 'carrier_rates_shipper', dto)
  }
}

/** Public tracking link for the consignee — no login. */
@Controller('truck-loads/track')
export class PublicTrackingController {
  constructor(private delivery: DeliveryService) {}

  @Get(':token')
  track(@Param('token') token: string) {
    return this.delivery.publicTracking(token)
  }
}
