import {
  BadRequestException, ConflictException, Injectable, Logger, NotFoundException, OnModuleDestroy, OnModuleInit,
} from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { SmsService } from '../notifications/sms.service'
import { assertDocType, UploadedDoc } from './documents.util'
import { CARRIER_DOCUMENTS, carrierBadge, itemStatus, truckCompliance } from './compliance'
import { CarrierProfileDto, ReviewNoteDto } from './truck-loads.dto'

const DOC_META = { id: true, kind: true, fileName: true, mimeType: true, size: true, expiresAt: true, createdAt: true } as const
const DIGEST_EVERY_MS = 24 * 3_600_000
const DIGEST_CHECK_MS = 3_600_000
/** SMS only for things that need action this week. */
const DIGEST_WITHIN_DAYS = 7

export interface ComplianceIssue {
  scope: 'truck' | 'company'
  truckId?: string
  subject: string   // "Unit 1 · ND 123-456" or company name
  label: string     // "PrDP"
  status: 'expired' | 'expiring' | 'missing'
  expiresAt: Date | null
  daysLeft: number | null
}

@Injectable()
export class CarrierService implements OnModuleInit, OnModuleDestroy {
  private readonly log = new Logger(CarrierService.name)
  private timer?: NodeJS.Timeout
  /** Fallback for carriers without a profile row to record the last SMS on. */
  private lastSent = new Map<string, number>()

  constructor(private prisma: PrismaService, private sms: SmsService) {}

  // ── Carrier: company profile ────────────────────────────────────────────────

  async getProfile(ownerId: string) {
    const profile = await this.prisma.carrierProfile.findUnique({
      where: { ownerId },
      include: { documents: { select: DOC_META } },
    })
    return {
      profile,
      badge: carrierBadge(profile, profile?.documents ?? []),
      documentSpecs: CARRIER_DOCUMENTS,
    }
  }

  async saveProfile(ownerId: string, dto: CarrierProfileDto) {
    const existing = await this.prisma.carrierProfile.findUnique({ where: { ownerId } })
    const data = {
      companyName:        dto.companyName.trim(),
      registrationNumber: dto.registrationNumber.trim().toUpperCase(),
      vatNumber:          dto.vatNumber?.trim() || null,
      contactName:        dto.contactName.trim(),
      contactPhone:       dto.contactPhone.trim(),
      contactEmail:       dto.contactEmail?.trim() || null,
      address:            dto.address?.trim() || null,
    }
    if (!existing) {
      await this.prisma.carrierProfile.create({ data: { ...data, ownerId } })
      return this.getProfile(ownerId)
    }
    // Changing who the company is means the verification no longer applies
    const identityChanged =
      existing.companyName !== data.companyName || existing.registrationNumber !== data.registrationNumber
    const reverify = identityChanged && (existing.status === 'verified' || existing.status === 'pending')
    await this.prisma.carrierProfile.update({
      where: { ownerId },
      data: { ...data, ...(reverify ? { status: 'pending', submittedAt: new Date(), verifiedAt: null } : {}) },
    })
    return this.getProfile(ownerId)
  }

  /** Upload or replace one company document (renewals keep the badge). */
  async uploadDocument(ownerId: string, kind: string, file: UploadedDoc | undefined, expiresAt?: string) {
    const spec = CARRIER_DOCUMENTS.find(d => d.kind === kind)
    if (!spec) throw new BadRequestException(`Unknown document "${kind}"`)
    if (!file) throw new BadRequestException('Choose a file to upload')
    assertDocType(file, spec.label)
    const profile = await this.prisma.carrierProfile.findUnique({ where: { ownerId } })
    if (!profile) throw new BadRequestException('Save your company details first')

    let expiry: Date | null = null
    if (spec.expires) {
      if (!expiresAt || isNaN(Date.parse(expiresAt))) throw new BadRequestException(`Enter the expiry date for the ${spec.label}`)
      expiry = new Date(expiresAt)
      if (itemStatus(expiry).status === 'expired') throw new BadRequestException(`That ${spec.label} has already expired`)
    }
    const data = {
      fileName: file.originalname.slice(0, 200), mimeType: file.mimetype, size: file.size,
      data: file.buffer, expiresAt: expiry,
    }
    await this.prisma.carrierDocument.upsert({
      where:  { profileId_kind: { profileId: profile.id, kind } },
      create: { ...data, profileId: profile.id, kind },
      update: { ...data, createdAt: new Date() },
    })
    return this.getProfile(ownerId)
  }

