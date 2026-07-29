import { Controller, Get, Patch, Param, Body, UseGuards } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { AdminGuard } from '../../common/guards/admin.guard'
import { ClientsService, SubscriptionPlan } from './clients.service'

@Controller('clients')
@UseGuards(AuthGuard('jwt'), AdminGuard)
export class ClientsController {
  constructor(private readonly svc: ClientsService) {}

  @Get()
  findAll() { return this.svc.findAll() }

  @Get(':id')
  findOne(@Param('id') id: string) { return this.svc.findOne(id) }

  @Patch(':id/subscription')
  upgradeSubscription(@Param('id') id: string, @Body('plan') plan: SubscriptionPlan) {
    return this.svc.upgradeSubscription(id, plan)
  }
}
