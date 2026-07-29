import { Controller, Get, Post, Patch, Delete, Param, Body, Query, Req, UseGuards, ForbiddenException, NotFoundException } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { AdminGuard } from '../../common/guards/admin.guard'
import { PrismaService } from '../../prisma/prisma.service'
import { HardwareService } from './hardware.service'

@Controller('hardware')
export class HardwareController {
  constructor(
    private readonly svc: HardwareService,
    private readonly prisma: PrismaService,
  ) {}

  // ── Stores (public reads, admin-only writes) ────────────────────────────────

  @Get('stores')
  findAllStores(@Query('area') area?: string) {
    return this.svc.findAllStores(area)
  }

  @Get('stores/:id')
  findOneStore(@Param('id') id: string) {
    return this.svc.findOneStore(id)
  }

  @Post('stores')
  @UseGuards(AuthGuard('jwt'), AdminGuard)
  createStore(@Body() dto: { name: string; email: string; phone: string; address: string; areas: string[] }) {
    return this.svc.createStore(dto)
  }

  @Patch('stores/:id')
  @UseGuards(AuthGuard('jwt'), AdminGuard)
  updateStore(@Param('id') id: string, @Body() dto: any) {
    return this.svc.updateStore(id, dto)
  }

  @Get('stores/:id/stats')
  @UseGuards(AuthGuard('jwt'), AdminGuard)
  storeStats(@Param('id') id: string) {
    return this.svc.storeStats(id)
  }

  // ── Products (public reads, admin-only writes) ──────────────────────────────

  @Get('stores/:id/products')
  findProducts(@Param('id') id: string, @Query('category') category?: string) {
    return this.svc.findProducts(id, category)
  }

  @Get('products/search')
  searchProducts(@Query('q') q: string, @Query('category') category?: string) {
    return this.svc.searchProducts(q ?? '', category)
  }

  @Post('stores/:id/products')
  @UseGuards(AuthGuard('jwt'), AdminGuard)
  createProduct(@Param('id') storeId: string, @Body() dto: any) {
    return this.svc.createProduct(storeId, dto)
  }

  @Patch('products/:id')
  @UseGuards(AuthGuard('jwt'), AdminGuard)
  updateProduct(@Param('id') id: string, @Body() dto: any) {
    return this.svc.updateProduct(id, dto)
  }

  @Delete('products/:id')
  @UseGuards(AuthGuard('jwt'), AdminGuard)
  deleteProduct(@Param('id') id: string) {
    return this.svc.deleteProduct(id)
  }

  // ── Material Orders (authenticated; scoped to the booking's parties) ───────

  @Post('orders')
  @UseGuards(AuthGuard('jwt'))
  createOrder(
    @Body() dto: {
      bookingId:  string
      providerId: string
      storeId:    string
      notes?:     string
      items:      { productId: string; quantity: number }[]
    },
    @Req() req: any,
  ) {
    // providerId always comes from the verified JWT unless the caller is an admin
    const providerId = req.user.role === 'admin' ? dto.providerId : req.user.sub
    return this.svc.createOrder({ ...dto, providerId })
  }

  @Get('orders/booking/:bookingId')
  @UseGuards(AuthGuard('jwt'))
  async getOrdersByBooking(@Param('bookingId') bookingId: string, @Req() req: any) {
    if (req.user.role !== 'admin') {
      const booking = await this.prisma.booking.findUnique({ where: { id: bookingId } })
      if (!booking) throw new NotFoundException('Booking not found')
      const isParty = booking.clientId === req.user.sub || booking.providerId === req.user.sub
      if (!isParty) throw new ForbiddenException()
    }
    return this.svc.getOrdersByBooking(bookingId)
  }

  @Get('stores/:id/orders')
  @UseGuards(AuthGuard('jwt'), AdminGuard)
  getOrdersByStore(@Param('id') storeId: string) {
    return this.svc.getOrdersByStore(storeId)
  }

  @Patch('orders/:id/status')
  @UseGuards(AuthGuard('jwt'), AdminGuard)
  updateOrderStatus(@Param('id') id: string, @Body('status') status: string) {
    return this.svc.updateOrderStatus(id, status)
  }
}
