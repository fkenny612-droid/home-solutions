import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { PrismaService } from '../../prisma/prisma.service'

export const REPORT_TARGETS = ['listing', 'message'] as const
export const REPORT_REASONS = ['spam_or_scam', 'prohibited_item', 'inappropriate', 'harassment', 'other'] as const

export type ReportTarget = (typeof REPORT_TARGETS)[number]
export type ReportReason = (typeof REPORT_REASONS)[number]

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async create(reporterId: string, dto: { targetType: string; targetId: string; reason: string; details?: string }) {
    if (!REPORT_TARGETS.includes(dto.targetType as ReportTarget)) throw new BadRequestException('Unknown report target')
    if (!REPORT_REASONS.includes(dto.reason as ReportReason))     throw new BadRequestException('Unknown report reason')
    if (!dto.targetId) throw new BadRequestException('targetId is required')

    const exists = dto.targetType === 'listing'
      ? await this.prisma.listing.findUnique({ where: { id: dto.targetId }, select: { id: true } })
      : await this.prisma.message.findUnique({ where: { id: dto.targetId }, select: { id: true } })
    if (!exists) throw new NotFoundException('That content no longer exists')

    // One report per reporter per item — reporting again is a harmless no-op.
    return this.prisma.report.upsert({
      where:  { reporterId_targetType_targetId: { reporterId, targetType: dto.targetType, targetId: dto.targetId } },
      update: {},
      create: {
        reporterId,
        targetType: dto.targetType,
        targetId:   dto.targetId,
        reason:     dto.reason,
        details:    dto.details?.trim().slice(0, 500) || null,
      },
      select: { id: true, status: true },
    })
  }

  /** Admin: open reports first, each with a snapshot of what was reported. */
  async list(status?: string) {
    const found = await this.prisma.report.findMany({
      where:   status ? { status } : {},
      orderBy: { createdAt: 'desc' },
      take:    200,
    })
    // Open reports first (alphabetical status order would put 'dismissed' above 'open'), newest first within each.
    const reports = [...found].sort((a, b) => Number(b.status === 'open') - Number(a.status === 'open'))
    // How many people reported the same item — several reports on one item is the strongest signal.
    const counts = await this.prisma.report.groupBy({ by: ['targetType', 'targetId'], _count: { _all: true } })
    const countFor = (t: string, id: string) => counts.find(c => c.targetType === t && c.targetId === id)?._count._all ?? 1
    return Promise.all(reports.map(async r => {
      let target: Record<string, unknown> | null = null
      if (r.targetType === 'listing') {
        target = await this.prisma.listing.findUnique({
          where: { id: r.targetId },
          select: { id: true, title: true, description: true, sellerId: true, sellerName: true, images: true },
        })
      } else {
        target = await this.prisma.message.findUnique({
          where: { id: r.targetId },
          select: { id: true, text: true, senderId: true, senderName: true, bookingId: true },
        })
      }
      return { ...r, target, reportCount: countFor(r.targetType, r.targetId) }
    }))
  }

  /**
   * Moderator action: take the reported content down. A listing is deleted; a chat message is blanked (the row stays so
   * the conversation keeps its shape and the booking history is intact). Every report on that item is then closed.
   */
  async removeContent(id: string) {
    const report = await this.prisma.report.findUnique({ where: { id } })
    if (!report) throw new NotFoundException('Report not found')

    let removed = false
    if (report.targetType === 'listing') {
      removed = (await this.prisma.listing.deleteMany({ where: { id: report.targetId } })).count > 0
    } else {
      removed = (await this.prisma.message.updateMany({
        where: { id: report.targetId },
        data:  { text: '[Removed by Easyfix]', attachments: Prisma.DbNull },
      })).count > 0
    }
    await this.prisma.report.updateMany({ where: { targetType: report.targetType, targetId: report.targetId }, data: { status: 'resolved' } })
    return { ok: true, removed }
  }

  async setStatus(id: string, status: string) {
    if (!['open', 'resolved', 'dismissed'].includes(status)) throw new BadRequestException('Invalid status')
    const report = await this.prisma.report.findUnique({ where: { id } })
    if (!report) throw new NotFoundException('Report not found')
    return this.prisma.report.update({ where: { id }, data: { status } })
  }
}
