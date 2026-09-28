import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { SmsService } from '../notifications/sms.service'

export type ChatRole = 'shipper' | 'carrier'
const THREAD_LIMIT = 300
/** Text the other side when a conversation starts or resumes after this long. */
const SMS_QUIET_MS = 30 * 60_000

type Thread = { shipmentId: string; carrierId: string }
const key = (t: Thread): Thread => ({ shipmentId: t.shipmentId, carrierId: t.carrierId })

/**
 * Shipment chat: one thread per (shipment, carrier). Any carrier that bid can
 * talk to the shipper; after award, that's the working channel for the job.
 */
@Injectable()
export class ChatService {
  constructor(private prisma: PrismaService, private sms: SmsService) {}

  // ── Access ──────────────────────────────────────────────────────────────────

  private async shipperThread(shipperId: string, shipmentId: string, carrierId: string) {
    const s = await this.prisma.shipment.findFirst({ where: { id: shipmentId, shipperId }, select: { id: true, reference: true } })
    if (!s) throw new NotFoundException('Shipment not found')
    if (!(await this.prisma.bid.findUnique({ where: { shipmentId_carrierId: { shipmentId, carrierId } }, select: { id: true } }))) {
      throw new NotFoundException('That carrier has not bid on this shipment')
    }
    return { shipmentId, carrierId, reference: s.reference }
  }

  private async carrierThread(carrierId: string, shipmentId: string) {
    const bid = await this.prisma.bid.findUnique({
      where: { shipmentId_carrierId: { shipmentId, carrierId } },
      select: { shipment: { select: { reference: true } } },
    })
    if (!bid) throw new ForbiddenException('Bid on this shipment to message the shipper')
    return { shipmentId, carrierId, reference: bid.shipment.reference }
  }

  // ── Threads ─────────────────────────────────────────────────────────────────

  async shipperMessages(shipperId: string, shipmentId: string, carrierId: string) {
    return this.read(await this.shipperThread(shipperId, shipmentId, carrierId), 'shipper')
  }

  async carrierMessages(carrierId: string, shipmentId: string) {
    return this.read(await this.carrierThread(carrierId, shipmentId), 'carrier')
  }

  async shipperSend(shipperId: string, shipmentId: string, carrierId: string, body: string) {
    return this.send(await this.shipperThread(shipperId, shipmentId, carrierId), 'shipper', shipperId, body)
  }

  async carrierSend(carrierId: string, shipmentId: string, body: string) {
    return this.send(await this.carrierThread(carrierId, shipmentId), 'carrier', carrierId, body)
  }

  /** Read-only view of a thread for a platform admin handling a claim. */
  thread(t: Thread) {
    return this.prisma.shipmentMessage.findMany({
      where: key(t), orderBy: { createdAt: 'asc' }, take: THREAD_LIMIT,
      select: { id: true, fromRole: true, body: true, createdAt: true },
    })
  }

  private async read(thread: Thread, role: ChatRole) {
    const t = key(thread)
    const [messages, other] = await Promise.all([
      this.prisma.shipmentMessage.findMany({
        where: t, orderBy: { createdAt: 'desc' }, take: THREAD_LIMIT,
        select: { id: true, fromRole: true, body: true, createdAt: true },
      }),
      this.prisma.chatRead.findUnique({ where: { shipmentId_carrierId_role: { ...t, role: role === 'shipper' ? 'carrier' : 'shipper' } } }),
    ])
    await this.markRead(t, role)
    return { messages: messages.reverse(), otherReadAt: other?.readAt ?? null }
  }

  private markRead(thread: Thread, role: ChatRole) {
    const t = key(thread)
    return this.prisma.chatRead.upsert({
      where: { shipmentId_carrierId_role: { ...t, role } },
      create: { ...t, role },
      update: { readAt: new Date() },
    })
  }

  private async send(t: Thread & { reference: string }, role: ChatRole, senderId: string, raw: string) {
    const body = raw.trim()
    if (!body) throw new BadRequestException('Message is empty')
    const previous = await this.prisma.shipmentMessage.findFirst({
      where: { shipmentId: t.shipmentId, carrierId: t.carrierId }, orderBy: { createdAt: 'desc' }, select: { createdAt: true },
    })
    const msg = await this.prisma.shipmentMessage.create({
      data: { shipmentId: t.shipmentId, carrierId: t.carrierId, senderId, fromRole: role, body },
      select: { id: true, fromRole: true, body: true, createdAt: true },
    })
    await this.markRead(t, role)
    if (!previous || Date.now() - previous.createdAt.getTime() > SMS_QUIET_MS) this.notify(t, role, body).catch(() => {})
    return msg
  }

  private async notify(t: Thread & { reference: string }, from: ChatRole, body: string) {
    const shipment = await this.prisma.shipment.findUnique({ where: { id: t.shipmentId }, select: { shipperId: true } })
    if (!shipment) return
    const [shipper, carrier] = await Promise.all([
      this.prisma.shipperProfile.findUnique({ where: { ownerId: shipment.shipperId }, select: { companyName: true, contactPhone: true } }),
      this.prisma.carrierProfile.findUnique({ where: { ownerId: t.carrierId }, select: { companyName: true, contactPhone: true } }),
    ])
    const [sender, to] = from === 'shipper' ? [shipper?.companyName, carrier?.contactPhone] : [carrier?.companyName, shipper?.contactPhone]
    if (!to) return
    const preview = body.length > 80 ? `${body.slice(0, 77)}…` : body
    await this.sms.send(to, `Truck Loads: ${sender ?? 'New message'} about ${t.reference}: "${preview}" — reply in Truck Loads.`)
  }

  // ── Unread counts ───────────────────────────────────────────────────────────

  /** Unread messages per thread for one side, as "shipmentId:carrierId" → count. */
  async unread(role: ChatRole, where: { shipmentId?: { in: string[] }; carrierId?: string }) {
    const [msgs, reads] = await Promise.all([
      this.prisma.shipmentMessage.findMany({
        where: { ...where, fromRole: { not: role } }, select: { shipmentId: true, carrierId: true, createdAt: true },
      }),
      this.prisma.chatRead.findMany({ where: { ...where, role } }),
    ])
    const readAt = new Map(reads.map(r => [`${r.shipmentId}:${r.carrierId}`, r.readAt.getTime()]))
    const out = new Map<string, number>()
    for (const m of msgs) {
      const key = `${m.shipmentId}:${m.carrierId}`
      if (m.createdAt.getTime() > (readAt.get(key) ?? 0)) out.set(key, (out.get(key) ?? 0) + 1)
    }
    return out
  }
}
