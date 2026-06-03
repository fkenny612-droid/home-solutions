import { Controller, Post, Body, Param } from '@nestjs/common'
import { PeachPaymentsService } from './peach-payments.service'

@Controller('payments')
export class PaymentsController {
  constructor(private readonly peach: PeachPaymentsService) {}

  @Post('hold')
  holdFunds(@Body() dto: { bookingId: string; amount: number; paymentBrand: string; descriptor: string }) {
    return this.peach.holdFunds({
      amount: dto.amount,
      currency: 'ZAR',
      paymentBrand: dto.paymentBrand as any,
      descriptor: dto.descriptor,
      merchantTransactionId: dto.bookingId,
    })
  }

  @Post('release/:transactionId')
  releaseFunds(@Param('transactionId') txnId: string, @Body('amount') amount: number) {
    return this.peach.releaseFunds(txnId, amount)
  }

  @Post('payout/batch')
  batchPayout(@Body('payouts') payouts: any[]) {
    return this.peach.splitPayout(payouts)
  }
}
