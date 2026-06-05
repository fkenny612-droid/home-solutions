import { Injectable, Logger } from '@nestjs/common'

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name)
  private readonly sms: any

  constructor() {
    const apiKey   = process.env.AT_API_KEY
    const username = process.env.AT_USERNAME ?? 'sandbox'

    if (!apiKey || apiKey === 'your-at-api-key') {
      this.logger.warn('Africa\'s Talking not configured — SMS disabled')
      return
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const AT   = require('africastalking')
      const client = AT({ apiKey, username })
      this.sms   = client.SMS
      this.logger.log(`SMS ready (AT username: ${username})`)
    } catch (err) {
      this.logger.error('Failed to init Africa\'s Talking', err)
    }
  }

  async send(to: string | string[], message: string) {
    if (!this.sms) return

    const recipients = Array.isArray(to) ? to : [to]
    // Ensure SA format (+27...)
    const normalised = recipients.map(n =>
      n.startsWith('+') ? n : `+27${n.replace(/^0/, '')}`
    )

    try {
      const res = await this.sms.send({
        to:      normalised,
        message,
        from:    'HomeSol',  // Register as sender ID in AT dashboard for production
      })
      this.logger.log(`SMS sent to ${normalised.join(', ')}`, res)
    } catch (err) {
      this.logger.error(`SMS failed to ${normalised.join(', ')}`, err)
    }
  }

  async notifyNewJob(phones: string[], serviceType: string, address: string) {
    const msg = `HomeSolutions: New ${serviceType} job at ${address}. Open the app to accept. Reply STOP to opt out.`
    await this.send(phones, msg)
  }

  async notifyBookingConfirmed(phone: string, providerName: string, serviceType: string, bookingId: string) {
    const msg = `HomeSolutions: ${providerName} has accepted your ${serviceType} booking #${bookingId.slice(-6).toUpperCase()} and is on the way!`
    await this.send(phone, msg)
  }

  async notifyJobComplete(phone: string, serviceType: string, amount: number) {
    const msg = `HomeSolutions: Your ${serviceType} job is complete. R${amount} released. 90-day warranty active. Rate your provider in the app.`
    await this.send(phone, msg)
  }
}
