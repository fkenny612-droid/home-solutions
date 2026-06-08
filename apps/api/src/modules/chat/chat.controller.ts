import { Controller, Get, Post, Param, Body } from '@nestjs/common'
import { ChatService, SendMessageDto } from './chat.service'

@Controller('bookings/:bookingId/messages')
export class ChatController {
  constructor(private svc: ChatService) {}

  @Get()
  getMessages(@Param('bookingId') bookingId: string) {
    return this.svc.getMessages(bookingId)
  }

  @Post()
  sendMessage(
    @Param('bookingId') bookingId: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.svc.sendMessage(bookingId, dto)
  }
}
