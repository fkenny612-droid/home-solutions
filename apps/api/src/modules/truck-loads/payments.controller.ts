import { Body, Controller, Get, HttpCode, Param, Post, Query, Req, UnauthorizedException, UseGuards } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { IsBoolean, IsString, MaxLength, MinLength } from 'class-validator'
import { AdminGuard } from '../../common/guards/admin.guard'
import { EscrowService } from './escrow.service'
import { MarketplaceService } from './marketplace.service'
import { PaymentGatewayProvider } from './payment-gateway'

class TestPayDto { @IsBoolean() succeed: boolean }
class ReferenceDto { @IsString() @MinLength(2) @MaxLength(100) reference: string }

/** Payment provider callbacks and the test checkout. */
@Controller('truck-loads/payments')
export class PaymentsWebhookController {
  constructor(private market: MarketplaceService, private gateways: PaymentGatewayProvider) {}

  /** Server-to-server notification from the payment provider (signed). */
  @Post('webhook')
  @HttpCode(200)
  async webhook(@Req() req: any, @Body() body: any) {
    const result = this.gateways.gateway.verifyWebhook(req.headers, req.rawBody, body)
    if (!result) throw new UnauthorizedException('Invalid webhook signature')
    await this.market.onPaymentResult(result.paymentId, result.succeeded, result.providerPaymentId, result.description)
    return { ok: true }
  }

  /** Test mode only: the shipper's "pay" / "decline" on the test checkout page. */
  @Post('test/:paymentId')
  @UseGuards(AuthGuard('jwt'))
  testPay(@Req() req: any, @Param('paymentId') id: string, @Body() dto: TestPayDto) {
    return this.market.testPay(req.user.sub, id, dto.succeed)
  }
}

/** Carrier: what they've been / will be paid. */
@Controller('truck-loads')
@UseGuards(AuthGuard('jwt'))
export class CarrierPaymentsController {
  constructor(private escrow: EscrowService) {}

  @Get('payments')
  list(@Req() req: any) {
    return this.escrow.carrierPayments(req.user.sub)
  }

  @Get('loads/:id/payment')
  forLoad(@Req() req: any, @Param('id') id: string) {
    return this.escrow.forCarrierLoad(req.user.sub, id)
  }
}

/** Platform admin: payouts to carriers and refunds to shippers. */
@Controller('truck-loads/admin/payments')
@UseGuards(AuthGuard('jwt'), AdminGuard)
export class EscrowAdminController {
  constructor(private escrow: EscrowService) {}

  @Get()
  list(@Query('status') status?: string) {
    return this.escrow.adminList(status)
  }

  @Post(':id/paid-out')
  paidOut(@Param('id') id: string, @Body() dto: ReferenceDto) {
    return this.escrow.adminMarkPaidOut(id, dto.reference.trim())
  }

  @Post(':id/refunded')
  refunded(@Param('id') id: string, @Body() dto: ReferenceDto) {
    return this.escrow.adminMarkRefunded(id, dto.reference.trim())
  }

  /** Run the claim-window release now (it also runs hourly). */
  @Post('release-due')
  releaseDue() {
    return this.escrow.releaseDue().then(released => ({ released }))
  }
}
