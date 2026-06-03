import { Controller, Post, Body } from '@nestjs/common'
import { AuthService } from './auth.service'

@Controller('auth')
export class AuthController {
  constructor(private readonly svc: AuthService) {}

  @Post('login')
  login(@Body('phone') phone: string, @Body('password') password: string) {
    return this.svc.login(phone, password)
  }

  @Post('register')
  register(@Body('phone') phone: string, @Body('password') password: string, @Body('role') role: 'client' | 'provider') {
    return this.svc.register(phone, password, role)
  }
}
