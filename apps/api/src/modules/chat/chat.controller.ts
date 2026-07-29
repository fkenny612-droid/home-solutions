import { Controller, Get, Post, Param, Body, Req, UseGuards } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { ChatService, SendMessageDto } from './chat.service'

@Controller('bookings/:bookingId/messages')
@UseGuards(AuthGuard('jwt'))
export class ChatController {
  constructor(private svc: ChatService) {}

  @Get()
  getMessages(@Param('bookingId') bookingId: string, @Req() req: any) {
    return this.svc.getMessages(bookingId, req.user)
  }

  @Post()
  sendMessage(
    @Param('bookingId') bookingId: string,
    @Body() dto: SendMessageDto,
    @Req() req: any,
  ) {
    return this.svc.sendMessage(bookingId, dto, req.user)
  }
}
