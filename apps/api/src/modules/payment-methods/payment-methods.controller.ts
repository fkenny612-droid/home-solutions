import { Controller, Get, Post, Delete, Patch, Body, Param, UseGuards, Request } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { PaymentMethodsService } from './payment-methods.service'

@Controller('payment-methods')
@UseGuards(AuthGuard('jwt'))
export class PaymentMethodsController {
  constructor(private svc: PaymentMethodsService) {}

  @Get()
  list(@Request() req: any) {
    return this.svc.list(req.user.sub)
  }

  @Post()
  add(@Request() req: any, @Body() dto: { brand: string; last4: string; expiry: string; holderName: string }) {
    return this.svc.add(req.user.sub, dto)
  }

  @Patch(':id/default')
  setDefault(@Param('id') id: string, @Request() req: any) {
    return this.svc.setDefault(id, req.user.sub)
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req: any) {
    return this.svc.remove(id, req.user.sub)
  }
}
