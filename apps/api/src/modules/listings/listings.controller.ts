import { Controller, Get, Post, Patch, Delete, Body, Param, Query, Req, UseGuards } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { ListingsService } from './listings.service'
import { OptionalJwtGuard } from '../../common/guards/optional-jwt.guard'

@Controller('listings')
export class ListingsController {
  constructor(private readonly svc: ListingsService) {}

  @Get()
  @UseGuards(OptionalJwtGuard)
  findAll(
    @Req() req: any,
    @Query('category') category?: string,
    @Query('q')        q?:        string,
    @Query('city')     city?:     string,
  ) {
    return this.svc.findAll({ category, q, city }, req.user?.sub)
  }

  @Get('mine')
  @UseGuards(AuthGuard('jwt'))
  findMine(@Req() req: any) {
    return this.svc.findMine(req.user.sub)
  }

  @Get(':id')
  @UseGuards(OptionalJwtGuard)
  findOne(@Param('id') id: string, @Req() req: any) {
    return this.svc.findOne(id, req?.user?.sub)
  }

  @Post()
  @UseGuards(AuthGuard('jwt'))
  create(@Req() req: any, @Body() dto: any) {
    const { sub, phone, name } = req.user
    return this.svc.create(sub, phone, name ?? 'Anonymous', dto)
  }

  @Patch(':id')
  @UseGuards(AuthGuard('jwt'))
  update(@Param('id') id: string, @Req() req: any, @Body() dto: any) {
    return this.svc.update(id, req.user.sub, dto)
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'))
  remove(@Param('id') id: string, @Req() req: any) {
    return this.svc.remove(id, req.user.sub, req.user.role)
  }

  @Post(':id/save')
  @UseGuards(AuthGuard('jwt'))
  toggleSave(@Param('id') id: string, @Req() req: any) {
    return this.svc.toggleSave(id, req.user.sub)
  }
}
