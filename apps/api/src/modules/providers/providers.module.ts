import { Module } from '@nestjs/common'
import { ProvidersController } from './providers.controller'
import { ProvidersService } from './providers.service'
import { SubscriptionsModule } from '../subscriptions/subscriptions.module'

@Module({
  imports: [SubscriptionsModule],
  controllers: [ProvidersController],
  providers: [ProvidersService],
  exports: [ProvidersService],
})
export class ProvidersModule {}
