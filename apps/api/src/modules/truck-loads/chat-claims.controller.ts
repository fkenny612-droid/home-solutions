import { Body, Controller, Get, Param, Post, Query, Req, Res, UploadedFiles, UseGuards, UseInterceptors } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { AnyFilesInterceptor } from '@nestjs/platform-express'
import { IsString, MaxLength, MinLength } from 'class-validator'
import { AdminGuard } from '../../common/guards/admin.guard'
import { ChatService } from './chat.service'
import { ClaimsService, MAX_CLAIM_PHOTOS } from './claims.service'
import { sendDocument, UploadedDoc } from './documents.util'
import { MAX_FILE_BYTES } from './applications.constants'
import { ClaimResponseDto, MessageDto, ResolveClaimDto, ShipperMessageDto } from './truck-loads.dto'

const claimUpload = AnyFilesInterceptor({ limits: { fileSize: MAX_FILE_BYTES, files: MAX_CLAIM_PHOTOS, fields: 2 } })
class ReferenceDto { @IsString() @MinLength(2) @MaxLength(100) reference: string }

/** Shipper: talk to bidders / the carrier, report a problem after delivery. */
@Controller('truck-loads/shipper/shipments')
@UseGuards(AuthGuard('jwt'))
export class ShipperChatClaimsController {
  constructor(private chat: ChatService, private claims: ClaimsService) {}

  @Get(':id/messages')
  messages(@Req() req: any, @Param('id') id: string, @Query('carrierId') carrierId: string) {
    return this.chat.shipperMessages(req.user.sub, id, carrierId ?? '')
  }

  @Post(':id/messages')
  send(@Req() req: any, @Param('id') id: string, @Body() dto: ShipperMessageDto) {
    return this.chat.shipperSend(req.user.sub, id, dto.carrierId, dto.body)
  }

  @Get(':id/claims')
  listClaims(@Req() req: any, @Param('id') id: string) {
    return this.claims.forShipper(req.user.sub, id)
  }

  /** multipart: `data` = { type, description, amountClaimed? }, `photos` = up to 5 images/PDFs */
  @Post(':id/claims')
  @UseInterceptors(claimUpload)
  raise(@Req() req: any, @Param('id') id: string, @Body('data') data: string, @UploadedFiles() files: UploadedDoc[] = []) {
    return this.claims.raise(req.user.sub, id, data, files)
  }

  @Get(':id/claims/:claimId/photos/:photoId')
  async photo(@Req() req: any, @Param('claimId') claimId: string, @Param('photoId') photoId: string, @Res() res: any) {
    sendDocument(res, await this.claims.photo({ shipperId: req.user.sub }, claimId, photoId))
  }
}

/** Carrier: talk to the shipper, see and answer claims. */
@Controller('truck-loads/market')
@UseGuards(AuthGuard('jwt'))
export class CarrierChatClaimsController {
  constructor(private chat: ChatService, private claims: ClaimsService) {}

  @Get('shipments/:id/messages')
  messages(@Req() req: any, @Param('id') id: string) {
    return this.chat.carrierMessages(req.user.sub, id)
  }

  @Post('shipments/:id/messages')
  send(@Req() req: any, @Param('id') id: string, @Body() dto: MessageDto) {
    return this.chat.carrierSend(req.user.sub, id, dto.body)
  }

  @Get('shipments/:id/claims')
  listClaims(@Req() req: any, @Param('id') id: string) {
    return this.claims.forCarrier(req.user.sub, id)
  }

  @Post('claims/:claimId/response')
  respond(@Req() req: any, @Param('claimId') claimId: string, @Body() dto: ClaimResponseDto) {
    return this.claims.respond(req.user.sub, claimId, dto.response)
  }

  @Get('claims/:claimId/photos/:photoId')
  async photo(@Req() req: any, @Param('claimId') claimId: string, @Param('photoId') photoId: string, @Res() res: any) {
    sendDocument(res, await this.claims.photo({ carrierId: req.user.sub }, claimId, photoId))
  }
}

/** Platform admin: decide claims and settle split refunds. */
@Controller('truck-loads/admin/claims')
@UseGuards(AuthGuard('jwt'), AdminGuard)
export class ClaimsAdminController {
  constructor(private claims: ClaimsService) {}

  @Get()
  list(@Query('status') status?: string) {
    return this.claims.adminList(status || undefined)
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.claims.adminGet(id)
  }

  @Post(':id/resolve')
  resolve(@Param('id') id: string, @Body() dto: ResolveClaimDto) {
    return this.claims.resolve(id, dto)
  }

  @Post(':id/refunded')
  refunded(@Param('id') id: string, @Body() dto: ReferenceDto) {
    return this.claims.adminRefunded(id, dto.reference.trim())
  }

  @Get(':id/photos/:photoId')
  async photo(@Param('id') id: string, @Param('photoId') photoId: string, @Res() res: any) {
    sendDocument(res, await this.claims.photo({ admin: true }, id, photoId))
  }

  @Get(':id/pod-photos/:photoId')
  async podPhoto(@Param('id') id: string, @Param('photoId') photoId: string, @Res() res: any) {
    sendDocument(res, await this.claims.adminPodPhoto(id, photoId))
  }
}
