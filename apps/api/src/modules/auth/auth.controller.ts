import { Controller, Post, Patch, Get, Delete, Body, Headers, Param, UnauthorizedException, Req, UseGuards } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { AuthService } from './auth.service'
import { JwtService } from '@nestjs/jwt'

@Controller('auth')
export class AuthController {
  constructor(
    private readonly svc: AuthService,
    private readonly jwt: JwtService,
  ) {}

  @Post('login')
  login(@Body('phone') phone: string, @Body('password') password: string) {
    return this.svc.login(phone, password)
  }

  @Post('register')
  register(@Body() body: {
    phone: string; email: string; password: string
    firstName: string; lastName: string; role: 'client' | 'provider'
    companyName?: string; companyRegistration?: string
    vatNumber?: string; serviceArea?: string
  }) {
    return this.svc.register(body)
  }

  @Patch('push-token')
  savePushToken(@Body('pushToken') pushToken: string, @Headers('authorization') auth: string) {
    if (!auth) throw new UnauthorizedException()
    const token   = auth.replace('Bearer ', '')
    const payload = this.jwt.verify(token) as { sub: string }
    return this.svc.savePushToken(payload.sub, pushToken)
  }

  @Patch('profile')
  @UseGuards(AuthGuard('jwt'))
  updateProfile(@Req() req: any, @Body() body: { firstName?: string; lastName?: string; email?: string }) {
    return this.svc.updateProfile(req.user.sub, body)
  }

  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  getMe(@Req() req: any) {
    return this.svc.updateProfile(req.user.sub, {})
  }

  @Get('bank-account')
  @UseGuards(AuthGuard('jwt'))
  getBankAccount(@Req() req: any) {
    return this.svc.getBankAccount(req.user.sub)
  }

  @Post('bank-account')
  @UseGuards(AuthGuard('jwt'))
  saveBankAccount(@Req() req: any, @Body() body: { accountHolder: string; bankName: string; accountNumber: string; branchCode: string; accountType: string }) {
    return this.svc.saveBankAccount(req.user.sub, body)
  }

  @Get('addresses')
  @UseGuards(AuthGuard('jwt'))
  getAddresses(@Req() req: any) {
    return this.svc.getAddresses(req.user.sub)
  }

  @Post('addresses')
  @UseGuards(AuthGuard('jwt'))
  saveAddress(@Req() req: any, @Body() body: { label: string; address: string }) {
    return this.svc.saveAddress(req.user.sub, body)
  }

  @Patch('addresses/:id/default')
  @UseGuards(AuthGuard('jwt'))
  setDefaultAddress(@Req() req: any, @Param('id') id: string) {
    return this.svc.setDefaultAddress(req.user.sub, id)
  }

  @Delete('addresses/:id')
  @UseGuards(AuthGuard('jwt'))
  deleteAddress(@Req() req: any, @Param('id') id: string) {
    return this.svc.deleteAddress(req.user.sub, id)
  }
}
