import { Module } from '@nestjs/common'
import { PaymentsController } from './payments.controller'
import { PeachPaymentsService } from './peach-payments.service'

@Module({
  controllers: [PaymentsController],
  providers: [PeachPaymentsService],
  exports: [PeachPaymentsService],
})
export class PaymentsModule {}
