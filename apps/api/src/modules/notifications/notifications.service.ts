import { Injectable, Logger } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'

interface PushMessage {
  to:    string
  title: string
  body:  string
  data?: Record<string, any>
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name)

  constructor(private prisma: PrismaService) {}

  async send(messages: PushMessage | PushMessage[]) {
    const batch = Array.isArray(messages) ? messages : [messages]
    const valid  = batch.filter(m => m.to?.startsWith('ExponentPushToken'))
    if (!valid.length) return
    try {
      const res = await fetch('https://exp.host/--/api/v2/push/send', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'Accept-Encoding': 'gzip, deflate' },
        body: JSON.stringify(valid),
      })
      const json = await res.json()
      this.logger.log(`Push sent to ${valid.length} device(s)`, json)
    } catch (err) {
      this.logger.error('Push notification failed', err)
    }
  }

  async saveInApp(userId: string, title: string, body: string, type: string, data?: Record<string, any>) {
    await this.prisma.notification.create({ data: { userId, title, body, type, data } })
  }

  async notifyOne(token: string | null | undefined, userId: string, title: string, body: string, type: string, data?: Record<string, any>) {
    await Promise.all([
      this.saveInApp(userId, title, body, type, data),
      token ? this.send({ to: token, title, body, data }) : Promise.resolve(),
    ])
  }

  async notifyProviders(tokens: string[], title: string, body: string, data?: Record<string, any>) {
    await this.send(tokens.map(to => ({ to, title, body, data })))
  }

  async listForUser(userId: string) {
    return this.prisma.notification.findMany({
      where:   { userId },
      orderBy: { createdAt: 'desc' },
      take:    50,
    })
  }

  async markRead(userId: string, ids?: string[]) {
    await this.prisma.notification.updateMany({
      where: { userId, ...(ids?.length ? { id: { in: ids } } : {}) },
      data:  { read: true },
    })
  }

  async unreadCount(userId: string) {
    return this.prisma.notification.count({ where: { userId, read: false } })
  }
}
