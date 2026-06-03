import { Controller, Get, Param } from '@nestjs/common'
import { SubscriptionsService } from './subscriptions.service'

@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly svc: SubscriptionsService) {}

  @Get('plans')
  getPlans() { return this.svc.getPlans() }

  @Get('plans/:id')
  getPlan(@Param('id') id: string) { return this.svc.getPlan(id) }

  @Get('mrr')
  getMrr() { return this.svc.getMrr() }
}
