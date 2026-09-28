import { Module } from '@nestjs/common'
import { NotificationsModule } from '../notifications/notifications.module'
import { CarrierAdminController, CarrierController } from './carrier.controller'
import { CarrierService } from './carrier.service'
import { MarketController, ShipperController } from './marketplace.controller'
import { MarketplaceService } from './marketplace.service'
import { EscrowService } from './escrow.service'
import { PaymentGatewayProvider } from './payment-gateway'
import { CarrierPaymentsController, EscrowAdminController, PaymentsWebhookController } from './payments.controller'
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
    CarrierController, CarrierAdminController, ShipperController, MarketController,
    PaymentsWebhookController, CarrierPaymentsController, EscrowAdminController,
  ],
  providers:   [TruckLoadsService, GoogleRoutesService, ApplicationsService, CarrierService, MarketplaceService,
    EscrowService, PaymentGatewayProvider,
  ],
})
export class TruckLoadsModule {}
