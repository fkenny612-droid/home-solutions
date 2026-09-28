import { Module } from '@nestjs/common'
import { NotificationsModule } from '../notifications/notifications.module'
import { CarrierAdminController, CarrierController } from './carrier.controller'
import { CarrierService } from './carrier.service'
import { MarketController, ShipperController } from './marketplace.controller'
import { MarketplaceService } from './marketplace.service'
import { EscrowService } from './escrow.service'
import { DeliveryService } from './delivery.service'
import {
  CarrierDeliveryController, CarrierRatingController, DriverDeliveryController, PublicTrackingController, ShipperDeliveryController,
} from './delivery.controller'
import { PaymentGatewayProvider } from './payment-gateway'
import { CarrierPaymentsController, EscrowAdminController, PaymentsWebhookController } from './payments.controller'
import { TruckLoadsController } from './truck-loads.controller'
import { DriverController } from './driver.controller'
import { ApplicationsController, PublicApplicationsController } from './applications.controller'
import { ApplicationsService } from './applications.service'
import { TruckLoadsService } from './truck-loads.service'
import { GoogleRoutesService } from './google-routes.service'
import { ChatService } from './chat.service'
import { ClaimsService } from './claims.service'
import { CarrierChatClaimsController, ClaimsAdminController, ShipperChatClaimsController } from './chat-claims.controller'

@Module({
  imports:     [NotificationsModule],
  controllers: [
    TruckLoadsController, DriverController, ApplicationsController, PublicApplicationsController,
    CarrierController, CarrierAdminController, ShipperController, MarketController,
    PaymentsWebhookController, CarrierPaymentsController, EscrowAdminController,
    DriverDeliveryController, CarrierDeliveryController, ShipperDeliveryController, CarrierRatingController, PublicTrackingController,
    ShipperChatClaimsController, CarrierChatClaimsController, ClaimsAdminController,
  ],
  providers:   [TruckLoadsService, GoogleRoutesService, ApplicationsService, CarrierService, MarketplaceService,
    EscrowService, PaymentGatewayProvider, DeliveryService, ChatService, ClaimsService,
  ],
})
export class TruckLoadsModule {}
