import { BadRequestException, Body, ConflictException, Controller, ForbiddenException, HttpException, HttpStatus, Logger, NotFoundException, Post, Req, UseGuards } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { AdminGuard } from '../../common/guards/admin.guard'
import { PrismaService } from '../../prisma/prisma.service'
import { PeachPaymentsService } from './peach-payments.service'

const BRANDS: Record<string, 'VISA' | 'MASTER' | 'AMEX'> = { VISA: 'VISA', MASTER: 'MASTER', MASTERCARD: 'MASTER', AMEX: 'AMEX' }

interface CardDto { number: string; holder: string; expiry: string; cvv: string }

function validCard(card?: Partial<CardDto>): card is CardDto {
  return !!card
    && typeof card.number === 'string' && /^\d{12,19}$/.test(card.number)
    && typeof card.holder === 'string' && card.holder.trim().length > 0
    && typeof card.expiry === 'string' && /^\d{2}\/\d{2}$/.test(card.expiry)
    && typeof card.cvv === 'string' && /^\d{3,4}$/.test(card.cvv)
}

/**
 * The amount held and the descriptor always come from the booking — never from the request —
 * and capture/void happen on the server when a booking is completed or cancelled
 * (see BookingsService.reconcilePayment). Clients can only start a hold.
 */
@Controller('payments')
@UseGuards(AuthGuard('jwt'))
export class PaymentsController {
  private readonly logger = new Logger(PaymentsController.name)
  /** Bookings with a hold request in flight — stops a double-tap charging the card twice. (Single API instance.) */
  private readonly inFlight = new Set<string>()

  constructor(
    private readonly peach:  PeachPaymentsService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('hold')
  async holdFunds(
    @Body() dto: { bookingId: string; paymentBrand: string; card?: Partial<CardDto> },
    @Req() req: any,
  ) {
    if (typeof dto?.bookingId !== 'string' || !dto.bookingId) throw new BadRequestException('bookingId is required')
    const booking = await this.prisma.booking.findUnique({ where: { id: dto.bookingId } })
    if (!booking) throw new NotFoundException('Booking not found')
    if (req.user.role !== 'admin' && booking.clientId !== req.user.sub) throw new ForbiddenException('Not your booking')
    if (booking.status !== 'pending' && booking.status !== 'accepted') {
      throw new ConflictException('This booking is no longer open for payment')
    }

    // Retrying after a success is harmless: report the existing hold instead of charging again.
    if (booking.paymentHeld && booking.transactionId) return { success: true, transactionId: booking.transactionId }

    const brand = BRANDS[String(dto.paymentBrand ?? '').toUpperCase()]
    if (!brand) throw new BadRequestException('Unsupported card type')
    if (!validCard(dto.card)) throw new BadRequestException('Please check your card details')

    if (this.inFlight.has(booking.id)) throw new ConflictException('A payment for this booking is already being processed')
    this.inFlight.add(booking.id)
    try {
      let result
      try {
        result = await this.peach.holdFunds({
          amount: booking.quotedAmount,
          currency: 'ZAR',
          paymentBrand: brand,
          descriptor: `Easyfix ${booking.id.slice(-8).toUpperCase()}`,
          merchantTransactionId: booking.id,
          card: dto.card,
        })
      } catch (err) {
        // Log what failed, never the request (it contains the card).
        this.logger.error(`Hold failed for booking ${booking.id}: ${(err as Error)?.message}`)
        throw new HttpException('We could not reach the payment provider. You have not been charged — please try again.', HttpStatus.BAD_GATEWAY)
      }

      if (!result.success) {
        this.logger.warn(`Hold declined for booking ${booking.id}`)
        throw new HttpException('Your card was not approved. Please check the details or try another card.', HttpStatus.PAYMENT_REQUIRED)
      }

      await this.prisma.booking.update({
        where: { id: booking.id },
        data:  { transactionId: result.transactionId, paymentHeld: true },
      })
      return { success: true, transactionId: result.transactionId }
    } finally {
      this.inFlight.delete(booking.id)
    }
  }

  @Post('payout/batch')
  @UseGuards(AdminGuard)
  batchPayout(@Body('payouts') payouts: any[]) {
    return this.peach.splitPayout(payouts)
  }
}
