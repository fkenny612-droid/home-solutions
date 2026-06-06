import { Module } from '@nestjs/common'
import { PrismaModule } from './prisma/prisma.module'
import { NotificationsModule } from './modules/notifications/notifications.module'
import { HardwareModule } from './modules/hardware/hardware.module'
import { BookingsModule } from './modules/bookings/bookings.module'
import { ProvidersModule } from './modules/providers/providers.module'
import { ClientsModule } from './modules/clients/clients.module'
import { PaymentsModule } from './modules/payments/payments.module'
import { SubscriptionsModule } from './modules/subscriptions/subscriptions.module'
import { AuthModule } from './modules/auth/auth.module'

@Module({
  imports: [
    PrismaModule,
    NotificationsModule,
    HardwareModule,
    AuthModule,
    BookingsModule,
    ProvidersModule,
    ClientsModule,
    PaymentsModule,
    SubscriptionsModule,
  ],
})
export class AppModule {}