  async document(ownerId: string, docId: string) {
    const doc = await this.prisma.carrierDocument.findFirst({ where: { id: docId, profile: { ownerId } } })
    if (!doc) throw new NotFoundException('Document not found')
    return doc
  }

  async submitForVerification(ownerId: string) {
    const profile = await this.prisma.carrierProfile.findUnique({ where: { ownerId }, include: { documents: true } })
    if (!profile) throw new BadRequestException('Save your company details first')
    if (profile.status === 'pending') throw new ConflictException('Already waiting for verification')
    if (profile.status === 'verified') throw new ConflictException('Already verified')
    const missing = CARRIER_DOCUMENTS
      .filter(s => s.required)
      .filter(s => {
        const d = profile.documents.find(x => x.kind === s.kind)
        return !d || (s.expires && itemStatus(d.expiresAt).status === 'expired')
      })
    if (missing.length) throw new BadRequestException(`Upload valid documents first: ${missing.map(m => m.label).join(', ')}`)
    await this.prisma.carrierProfile.update({
      where: { ownerId },
      data: { status: 'pending', submittedAt: new Date(), reviewNote: null },
    })
    return this.getProfile(ownerId)
  }

  // ── Carrier: fleet + company compliance ─────────────────────────────────────

  async compliance(ownerId: string, now = new Date()) {
    const [trucks, profile] = await Promise.all([
      this.prisma.truck.findMany({ where: { ownerId, status: { not: 'out_of_service' } }, orderBy: { name: 'asc' } }),
      this.prisma.carrierProfile.findUnique({ where: { ownerId }, include: { documents: { select: DOC_META } } }),
    ])
    const issues: ComplianceIssue[] = []
    for (const t of trucks) {
      for (const i of truckCompliance(t, now).items) {
        if (i.status === 'ok') continue
        issues.push({
          scope: 'truck', truckId: t.id, subject: `${t.name} · ${t.plate}`, label: i.label,
          status: i.status, expiresAt: i.expiresAt, daysLeft: i.daysLeft,
        })
      }
    }
    if (profile) {
      for (const spec of CARRIER_DOCUMENTS) {
        if (!spec.expires) continue
        const doc = profile.documents.find(d => d.kind === spec.kind)
        if (!doc) {
          if (spec.required) issues.push({ scope: 'company', subject: profile.companyName, label: spec.label, status: 'missing', expiresAt: null, daysLeft: null })
          continue
        }
        const { status, daysLeft } = itemStatus(doc.expiresAt, now)
        if (status !== 'ok') issues.push({ scope: 'company', subject: profile.companyName, label: spec.label, status, expiresAt: doc.expiresAt, daysLeft })
      }
    }
    const rank = { expired: 0, missing: 1, expiring: 2 }
    issues.sort((a, b) => rank[a.status] - rank[b.status] || (a.daysLeft ?? 0) - (b.daysLeft ?? 0))
    return {
      issues,
      counts: {
        expired:  issues.filter(i => i.status === 'expired').length,
        expiring: issues.filter(i => i.status === 'expiring').length,
        missing:  issues.filter(i => i.status === 'missing').length,
      },
    }
  }

  // ── Platform admin: verification ────────────────────────────────────────────

  async adminList(status?: string) {
    const rows = await this.prisma.carrierProfile.findMany({
      where: status ? { status } : { status: { not: 'draft' } },
      include: { documents: { select: { kind: true, expiresAt: true } } },
      orderBy: [{ submittedAt: 'desc' }, { createdAt: 'desc' }],
      take: 200,
    })
    const fleet = await this.prisma.truck.groupBy({ by: ['ownerId'], _count: true, where: { ownerId: { in: rows.map(r => r.ownerId) } } })
    return rows.map(({ documents, ...p }) => ({
      ...p,
      badge: carrierBadge(p, documents),
      documentCount: documents.length,
      fleetSize: fleet.find(f => f.ownerId === p.ownerId)?._count ?? 0,
    }))
  }

