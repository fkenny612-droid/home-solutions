import { Module } from '@nestjs/common'
import { TruckLoadsController } from './truck-loads.controller'
import { DriverController } from './driver.controller'
import { TruckLoadsService } from './truck-loads.service'
import { GoogleRoutesService } from './google-routes.service'

@Module({
  controllers: [TruckLoadsController, DriverController],
  providers:   [TruckLoadsService, GoogleRoutesService],
})
export class TruckLoadsModule {}
