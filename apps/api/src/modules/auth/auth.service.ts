import { Injectable, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import * as bcrypt from 'bcryptjs'

interface User { id: string; phone: string; role: 'client' | 'provider' | 'admin'; passwordHash: string }

const users: User[] = [
  { id: 'admin-1', phone: '+27800000000', role: 'admin', passwordHash: bcrypt.hashSync('admin123', 10) },
  { id: 'client-1', phone: '+27821234567', role: 'client', passwordHash: bcrypt.hashSync('pass123', 10) },
  { id: 'prov-raj', phone: '+27831234567', role: 'provider', passwordHash: bcrypt.hashSync('pass123', 10) },
]

@Injectable()
export class AuthService {
  constructor(private jwt: JwtService) {}

  async login(phone: string, password: string) {
    const user = users.find(u => u.phone === phone)
    if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
      throw new UnauthorizedException('Invalid credentials')
    }
    return {
      accessToken: this.jwt.sign({ sub: user.id, role: user.role, phone: user.phone }),
      user: { id: user.id, phone: user.phone, role: user.role },
    }
  }

  async register(phone: string, password: string, role: 'client' | 'provider') {
    if (users.find(u => u.phone === phone)) {
      throw new UnauthorizedException('Phone already registered')
    }
    const user: User = {
      id: `${role}-${Date.now()}`,
      phone,
      role,
      passwordHash: bcrypt.hashSync(password, 10),
    }
    users.push(user)
    return {
      accessToken: this.jwt.sign({ sub: user.id, role: user.role, phone: user.phone }),
      user: { id: user.id, phone: user.phone, role: user.role },
    }
  }
}