  async adminGet(id: string) {
    const profile = await this.prisma.carrierProfile.findUnique({ where: { id }, include: { documents: { select: DOC_META } } })
    if (!profile) throw new NotFoundException('Carrier not found')
    const [trucks, owner] = await Promise.all([
      this.prisma.truck.findMany({ where: { ownerId: profile.ownerId }, orderBy: { name: 'asc' } }),
      this.prisma.user.findUnique({ where: { id: profile.ownerId }, select: { phone: true, firstName: true, lastName: true } }),
    ])
    return {
      profile,
      owner,
      badge: carrierBadge(profile, profile.documents),
      documentSpecs: CARRIER_DOCUMENTS,
      fleet: trucks.map(t => ({
        id: t.id, name: t.name, plate: t.plate, driverName: t.driverName, status: t.status,
        compliance: truckCompliance(t),
      })),
    }
  }

  async adminDocument(id: string, docId: string) {
    const doc = await this.prisma.carrierDocument.findFirst({ where: { id: docId, profileId: id } })
    if (!doc) throw new NotFoundException('Document not found')
    return doc
  }

  async adminVerify(id: string) {
    const p = await this.prisma.carrierProfile.findUnique({ where: { id } })
    if (!p) throw new NotFoundException('Carrier not found')
    if (p.status !== 'pending') throw new ConflictException(`Carrier is ${p.status}, not pending`)
    await this.prisma.carrierProfile.update({ where: { id }, data: { status: 'verified', verifiedAt: new Date(), reviewNote: null } })
    return this.adminGet(id)
  }

  async adminReject(id: string, dto: ReviewNoteDto) {
    const p = await this.prisma.carrierProfile.findUnique({ where: { id } })
    if (!p) throw new NotFoundException('Carrier not found')
    if (p.status === 'draft') throw new ConflictException('Carrier has not submitted for verification')
    await this.prisma.carrierProfile.update({
      where: { id },
      data: { status: 'rejected', verifiedAt: null, reviewNote: dto.note?.trim() || null },
    })
    return this.adminGet(id)
  }

  // ── Daily SMS digest of documents needing action ────────────────────────────

  onModuleInit() {
    if (process.env.TRUCK_LOADS_ALERTS === 'off') return
    this.timer = setInterval(() => this.sendDigests().catch(e => this.log.error('Digest failed', e)), DIGEST_CHECK_MS)
    this.timer.unref()
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer)
  }

  /** At most one SMS per carrier per day, only when something is due within a week. */
  async sendDigests(now = new Date()) {
    const owners = await this.prisma.truck.findMany({ distinct: ['ownerId'], select: { ownerId: true } })
    let sent = 0
    for (const { ownerId } of owners) {
      const profile = await this.prisma.carrierProfile.findUnique({ where: { ownerId } })
      const last = profile?.lastComplianceSmsAt?.getTime() ?? this.lastSent.get(ownerId)
      if (last && now.getTime() - last < DIGEST_EVERY_MS) continue
      const { issues } = await this.compliance(ownerId, now)
      const urgent = issues.filter(i => i.status === 'expired' || (i.status === 'expiring' && (i.daysLeft ?? 99) <= DIGEST_WITHIN_DAYS))
      if (!urgent.length) continue

      const phone = profile?.contactPhone
        ?? (await this.prisma.user.findUnique({ where: { id: ownerId }, select: { phone: true } }))?.phone
      if (!phone) continue
      const expired = urgent.filter(i => i.status === 'expired').length
      const first = urgent[0]
      const detail = `${first.subject}: ${first.label} ${first.status === 'expired' ? 'expired' : `expires in ${first.daysLeft} day(s)`}`
      const msg = `Truck Loads: ${expired ? `${expired} document(s) expired` : ''}${expired && urgent.length > expired ? ', ' : ''}` +
        `${urgent.length - expired ? `${urgent.length - expired} expiring this week` : ''}. ${detail}` +
        `${urgent.length > 1 ? ` (+${urgent.length - 1} more)` : ''}. Update them on your dispatch board.`
      await this.sms.send(phone, msg)
      this.lastSent.set(ownerId, now.getTime())
      if (profile) await this.prisma.carrierProfile.update({ where: { ownerId }, data: { lastComplianceSmsAt: now } })
      sent++
    }
    if (sent) this.log.log(`Compliance SMS sent to ${sent} carrier(s)`)
    return sent
  }
}
