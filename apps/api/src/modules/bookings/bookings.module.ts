import { Module } from '@nestjs/common'
import { BookingsController } from './bookings.controller'
import { BookingsService } from './bookings.service'
import { SubscriptionsModule } from '../subscriptions/subscriptions.module'

@Module({
  imports: [SubscriptionsModule],
  controllers: [BookingsController],
  providers: [BookingsService],
  exports: [BookingsService],
})
export class BookingsModule {}
