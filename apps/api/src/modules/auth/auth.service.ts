import { Injectable, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import * as bcrypt from 'bcryptjs'
import { PrismaService } from '../../prisma/prisma.service'

export interface RegisterDto {
  phone:               string
  email:               string
  password:            string
  firstName:           string
  lastName:            string
  role:                'client' | 'provider'
  // Provider only
  companyName?:        string
  companyRegistration?: string
  vatNumber?:          string
  serviceArea?:        string
}

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
      user: { id: user.id, phone: user.phone, role: user.role, firstName: user.firstName, lastName: user.lastName },
    }
  }

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findFirst({
      where: { OR: [{ phone: dto.phone }, { email: dto.email }] },
    })
    if (existing) {
      throw new UnauthorizedException(
        existing.phone === dto.phone ? 'Phone already registered' : 'Email already registered'
      )
    }

    const user = await this.prisma.user.create({
      data: {
        phone:               dto.phone,
        email:               dto.email,
        passwordHash:        bcrypt.hashSync(dto.password, 10),
        role:                dto.role,
        firstName:           dto.firstName,
        lastName:            dto.lastName,
        companyName:         dto.companyName,
        companyRegistration: dto.companyRegistration,
        vatNumber:           dto.vatNumber || null,
        serviceArea:         dto.serviceArea,
      },
    })

    // If provider, create their provider profile too
    if (dto.role === 'provider') {
      await this.prisma.provider.upsert({
        where:  { phone: dto.phone },
        update: {},
        create: {
          id:     user.id,
          name:   `${dto.firstName} ${dto.lastName}`,
          phone:  dto.phone,
          email:  dto.email,
          skills: [],
          status: 'pending_kyc',
          kycStatus: 'pending',
        },
      })
    }

    return {
      accessToken: this.jwt.sign({ sub: user.id, role: user.role, phone: user.phone }),
      user: { id: user.id, phone: user.phone, role: user.role, firstName: user.firstName, lastName: user.lastName },
    }
  }

  async savePushToken(userId: string, pushToken: string) {
    await this.prisma.user.update({ where: { id: userId }, data: { pushToken } })
    return { ok: true }
  }
}
