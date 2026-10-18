import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { AdminGuard } from '../../common/guards/admin.guard'
import { ReportsService } from './reports.service'

@Controller('reports')
@UseGuards(AuthGuard('jwt'))
export class ReportsController {
  constructor(private readonly svc: ReportsService) {}

  @Post()
  create(@Req() req: any, @Body() dto: { targetType: string; targetId: string; reason: string; details?: string }) {
    return this.svc.create(req.user.sub, dto)
  }

  @Get()
  @UseGuards(AdminGuard)
  list(@Query('status') status?: string) {
    return this.svc.list(status)
  }

  @Post(':id/remove-content')
  @UseGuards(AdminGuard)
  removeContent(@Param('id') id: string) {
    return this.svc.removeContent(id)
  }

  @Patch(':id')
  @UseGuards(AdminGuard)
  setStatus(@Param('id') id: string, @Body('status') status: string) {
    return this.svc.setStatus(id, status)
  }
}
