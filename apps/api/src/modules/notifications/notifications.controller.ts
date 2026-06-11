import { Controller, Get, Patch, Body, Req, UseGuards } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { NotificationsService } from './notifications.service'

@Controller('notifications')
@UseGuards(AuthGuard('jwt'))
export class NotificationsController {
  constructor(private readonly svc: NotificationsService) {}

  @Get()
  list(@Req() req: any) {
    return this.svc.listForUser(req.user.sub)
  }

  @Get('unread-count')
  unreadCount(@Req() req: any) {
    return this.svc.unreadCount(req.user.sub).then(count => ({ count }))
  }

  @Patch('mark-read')
  markRead(@Req() req: any, @Body() body: { ids?: string[] }) {
    return this.svc.markRead(req.user.sub, body.ids)
  }
}
