import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { NotificationsService } from '../notifications/notifications.service'

export interface ChatAttachment {
  url:      string
  type:     'image' | 'file'
  fileName: string
}

export interface SendMessageDto {
  senderId:    string
  senderRole:  'client' | 'provider' | 'admin'
  senderName:  string
  text?:       string
  attachments?: ChatAttachment[]
}

@Injectable()
export class ChatService {
  constructor(
    private prisma:         PrismaService,
    private notifications:  NotificationsService,
  ) {}

  async getMessages(bookingId: string) {
    const booking = await this.prisma.booking.findUnique({ where: { id: bookingId } })
    if (!booking) throw new NotFoundException('Booking not found')
    return this.prisma.message.findMany({ where: { bookingId }, orderBy: { createdAt: 'asc' } })
  }

  async sendMessage(bookingId: string, dto: SendMessageDto) {
    const booking = await this.prisma.booking.findUnique({ where: { id: bookingId } })
    if (!booking) throw new NotFoundException('Booking not found')

    const message = await this.prisma.message.create({
      data: {
        bookingId,
        senderId:    dto.senderId,
        senderRole:  dto.senderRole,
        senderName:  dto.senderName,
        text:        dto.text?.trim() ?? '',
        attachments: (dto.attachments ?? []) as any,
      },
    })

    // Notify the other party
    const recipientId = dto.senderRole === 'client' ? booking.providerId : booking.clientId
    if (recipientId) {
      const recipient = await this.prisma.user.findFirst({
        where: dto.senderRole === 'client'
          ? { role: 'provider' }  // providers look up by clientId join not needed — just save in-app
          : { id: recipientId },
      })
      const preview = dto.text?.slice(0, 60) ?? (dto.attachments?.length ? '📎 Attachment' : '')
      this.notifications.notifyOne(
        dto.senderRole === 'client' ? null : recipient?.pushToken,
        recipientId,
        `💬 ${dto.senderName}`,
        preview,
        'chat_message',
        { bookingId },
      ).catch(() => {})
    }

    return message
  }
}
