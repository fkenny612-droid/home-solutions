import { Injectable } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
import { ExtractJwt, Strategy } from 'passport-jwt'

export interface JwtPayload {
  sub:   string
  role:  string
  phone: string
  name?: string
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'home-solutions-dev-secret',
    })
  }

  // Returned value becomes req.user
  validate(payload: JwtPayload) {
    return { sub: payload.sub, role: payload.role, phone: payload.phone, name: payload.name }
  }
}
