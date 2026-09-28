import {
  Body, Controller, Get, HttpException, HttpStatus, Param, Post, Query, Req, Res, UploadedFiles,
  UseGuards, UseInterceptors,
} from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { AnyFilesInterceptor } from '@nestjs/platform-express'
import { ApplicationsService, UploadedDoc } from './applications.service'
import { RejectApplicationDto } from './truck-loads.dto'
import { MAX_FILE_BYTES, MAX_FILES } from './applications.constants'

// Simple per-IP limits on the public form (single API instance): a loose cap
// on attempts, and a tight one on successful submissions so fixing validation
// errors never locks someone out.
const WINDOW_MS = 10 * 60_000
const MAX_ATTEMPTS = 30
const MAX_SUBMISSIONS = 5
const attempts = new Map<string, number[]>()
const submissions = new Map<string, number[]>()

function clientIp(req: any) {
  return String(req.headers['x-forwarded-for'] ?? req.ip ?? '').split(',')[0].trim()
}
function recentHits(store: Map<string, number[]>, ip: string) {
  const now = Date.now()
  const hits = (store.get(ip) ?? []).filter(t => now - t < WINDOW_MS)
  store.set(ip, hits)
  return hits
}
function tooMany() {
  return new HttpException('Too many applications from this connection — try again later', HttpStatus.TOO_MANY_REQUESTS)
}

/** Public: the application form behind a dispatcher's shared link. No login. */
@Controller('truck-loads/apply')
export class PublicApplicationsController {
  constructor(private readonly svc: ApplicationsService) {}

  @Get(':token')
  formInfo(@Param('token') token: string) {
    return this.svc.formInfo(token)
  }

  /** multipart/form-data: `data` = JSON fields, one file per document kind. */
  @Post(':token')
  @UseInterceptors(AnyFilesInterceptor({ limits: { fileSize: MAX_FILE_BYTES, files: MAX_FILES, fields: 5 } }))
  async submit(
    @Req() req: any,
    @Param('token') token: string,
    @Body('data') data: string,
    @UploadedFiles() files: UploadedDoc[] = [],
  ) {
    const ip = clientIp(req)
    const tries = recentHits(attempts, ip)
    const done = recentHits(submissions, ip)
    if (tries.length >= MAX_ATTEMPTS || done.length >= MAX_SUBMISSIONS) throw tooMany()
    tries.push(Date.now())
    const result = await this.svc.submit(token, data, files)
    done.push(Date.now())
    return result
  }
}

/** Dispatcher: share the link and review applications. */
@Controller('truck-loads')
@UseGuards(AuthGuard('jwt'))
export class ApplicationsController {
  constructor(private readonly svc: ApplicationsService) {}

  @Get('application-link')
  link(@Req() req: any) {
    return this.svc.getLink(req.user.sub)
  }

  @Post('application-link/rotate')
  rotate(@Req() req: any) {
    return this.svc.rotateLink(req.user.sub)
  }

  @Get('applications')
  list(@Req() req: any, @Query('status') status?: string) {
    return this.svc.list(req.user.sub, status)
  }

  @Get('applications/:id')
  get(@Req() req: any, @Param('id') id: string) {
    return this.svc.get(req.user.sub, id)
  }

  @Get('applications/:id/documents/:docId')
  async document(@Req() req: any, @Param('id') id: string, @Param('docId') docId: string, @Res() res: any) {
    const doc = await this.svc.document(req.user.sub, id, docId)
    res.set({
      'Content-Type': doc.mimeType,
      'Content-Length': String(doc.size),
      'Content-Disposition': `inline; filename="${doc.fileName.replace(/[^\w.\- ]/g, '_')}"`,
      // Uploaded files are untrusted: never let them run as a page
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'none'; sandbox",
      'Cache-Control': 'private, no-store',
    })
    res.end(Buffer.from(doc.data))
  }

  @Post('applications/:id/approve')
  approve(@Req() req: any, @Param('id') id: string) {
    return this.svc.approve(req.user.sub, id)
  }

  @Post('applications/:id/reject')
  reject(@Req() req: any, @Param('id') id: string, @Body() dto: RejectApplicationDto) {
    return this.svc.reject(req.user.sub, id, dto)
  }
}
