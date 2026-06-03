import { Injectable, Logger } from '@nestjs/common'

interface PushMessage {
  to:    string
  title: string
  body:  string
  data?: Record<string, any>
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name)

  async send(messages: PushMessage | PushMessage[]) {
    const batch = Array.isArray(messages) ? messages : [messages]
    const valid  = batch.filter(m => m.to?.startsWith('ExponentPushToken'))

    if (!valid.length) return

    try {
      const res = await fetch('https://exp.host/--/api/v2/push/send', {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          'Accept':        'application/json',
          'Accept-Encoding': 'gzip, deflate',
        },
        body: JSON.stringify(valid),
      })
      const json = await res.json()
      this.logger.log(`Push sent to ${valid.length} device(s)`, json)
    } catch (err) {
      this.logger.error('Push notification failed', err)
    }
  }

  async notifyProviders(tokens: string[], title: string, body: string, data?: Record<string, any>) {
    await this.send(tokens.map(to => ({ to, title, body, data })))
  }

  async notifyOne(token: string, title: string, body: string, data?: Record<string, any>) {
    if (!token) return
    await this.send({ to: token, title, body, data })
  }
}
