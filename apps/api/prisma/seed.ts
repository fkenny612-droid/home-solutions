/**
 * Prisma seed — initial users, providers, and bookings
 * Run: npx ts-node prisma/seed.ts
 */
import { PrismaClient } from '@prisma/client'
import * as bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // ── Users ──────────────────────────────────────────────────
  const users = await Promise.all([
    prisma.user.upsert({
      where:  { phone: '+27800000000' },
      update: {},
      create: { id: 'admin-1', phone: '+27800000000', role: 'admin', passwordHash: bcrypt.hashSync('admin123', 10) },
    }),
    prisma.user.upsert({
      where:  { phone: '+27821234567' },
      update: {},
      create: { id: 'client-1', phone: '+27821234567', role: 'client', passwordHash: bcrypt.hashSync('pass123', 10) },
    }),
    prisma.user.upsert({
      where:  { phone: '+27831234567' },
      update: {},
      create: { id: 'prov-raj', phone: '+27831234567', role: 'provider', passwordHash: bcrypt.hashSync('pass123', 10) },
    }),
  ])
  console.log(`✓ ${users.length} users`)

  // ── Providers ──────────────────────────────────────────────
  const providers = await Promise.all([
    prisma.provider.upsert({
      where:  { phone: '+27831234567' },
      update: {},
      create: {
        id: 'prov-raj', name: 'Raj Pillay', phone: '+27831234567', email: 'raj@example.com',
        skills: ['plumbing'], kycStatus: 'approved', status: 'active',
        rating: 4.9, reviewCount: 214, jobCount: 892, earningsBalance: 4840,
        monFri: true, saturday: true, sunday: false, emergency: true,
        lat: -29.8587, lng: 31.0218,
      },
    }),
    prisma.provider.upsert({
      where:  { phone: '+27831234568' },
      update: {},
      create: {
        id: 'prov-kevin', name: 'Kevin Mhlongo', phone: '+27831234568', email: 'kevin@example.com',
        skills: ['electrical'], kycStatus: 'approved', status: 'active',
        rating: 5.0, reviewCount: 188, jobCount: 651, earningsBalance: 7200,
        monFri: true, saturday: true, sunday: true, emergency: true,
        lat: -29.7289, lng: 31.0789,
      },
    }),
    prisma.provider.upsert({
      where:  { phone: '+27831234569' },
      update: {},
      create: {
        id: 'prov-zanele', name: 'Zanele Dlamini', phone: '+27831234569', email: 'zanele@example.com',
        skills: ['cleaning'], kycStatus: 'approved', status: 'active',
        rating: 5.0, reviewCount: 143, jobCount: 412, earningsBalance: 3100,
        monFri: true, saturday: true, sunday: false, emergency: false,
      },
    }),
    prisma.provider.upsert({
      where:  { phone: '+27831234570' },
      update: {},
      create: {
        id: 'prov-sipho', name: 'Sipho Ndlovu', phone: '+27831234570', email: 'sipho@example.com',
        skills: ['plumbing', 'handyman'], kycStatus: 'in_review', status: 'pending_kyc',
        rating: 0, reviewCount: 0, jobCount: 0, earningsBalance: 0,
        monFri: true, saturday: false, sunday: false, emergency: false,
      },
    }),
  ])
  console.log(`✓ ${providers.length} providers`)

  // ── Bookings ───────────────────────────────────────────────
  const bookings = await Promise.all([
    prisma.booking.upsert({
      where:  { id: 'b-1042' },
      update: {},
      create: {
        id: 'b-1042', clientId: 'client-1', providerId: 'prov-kevin',
        serviceType: 'electrical', status: 'en_route',
        location: 'Umhlanga', address: '14 Marine Drive, Umhlanga',
        quotedAmount: 1250, paymentHeld: true,
        notes: 'DB board fault',
      },
    }),
    prisma.booking.upsert({
      where:  { id: 'b-1039' },
      update: {},
      create: {
        id: 'b-1039', clientId: 'client-1', providerId: 'prov-raj',
        serviceType: 'plumbing', status: 'pending',
        location: 'Glenwood', address: '22 Glenwood Road, Durban',
        quotedAmount: 1000, paymentHeld: true,
        notes: 'Geyser repair',
      },
    }),
  ])
  console.log(`✓ ${bookings.length} bookings`)

  console.log('✅ Seed complete')
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
