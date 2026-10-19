import { Body, Controller, Delete, Get, Param, Post, Req, UseGuards } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { BlocksService } from './blocks.service'

@Controller('blocks')
@UseGuards(AuthGuard('jwt'))
export class BlocksController {
  constructor(private readonly svc: BlocksService) {}

  @Get()
  list(@Req() req: any) {
    return this.svc.list(req.user.sub)
  }

  @Post()
  block(@Req() req: any, @Body('userId') userId: string) {
    return this.svc.block(req.user.sub, userId)
  }

  @Delete(':userId')
  unblock(@Req() req: any, @Param('userId') userId: string) {
    return this.svc.unblock(req.user.sub, userId)
  }
}
