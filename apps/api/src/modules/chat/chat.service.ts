import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'

export interface SendMessageDto {
  senderId:   string
  senderRole: 'client' | 'provider' | 'admin'
  senderName: string
  text:       string
}

@Injectable()
export class ChatService {
  constructor(private prisma: PrismaService) {}

  async getMessages(bookingId: string) {
    // Verify booking exists
    const booking = await this.prisma.booking.findUnique({ where: { id: bookingId } })
    if (!booking) throw new NotFoundException('Booking not found')

    return this.prisma.message.findMany({
      where:   { bookingId },
      orderBy: { createdAt: 'asc' },
    })
  }

  async sendMessage(bookingId: string, dto: SendMessageDto) {
    const booking = await this.prisma.booking.findUnique({ where: { id: bookingId } })
    if (!booking) throw new NotFoundException('Booking not found')

    return this.prisma.message.create({
      data: {
        bookingId,
        senderId:   dto.senderId,
        senderRole: dto.senderRole,
        senderName: dto.senderName,
        text:       dto.text.trim(),
      },
    })
  }
}
