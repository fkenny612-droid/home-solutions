import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { NotificationsService } from '../notifications/notifications.service'
import { SmsService } from '../notifications/sms.service'

@Injectable()
export class HardwareService {
  constructor(
    private prisma:         PrismaService,
    private notifications:  NotificationsService,
    private sms:            SmsService,
  ) {}

  // ── Stores ────────────────────────────────────────────────────────────────

  findAllStores(area?: string) {
    return this.prisma.hardwareStore.findMany({
      where: {
        isActive: true,
        ...(area ? { areas: { has: area } } : {}),
      },
      include: { _count: { select: { products: true } } },
      orderBy: { name: 'asc' },
    })
  }

  findOneStore(id: string) {
    return this.prisma.hardwareStore.findUniqueOrThrow({ where: { id } })
  }

  createStore(dto: { name: string; email: string; phone: string; address: string; areas: string[] }) {
    return this.prisma.hardwareStore.create({ data: dto })
  }

  updateStore(id: string, dto: Partial<{ name: string; phone: string; address: string; areas: string[]; isActive: boolean }>) {
    return this.prisma.hardwareStore.update({ where: { id }, data: dto })
  }

  // ── Products ──────────────────────────────────────────────────────────────

  findProducts(storeId: string, category?: string) {
    return this.prisma.product.findMany({
      where: {
        storeId,
        inStock: true,
        ...(category ? { category } : {}),
      },
      orderBy: { name: 'asc' },
    })
  }

  searchProducts(query: string, category?: string) {
    return this.prisma.product.findMany({
      where: {
        inStock: true,
        ...(category ? { category } : {}),
        OR: [
          { name:        { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
          { sku:         { contains: query, mode: 'insensitive' } },
        ],
      },
      include: { store: { select: { name: true, areas: true } } },
      take: 30,
    })
  }

  createProduct(storeId: string, dto: {
    name: string; category: string; description?: string
    unit: string; price: number; sku?: string
  }) {
    return this.prisma.product.create({ data: { ...dto, storeId } })
  }

  updateProduct(id: string, dto: Partial<{ name: string; price: number; inStock: boolean; description: string; unit: string }>) {
    return this.prisma.product.update({ where: { id }, data: dto })
  }

  deleteProduct(id: string) {
    return this.prisma.product.delete({ where: { id } })
  }

  // ── Material Orders ───────────────────────────────────────────────────────

  async createOrder(dto: {
    bookingId:  string
    providerId: string
    storeId:    string
    notes?:     string
    items:      { productId: string; quantity: number }[]
  }) {
    // Fetch product prices
    const productIds = dto.items.map(i => i.productId)
    const products   = await this.prisma.product.findMany({ where: { id: { in: productIds } } })
    const priceMap   = Object.fromEntries(products.map(p => [p.id, p.price]))

    const itemsWithTotals = dto.items.map(i => ({
      productId: i.productId,
      quantity:  i.quantity,
      unitPrice: priceMap[i.productId] ?? 0,
      total:     i.quantity * (priceMap[i.productId] ?? 0),
    }))

    const totalAmount = itemsWithTotals.reduce((sum, i) => sum + i.total, 0)

    const order = await this.prisma.materialOrder.create({
      data: {
        bookingId:   dto.bookingId,
        providerId:  dto.providerId,
        storeId:     dto.storeId,
        notes:       dto.notes,
        totalAmount,
        items: { create: itemsWithTotals },
      },
      include: { store: true, items: { include: { product: true } } },
    })

    // Notify the hardware store via SMS
    this.sms.send(
      order.store.phone,
      `HomeSolutions: New material order #${order.id.slice(-6).toUpperCase()} received. ` +
      `${order.items.length} item(s), total R${totalAmount.toFixed(2)}. Log in to confirm.`
    ).catch(() => {})

    return order
  }

  getOrdersByBooking(bookingId: string) {
    return this.prisma.materialOrder.findMany({
      where:   { bookingId },
      include: { store: true, items: { include: { product: true } } },
    })
  }

  getOrdersByStore(storeId: string) {
    return this.prisma.materialOrder.findMany({
      where:   { storeId },
      include: { items: { include: { product: true } } },
      orderBy: { createdAt: 'desc' },
    })
  }

  updateOrderStatus(id: string, status: string) {
    return this.prisma.materialOrder.update({ where: { id }, data: { status } })
  }

  // ── Analytics for hardware store dashboard ────────────────────────────────

  async storeStats(storeId: string) {
    const [totalOrders, pendingOrders, products, revenue] = await Promise.all([
      this.prisma.materialOrder.count({ where: { storeId } }),
      this.prisma.materialOrder.count({ where: { storeId, status: 'pending' } }),
      this.prisma.product.count({ where: { storeId } }),
      this.prisma.materialOrder.aggregate({ where: { storeId }, _sum: { totalAmount: true } }),
    ])
    return {
      totalOrders,
      pendingOrders,
      products,
      totalRevenue: revenue._sum.totalAmount ?? 0,
    }
  }
}
