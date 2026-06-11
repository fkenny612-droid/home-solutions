import { Controller, Get, Post, Delete, Body, Req, UseGuards } from '@nestjs/common'
import { SubscriptionsService } from './subscriptions.service'
import { AuthGuard } from '@nestjs/passport'

@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly svc: SubscriptionsService) {}

  @Get('client-plans')
  getClientPlans() { return this.svc.getClientPlans() }

  @Get('provider-plans')
  getProviderPlans() { return this.svc.getProviderPlans() }

  @Get('my')
  @UseGuards(AuthGuard('jwt'))
  getMy(@Req() req: any) {
    return this.svc.getMy(req.user.id, req.user.role)
  }

  @Post('subscribe')
  @UseGuards(AuthGuard('jwt'))
  subscribe(@Req() req: any, @Body() body: { planId: string; peachTokenId?: string }) {
    return this.svc.subscribe(req.user.id, req.user.role, body.planId, body.peachTokenId)
  }

  @Delete('cancel')
  @UseGuards(AuthGuard('jwt'))
  cancel(@Req() req: any) {
    return this.svc.cancel(req.user.id, req.user.role)
  }

  @Get('mrr')
  getMrr() { return this.svc.getMrr() }
}
