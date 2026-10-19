import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'

/**
 * User blocking (required for apps with user-generated content). A block hides the two people from each other:
 * chat messages, marketplace listings, provider search results and new job requests. It never touches money —
 * a booking that is already paid for and in progress carries on, and either side can still contact Easyfix about it.
 */
@Injectable()
export class BlocksService {
  constructor(private prisma: PrismaService) {}

  async block(blockerId: string, blockedId: string) {
    if (typeof blockedId !== 'string' || !blockedId) throw new BadRequestException('userId is required')
    if (blockedId === blockerId) throw new BadRequestException('You cannot block yourself')
    const target = await this.prisma.user.findUnique({ where: { id: blockedId }, select: { id: true, role: true } })
    if (!target) throw new NotFoundException('User not found')
    if (target.role === 'admin') throw new BadRequestException('You cannot block Easyfix support')
    await this.prisma.userBlock.upsert({
      where:  { blockerId_blockedId: { blockerId, blockedId } },
      update: {},
      create: { blockerId, blockedId },
    })
    return { ok: true }
  }

  async unblock(blockerId: string, blockedId: string) {
    await this.prisma.userBlock.deleteMany({ where: { blockerId, blockedId } })
    return { ok: true }
  }

  /** The people this user has blocked, with a display name so they can be unblocked later. */
  async list(blockerId: string) {
    const blocks = await this.prisma.userBlock.findMany({ where: { blockerId }, orderBy: { createdAt: 'desc' } })
    if (!blocks.length) return []
    const users = await this.prisma.user.findMany({
      where:  { id: { in: blocks.map(b => b.blockedId) } },
      select: { id: true, firstName: true, lastName: true, companyName: true },
    })
    const byId = new Map(users.map(u => [u.id, u]))
    return blocks.map(b => {
      const u = byId.get(b.blockedId)
      const name = [u?.firstName, u?.lastName].filter(Boolean).join(' ') || u?.companyName || 'Easyfix user'
      return { userId: b.blockedId, name, blockedAt: b.createdAt }
    })
  }

  /** Ids this user has blocked (one-way). */
  async blockedBy(userId: string): Promise<Set<string>> {
    const rows = await this.prisma.userBlock.findMany({ where: { blockerId: userId }, select: { blockedId: true } })
    return new Set(rows.map(r => r.blockedId))
  }

  /** Everyone who should be invisible to this user: people they blocked and people who blocked them. */
  async hiddenFrom(userId: string): Promise<Set<string>> {
    const rows = await this.prisma.userBlock.findMany({
      where:  { OR: [{ blockerId: userId }, { blockedId: userId }] },
      select: { blockerId: true, blockedId: true },
    })
    const ids = new Set<string>()
    for (const r of rows) ids.add(r.blockerId === userId ? r.blockedId : r.blockerId)
    return ids
  }

  /** True if either of the two has blocked the other. */
  async eitherBlocked(a: string, b: string): Promise<boolean> {
    const found = await this.prisma.userBlock.findFirst({
      where:  { OR: [{ blockerId: a, blockedId: b }, { blockerId: b, blockedId: a }] },
      select: { id: true },
    })
    return !!found
  }
}
