import { Controller, Get, Post, Patch, Delete, Param, Body, Query } from '@nestjs/common'
import { HardwareService } from './hardware.service'

@Controller('hardware')
export class HardwareController {
  constructor(private readonly svc: HardwareService) {}

  // ── Stores ────────────────────────────────────────────────────────────────

  @Get('stores')
  findAllStores(@Query('area') area?: string) {
    return this.svc.findAllStores(area)
  }

  @Get('stores/:id')
  findOneStore(@Param('id') id: string) {
    return this.svc.findOneStore(id)
  }

  @Post('stores')
  createStore(@Body() dto: { name: string; email: string; phone: string; address: string; areas: string[] }) {
    return this.svc.createStore(dto)
  }

  @Patch('stores/:id')
  updateStore(@Param('id') id: string, @Body() dto: any) {
    return this.svc.updateStore(id, dto)
  }

  @Get('stores/:id/stats')
  storeStats(@Param('id') id: string) {
    return this.svc.storeStats(id)
  }

  // ── Products ──────────────────────────────────────────────────────────────

  @Get('stores/:id/products')
  findProducts(@Param('id') id: string, @Query('category') category?: string) {
    return this.svc.findProducts(id, category)
  }

  @Get('products/search')
  searchProducts(@Query('q') q: string, @Query('category') category?: string) {
    return this.svc.searchProducts(q ?? '', category)
  }

  @Post('stores/:id/products')
  createProduct(@Param('id') storeId: string, @Body() dto: any) {
    return this.svc.createProduct(storeId, dto)
  }

  @Patch('products/:id')
  updateProduct(@Param('id') id: string, @Body() dto: any) {
    return this.svc.updateProduct(id, dto)
  }

  @Delete('products/:id')
  deleteProduct(@Param('id') id: string) {
    return this.svc.deleteProduct(id)
  }

  // ── Material Orders ───────────────────────────────────────────────────────

  @Post('orders')
  createOrder(@Body() dto: {
    bookingId:  string
    providerId: string
    storeId:    string
    notes?:     string
    items:      { productId: string; quantity: number }[]
  }) {
    return this.svc.createOrder(dto)
  }

  @Get('orders/booking/:bookingId')
  getOrdersByBooking(@Param('bookingId') bookingId: string) {
    return this.svc.getOrdersByBooking(bookingId)
  }

  @Get('stores/:id/orders')
  getOrdersByStore(@Param('id') storeId: string) {
    return this.svc.getOrdersByStore(storeId)
  }

  @Patch('orders/:id/status')
  updateOrderStatus(@Param('id') id: string, @Body('status') status: string) {
    return this.svc.updateOrderStatus(id, status)
  }
}
