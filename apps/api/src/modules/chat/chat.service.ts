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
      let recipientUser: { pushToken: string | null } | null = null
      if (dto.senderRole === 'client') {
        // providerId references the Provider table — look up the matching User via phone
        const provider = await this.prisma.provider.findUnique({ where: { id: recipientId } })
        if (provider) recipientUser = await this.prisma.user.findFirst({ where: { phone: provider.phone }, select: { pushToken: true } })
      } else {
        recipientUser = await this.prisma.user.findUnique({ where: { id: recipientId }, select: { pushToken: true } })
      }
      const preview = dto.text?.slice(0, 60) ?? (dto.attachments?.length ? '📎 Attachment' : '')
      this.notifications.notifyOne(
        recipientUser?.pushToken,
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
