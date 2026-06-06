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

  // ── Hardware Stores ────────────────────────────────────────────────────────
  const store1 = await prisma.hardwareStore.upsert({
    where:  { email: 'durban@builderswarehouse.co.za' },
    update: {},
    create: {
      name:    'Builders Warehouse Durban',
      email:   'durban@builderswarehouse.co.za',
      phone:   '+27313001000',
      address: '1 Masabalala Yengwa Ave, Durban',
      areas:   ['Durban CBD', 'Berea', 'Glenwood', 'Morningside'],
    },
  })

  const store2 = await prisma.hardwareStore.upsert({
    where:  { email: 'umhlanga@cashbuild.co.za' },
    update: {},
    create: {
      name:    'Cashbuild Umhlanga',
      email:   'umhlanga@cashbuild.co.za',
      phone:   '+27315601000',
      address: 'Umhlanga Rocks Drive, Umhlanga',
      areas:   ['Umhlanga', 'La Lucia', 'Ballito', 'Durban North'],
    },
  })
  console.log('✓ 2 hardware stores')

  // ── Products ───────────────────────────────────────────────────────────────
  const PRODUCTS = [
    // Plumbing
    { storeId: store1.id, name: '15mm Copper pipe (per metre)',    category: 'plumbing',   unit: 'm',    price: 85,   sku: 'CU-15MM' },
    { storeId: store1.id, name: '22mm Compression elbow',          category: 'plumbing',   unit: 'each', price: 32,   sku: 'EL-22MM' },
    { storeId: store1.id, name: 'Geyser element 3kW',              category: 'plumbing',   unit: 'each', price: 320,  sku: 'GE-3KW'  },
    { storeId: store1.id, name: 'Basin waste plug & chain',        category: 'plumbing',   unit: 'each', price: 45,   sku: 'BW-001'  },
    { storeId: store1.id, name: 'PTFE thread seal tape',           category: 'plumbing',   unit: 'each', price: 12,   sku: 'PT-001'  },
    { storeId: store1.id, name: 'Gate valve 15mm',                 category: 'plumbing',   unit: 'each', price: 95,   sku: 'GV-15'   },
    // Electrical
    { storeId: store1.id, name: '2.5mm² twin & earth cable (m)',   category: 'electrical', unit: 'm',    price: 22,   sku: 'TE-2.5'  },
    { storeId: store1.id, name: 'Single gang socket outlet',        category: 'electrical', unit: 'each', price: 65,   sku: 'SO-001'  },
    { storeId: store1.id, name: 'Double gang socket outlet',        category: 'electrical', unit: 'each', price: 95,   sku: 'SO-002'  },
    { storeId: store1.id, name: '16A circuit breaker',              category: 'electrical', unit: 'each', price: 120,  sku: 'CB-16A'  },
    { storeId: store1.id, name: 'LED downlight 10W warm white',     category: 'electrical', unit: 'each', price: 85,   sku: 'LED-10W' },
    { storeId: store1.id, name: 'Conduit 20mm (per metre)',         category: 'electrical', unit: 'm',    price: 18,   sku: 'CO-20'   },
    // Tiling
    { storeId: store2.id, name: 'Tile adhesive 20kg bag',           category: 'tiling',     unit: 'bag',  price: 185,  sku: 'TA-20'   },
    { storeId: store2.id, name: 'Tile grout white 2kg',             category: 'tiling',     unit: 'bag',  price: 65,   sku: 'TG-WH'   },
    { storeId: store2.id, name: 'Tile spacers 3mm (pack 500)',       category: 'tiling',     unit: 'pack', price: 35,   sku: 'TS-3MM'  },
    { storeId: store2.id, name: 'Waterproofing membrane 20L',        category: 'tiling',     unit: 'each', price: 425,  sku: 'WP-20L'  },
    // Painting
    { storeId: store2.id, name: 'PVA paint white 20L',              category: 'painting',   unit: 'each', price: 550,  sku: 'PV-20'   },
    { storeId: store2.id, name: 'Acrylic wall sealer 5L',           category: 'painting',   unit: 'each', price: 185,  sku: 'AS-5L'   },
    { storeId: store2.id, name: '9" paint roller sleeve',           category: 'painting',   unit: 'each', price: 45,   sku: 'PR-9'    },
    { storeId: store2.id, name: 'Masking tape 48mm×50m',            category: 'painting',   unit: 'each', price: 28,   sku: 'MT-48'   },
    // General
    { storeId: store1.id, name: 'Silicone sealant clear',           category: 'general',    unit: 'each', price: 55,   sku: 'SI-CL'   },
    { storeId: store1.id, name: 'Rawl bolts M8 (pack 10)',          category: 'general',    unit: 'pack', price: 42,   sku: 'RB-M8'   },
    { storeId: store1.id, name: 'Wood screws 50mm (pack 100)',       category: 'general',    unit: 'pack', price: 38,   sku: 'WS-50'   },
    { storeId: store2.id, name: 'Cable ties 300mm (pack 100)',       category: 'general',    unit: 'pack', price: 32,   sku: 'CT-300'  },
  ]

  for (const p of PRODUCTS) {
    await prisma.product.upsert({
      where:  { id: p.sku },
      update: { price: p.price },
      create: { ...p, id: p.sku },
    })
  }
  console.log(`✓ ${PRODUCTS.length} products`)

  console.log('✅ Seed complete')
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
