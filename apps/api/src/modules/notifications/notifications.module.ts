import { Global, Module } from '@nestjs/common'
import { NotificationsService } from './notifications.service'
import { NotificationsController } from './notifications.controller'
import { SmsService } from './sms.service'
import { PrismaModule } from '../../prisma/prisma.module'

@Global()
@Module({
  imports:     [PrismaModule],
  controllers: [NotificationsController],
  providers:   [NotificationsService, SmsService],
  exports:     [NotificationsService, SmsService],
})
export class NotificationsModule {}
