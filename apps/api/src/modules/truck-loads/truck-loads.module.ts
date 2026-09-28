import { Module } from '@nestjs/common'
import { NotificationsModule } from '../notifications/notifications.module'
import { CarrierAdminController, CarrierController } from './carrier.controller'
import { CarrierService } from './carrier.service'
import { TruckLoadsController } from './truck-loads.controller'
import { DriverController } from './driver.controller'
import { ApplicationsController, PublicApplicationsController } from './applications.controller'
import { ApplicationsService } from './applications.service'
import { TruckLoadsService } from './truck-loads.service'
import { GoogleRoutesService } from './google-routes.service'

@Module({
  imports:     [NotificationsModule],
  controllers: [
    TruckLoadsController, DriverController, ApplicationsController, PublicApplicationsController,
    CarrierController, CarrierAdminController,
  ],
  providers:   [TruckLoadsService, GoogleRoutesService, ApplicationsService, CarrierService],
})
export class TruckLoadsModule {}
