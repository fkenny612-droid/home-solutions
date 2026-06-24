import { Controller, Get, Post, Body, Req, UseGuards } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { LoyaltyService } from './loyalty.service'

@Controller('loyalty')
export class LoyaltyController {
  constructor(private readonly svc: LoyaltyService) {}

  @Get('rewards')
  getRewards() {
    return this.svc.getRewards()
  }

  @Get('balance')
  @UseGuards(AuthGuard('jwt'))
  getBalance(@Req() req: any) {
    return this.svc.getBalance(req.user.sub)
  }

  @Get('redemptions')
  @UseGuards(AuthGuard('jwt'))
  getMyRedemptions(@Req() req: any) {
    return this.svc.getMyRedemptions(req.user.sub)
  }

  @Post('redeem')
  @UseGuards(AuthGuard('jwt'))
  redeem(@Req() req: any, @Body('rewardId') rewardId: string) {
    return this.svc.redeem(req.user.sub, rewardId)
  }
}
