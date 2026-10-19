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

  /** In-app + push notification to a user known only by id (looks up their push token). */
  async notifyUserById(userId: string, title: string, body: string, type: string, data?: Record<string, any>) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { pushToken: true } })
    await this.notifyOne(user?.pushToken, userId, title, body, type, data)
  }

  /** Tell a seller why their listing disappeared. Rules live in the Terms; the email is how they can appeal. */
  async notifyListingRemoved(sellerId: string, listingTitle: string, reasonLabel?: string) {
    const why = reasonLabel ? ` It was reported as: ${reasonLabel.toLowerCase()}.` : ''
    await this.notifyUserById(
      sellerId,
      'Your listing was removed',
      `"${listingTitle.slice(0, 60)}" was taken down because it broke the Easyfix marketplace rules.${why} If you think this was a mistake, email hello@easyfix.co.za.`,
      'listing_removed',
    )
  }

  /** Tell someone a chat message they sent was removed by a moderator. */
  async notifyMessageRemoved(senderId: string, reasonLabel?: string) {
    const why = reasonLabel ? ` It was reported as: ${reasonLabel.toLowerCase()}.` : ''
    await this.notifyUserById(
      senderId,
      'A message you sent was removed',
      `A moderator removed one of your chat messages for breaking the Easyfix rules.${why} Repeated breaches can lead to your account being suspended. Questions? Email hello@easyfix.co.za.`,
      'message_removed',
    )
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
