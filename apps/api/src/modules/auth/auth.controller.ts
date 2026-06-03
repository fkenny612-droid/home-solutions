import { Controller, Post, Patch, Body, Headers, UnauthorizedException } from '@nestjs/common'
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
  register(@Body('phone') phone: string, @Body('password') password: string, @Body('role') role: 'client' | 'provider') {
    return this.svc.register(phone, password, role)
  }

  @Patch('push-token')
  savePushToken(@Body('pushToken') pushToken: string, @Headers('authorization') auth: string) {
    if (!auth) throw new UnauthorizedException()
    const token   = auth.replace('Bearer ', '')
    const payload = this.jwt.verify(token) as { sub: string }
    return this.svc.savePushToken(payload.sub, pushToken)
  }
}
