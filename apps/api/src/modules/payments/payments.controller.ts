import { Controller, Post, Body, Param, Req, UseGuards, ForbiddenException, NotFoundException } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { AdminGuard } from '../../common/guards/admin.guard'
import { PrismaService } from '../../prisma/prisma.service'
import { PeachPaymentsService } from './peach-payments.service'

@Controller('payments')
@UseGuards(AuthGuard('jwt'))
export class PaymentsController {
  constructor(
    private readonly peach:  PeachPaymentsService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('hold')
  async holdFunds(
    @Body() dto: { bookingId: string; amount: number; paymentBrand: string; descriptor: string; card?: { number: string; holder: string; expiry: string; cvv: string } },
    @Req() req: any,
  ) {
    const booking = await this.prisma.booking.findUnique({ where: { id: dto.bookingId } })
    if (!booking) throw new NotFoundException('Booking not found')
    if (req.user.role !== 'admin' && booking.clientId !== req.user.sub) {
      throw new ForbiddenException('Not your booking')
    }

    const result = await this.peach.holdFunds({
      amount: dto.amount,
      currency: 'ZAR',
      paymentBrand: dto.paymentBrand as any,
      descriptor: dto.descriptor,
      merchantTransactionId: dto.bookingId,
      card: dto.card,
    })

    if (result.success) {
      await this.prisma.booking.update({
        where: { id: dto.bookingId },
        data:  { transactionId: result.transactionId, paymentHeld: true },
      })
    }

    return result
  }

  @Post('release/:transactionId')
  async releaseFunds(@Param('transactionId') txnId: string, @Body('amount') amount: number, @Req() req: any) {
    const booking = await this.prisma.booking.findFirst({ where: { transactionId: txnId } })
    if (!booking) throw new NotFoundException('No booking found for this transaction')
    const isParty = booking.clientId === req.user.sub || booking.providerId === req.user.sub
    if (req.user.role !== 'admin' && !isParty) throw new ForbiddenException()

    return this.peach.releaseFunds(txnId, amount)
  }

  @Post('payout/batch')
  @UseGuards(AdminGuard)
  batchPayout(@Body('payouts') payouts: any[]) {
    return this.peach.splitPayout(payouts)
  }
}
