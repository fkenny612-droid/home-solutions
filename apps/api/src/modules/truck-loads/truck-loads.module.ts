import { Module } from '@nestjs/common'
import { TruckLoadsController } from './truck-loads.controller'
import { DriverController } from './driver.controller'
import { ApplicationsController, PublicApplicationsController } from './applications.controller'
import { ApplicationsService } from './applications.service'
import { TruckLoadsService } from './truck-loads.service'
import { GoogleRoutesService } from './google-routes.service'

@Module({
  controllers: [TruckLoadsController, DriverController, ApplicationsController, PublicApplicationsController],
  providers:   [TruckLoadsService, GoogleRoutesService, ApplicationsService],
})
export class TruckLoadsModule {}
