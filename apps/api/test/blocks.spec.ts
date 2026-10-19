import * as test from 'node:test'
import * as assert from 'node:assert'
import { BadRequestException, NotFoundException } from '@nestjs/common'
import { BlocksService } from '../src/modules/blocks/blocks.service'

// A tiny in-memory stand-in for the two Prisma tables BlocksService touches.
function fakePrisma(blocks: Array<{ blockerId: string; blockedId: string }>, users: Array<{ id: string; role: string }>) {
  return {
    user: { findUnique: async ({ where }: any) => users.find(u => u.id === where.id) ?? null },
    userBlock: {
      upsert: async ({ create }: any) => { if (!blocks.some(b => b.blockerId === create.blockerId && b.blockedId === create.blockedId)) blocks.push(create) },
      findMany: async ({ where }: any) => blocks.filter(b => where.blockerId ? b.blockerId === where.blockerId : (b.blockerId === where.OR[0].blockerId || b.blockedId === where.OR[1].blockedId)),
      findFirst: async ({ where }: any) => blocks.find(b => where.OR.some((c: any) => c.blockerId === b.blockerId && c.blockedId === b.blockedId)) ?? null,
    },
  } as any
}

const USERS = [{ id: 'a', role: 'client' }, { id: 'b', role: 'provider' }, { id: 'c', role: 'client' }, { id: 'root', role: 'admin' }]

test.describe('BlocksService', () => {
  test.it('cannot block yourself, an admin, or someone who does not exist', async () => {
    const svc = new BlocksService(fakePrisma([], USERS))
    await assert.rejects(svc.block('a', 'a'), BadRequestException)
    await assert.rejects(svc.block('a', 'root'), BadRequestException)
    await assert.rejects(svc.block('a', 'nobody'), NotFoundException)
  })

  test.it('blocking twice is harmless', async () => {
    const rows: any[] = []
    const svc = new BlocksService(fakePrisma(rows, USERS))
    await svc.block('a', 'b'); await svc.block('a', 'b')
    assert.strictEqual(rows.length, 1)
  })

  test.it('hiddenFrom works in both directions; blockedBy only one', async () => {
    const svc = new BlocksService(fakePrisma([{ blockerId: 'a', blockedId: 'b' }, { blockerId: 'c', blockedId: 'a' }], USERS))
    assert.deepStrictEqual([...(await svc.hiddenFrom('a'))].sort(), ['b', 'c'])
    assert.deepStrictEqual([...(await svc.hiddenFrom('b'))], ['a'])
    assert.deepStrictEqual([...(await svc.blockedBy('a'))], ['b'])
  })

  test.it('eitherBlocked sees a block from either side', async () => {
    const svc = new BlocksService(fakePrisma([{ blockerId: 'a', blockedId: 'b' }], USERS))
    assert.strictEqual(await svc.eitherBlocked('a', 'b'), true)
    assert.strictEqual(await svc.eitherBlocked('b', 'a'), true)
    assert.strictEqual(await svc.eitherBlocked('a', 'c'), false)
  })
})
