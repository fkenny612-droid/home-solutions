import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common'
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

export interface RequestUser {
  sub:  string
  role: string
}

@Injectable()
export class ChatService {
  constructor(
    private prisma:         PrismaService,
    private notifications:  NotificationsService,
  ) {}

  private assertParty(booking: { clientId: string; providerId: string | null }, user: RequestUser) {
    if (user.role === 'admin') return
    if (booking.clientId === user.sub) return
    if (booking.providerId && booking.providerId === user.sub) return
    throw new ForbiddenException('Not a party to this booking')
  }

  async getMessages(bookingId: string, user: RequestUser) {
    const booking = await this.prisma.booking.findUnique({ where: { id: bookingId } })
    if (!booking) throw new NotFoundException('Booking not found')
    this.assertParty(booking, user)
    return this.prisma.message.findMany({ where: { bookingId }, orderBy: { createdAt: 'asc' } })
  }

  async sendMessage(bookingId: string, dto: SendMessageDto, user: RequestUser) {
    const booking = await this.prisma.booking.findUnique({ where: { id: bookingId } })
    if (!booking) throw new NotFoundException('Booking not found')
    this.assertParty(booking, user)

    const message = await this.prisma.message.create({
      data: {
        bookingId,
        // senderId/senderRole come from the verified JWT, not the request body,
        // so a caller can't spoof messages as someone else.
        senderId:    user.sub,
        senderRole:  user.role,
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
