import { Injectable, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import * as bcrypt from 'bcryptjs'
import { PrismaService } from '../../prisma/prisma.service'

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt:    JwtService,
  ) {}

  async login(phone: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { phone } })
    if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
      throw new UnauthorizedException('Invalid credentials')
    }
    return {
      accessToken: this.jwt.sign({ sub: user.id, role: user.role, phone: user.phone }),
      user: { id: user.id, phone: user.phone, role: user.role },
    }
  }

  async savePushToken(userId: string, pushToken: string) {
    await this.prisma.user.update({ where: { id: userId }, data: { pushToken } })
    return { ok: true }
  }

  async register(phone: string, password: string, role: 'client' | 'provider') {
    const existing = await this.prisma.user.findUnique({ where: { phone } })
    if (existing) throw new UnauthorizedException('Phone already registered')

    const user = await this.prisma.user.create({
      data: { phone, role, passwordHash: bcrypt.hashSync(password, 10) },
    })
    return {
      accessToken: this.jwt.sign({ sub: user.id, role: user.role, phone: user.phone }),
      user: { id: user.id, phone: user.phone, role: user.role },
    }
  }
}
