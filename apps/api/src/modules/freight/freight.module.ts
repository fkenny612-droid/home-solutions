import { Module } from '@nestjs/common'
import { FreightController } from './freight.controller'
import { FreightService } from './freight.service'
import { GoogleRoutesService } from './google-routes.service'

@Module({
  controllers: [FreightController],
  providers:   [FreightService, GoogleRoutesService],
})
export class FreightModule {}
