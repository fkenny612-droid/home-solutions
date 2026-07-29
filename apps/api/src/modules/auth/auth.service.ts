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
  referralCode?:       string
}

function generateReferralCode(firstName: string) {
  const prefix = (firstName || 'USER').replace(/[^a-zA-Z]/g, '').toUpperCase().slice(0, 5) || 'USER'
  const suffix = Math.floor(1000 + Math.random() * 9000)
  return `${prefix}${suffix}`
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
      accessToken: this.jwt.sign({ sub: user.id, role: user.role, phone: user.phone, name: [user.firstName, user.lastName].filter(Boolean).join(' ') }),
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

    let referredById: string | null = null
    if (dto.referralCode) {
      const referrer = await this.prisma.user.findUnique({ where: { referralCode: dto.referralCode.toUpperCase() } })
      if (referrer) referredById = referrer.id
    }

    let referralCode = generateReferralCode(dto.firstName)
    while (await this.prisma.user.findUnique({ where: { referralCode } })) referralCode = generateReferralCode(dto.firstName)

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
        referralCode,
        referredById,
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
      accessToken: this.jwt.sign({ sub: user.id, role: user.role, phone: user.phone, name: [user.firstName, user.lastName].filter(Boolean).join(' ') }),
      user: { id: user.id, phone: user.phone, role: user.role, firstName: user.firstName, lastName: user.lastName },
    }
  }

  async savePushToken(userId: string, pushToken: string) {
    await this.prisma.user.update({ where: { id: userId }, data: { pushToken } })
    return { ok: true }
  }

  async getBankAccount(userId: string) {
    return this.prisma.bankAccount.findUnique({ where: { userId } })
  }

  async saveBankAccount(userId: string, dto: { accountHolder: string; bankName: string; accountNumber: string; branchCode: string; accountType: string }) {
    return this.prisma.bankAccount.upsert({
      where:  { userId },
      update: dto,
      create: { userId, ...dto },
    })
  }

  async getAddresses(userId: string) {
    return this.prisma.savedAddress.findMany({ where: { userId }, orderBy: { createdAt: 'asc' } })
  }

  async saveAddress(userId: string, dto: { label: string; address: string }) {
    const count = await this.prisma.savedAddress.count({ where: { userId } })
    return this.prisma.savedAddress.create({ data: { userId, ...dto, isDefault: count === 0 } })
  }

  async setDefaultAddress(userId: string, addressId: string) {
    await this.prisma.savedAddress.updateMany({ where: { userId }, data: { isDefault: false } })
    return this.prisma.savedAddress.update({ where: { id: addressId }, data: { isDefault: true } })
  }

  async deleteAddress(userId: string, addressId: string) {
    await this.prisma.savedAddress.deleteMany({ where: { id: addressId, userId } })
    return { ok: true }
  }

  async getReferral(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } })
    const referred = await this.prisma.user.findMany({ where: { referredById: userId }, select: { referralRewarded: true } })
    return {
      code:          user?.referralCode ?? null,
      referredCount: referred.length,
      rewardedCount: referred.filter(r => r.referralRewarded).length,
    }
  }

  async updateProfile(userId: string, dto: { firstName?: string; lastName?: string; email?: string; avatarUrl?: string }) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data:  {
        ...(dto.firstName !== undefined ? { firstName: dto.firstName } : {}),
        ...(dto.lastName  !== undefined ? { lastName:  dto.lastName  } : {}),
        ...(dto.email     !== undefined ? { email:     dto.email     } : {}),
      },
    })
    return { id: user.id, phone: user.phone, role: user.role, firstName: user.firstName, lastName: user.lastName, email: user.email, idVerified: user.idVerified }
  }

  async verifyId(userId: string, idNumber: string): Promise<{ idVerified: boolean; age: number }> {
    // Validate format server-side as well (13 digits + Luhn)
    const digits = idNumber.replace(/\s/g, '')
    if (!/^\d{13}$/.test(digits)) throw new Error('Invalid ID format')

    const yy  = parseInt(digits.slice(0, 2), 10)
    const mm  = parseInt(digits.slice(2, 4), 10)
    const dd  = parseInt(digits.slice(4, 6), 10)
    const currentYY = new Date().getFullYear() % 100
    const year = yy <= currentYY ? 2000 + yy : 1900 + yy
    const dob  = new Date(year, mm - 1, dd)
    if (isNaN(dob.getTime())) throw new Error('Invalid date in ID')

    let sum = 0
    for (let i = 0; i < 13; i++) {
      let d = parseInt(digits[i], 10)
      if (i % 2 !== 0) { d *= 2; if (d > 9) d -= 9 }
      sum += d
    }
    if (sum % 10 !== 0) throw new Error('ID checksum failed')

    const today = new Date()
    let age = today.getFullYear() - dob.getFullYear()
    if (today.getMonth() < dob.getMonth() || (today.getMonth() === dob.getMonth() && today.getDate() < dob.getDate())) age--
    if (age < 18) throw new Error('Must be 18 or older')

    await this.prisma.user.update({
      where: { id: userId },
      data:  { idVerified: true, idVerifiedAt: new Date() },
    })
    return { idVerified: true, age }
  }
}
