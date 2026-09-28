import {
  Body, Controller, Get, Param, Post, Put, Query, Req, Res, UploadedFile, UseGuards, UseInterceptors,
} from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { FileInterceptor } from '@nestjs/platform-express'
import { AdminGuard } from '../../common/guards/admin.guard'
import { CarrierService } from './carrier.service'
import { sendDocument, UploadedDoc } from './documents.util'
import { MAX_FILE_BYTES } from './applications.constants'
import { CarrierProfileDto, ReviewNoteDto } from './truck-loads.dto'

/** Carrier (fleet owner): company profile, verification and compliance. */
@Controller('truck-loads')
@UseGuards(AuthGuard('jwt'))
export class CarrierController {
  constructor(private readonly svc: CarrierService) {}

  @Get('carrier-profile')
  profile(@Req() req: any) {
    return this.svc.getProfile(req.user.sub)
  }

  @Put('carrier-profile')
  save(@Req() req: any, @Body() dto: CarrierProfileDto) {
    return this.svc.saveProfile(req.user.sub, dto)
  }

  /** multipart: `file` + optional `expiresAt` (YYYY-MM-DD) */
  @Post('carrier-profile/documents/:kind')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_FILE_BYTES, files: 1, fields: 2 } }))
  upload(@Req() req: any, @Param('kind') kind: string, @UploadedFile() file: UploadedDoc, @Body('expiresAt') expiresAt?: string) {
    return this.svc.uploadDocument(req.user.sub, kind, file, expiresAt)
  }

  @Get('carrier-profile/documents/:docId')
  async document(@Req() req: any, @Param('docId') docId: string, @Res() res: any) {
    sendDocument(res, await this.svc.document(req.user.sub, docId))
  }

  @Post('carrier-profile/submit')
  submit(@Req() req: any) {
    return this.svc.submitForVerification(req.user.sub)
  }

  @Get('compliance')
  compliance(@Req() req: any) {
    return this.svc.compliance(req.user.sub)
  }
}

/** Platform admin: verify carriers (role "admin"). */
@Controller('truck-loads/admin')
@UseGuards(AuthGuard('jwt'), AdminGuard)
export class CarrierAdminController {
  constructor(private readonly svc: CarrierService) {}

  @Get('carriers')
  list(@Query('status') status?: string) {
    return this.svc.adminList(status)
  }

  @Get('carriers/:id')
  get(@Param('id') id: string) {
    return this.svc.adminGet(id)
  }

  @Get('carriers/:id/documents/:docId')
  async document(@Param('id') id: string, @Param('docId') docId: string, @Res() res: any) {
    sendDocument(res, await this.svc.adminDocument(id, docId))
  }

  @Post('carriers/:id/verify')
  verify(@Param('id') id: string) {
    return this.svc.adminVerify(id)
  }

  @Post('carriers/:id/reject')
  reject(@Param('id') id: string, @Body() dto: ReviewNoteDto) {
    return this.svc.adminReject(id, dto)
  }
}
