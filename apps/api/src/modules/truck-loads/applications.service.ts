import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import { randomBytes } from 'crypto'
import * as bcrypt from 'bcryptjs'
import { plainToInstance } from 'class-transformer'
import { validate } from 'class-validator'
import { PrismaService } from '../../prisma/prisma.service'
import { HAZMAT_TYPES } from './google-routes.service'
import { phoneKey } from './truck-loads.rules'
import { UploadedDoc } from './documents.util'
import { ApplicationDto, RejectApplicationDto } from './truck-loads.dto'
import {
  ALLOWED_MIME_TYPES, APPLICATION_DOCUMENTS, DOCUMENT_KINDS, LICENCE_CODES, MAX_FILE_BYTES, TRUCK_TYPES,
} from './applications.constants'

const DAY_MS = 86_400_000
const EXPIRY_WARNING_DAYS = 30

// Readable, unambiguous reference codes (no 0/O, 1/I)
const REF_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'
function newReference() {
  const bytes = randomBytes(6)
  return 'TL-' + [...bytes].map(b => REF_ALPHABET[b % REF_ALPHABET.length]).join('')
}

/** Everything except the file bytes. */
const DOC_META = { id: true, kind: true, fileName: true, mimeType: true, size: true, createdAt: true } as const

@Injectable()
export class ApplicationsService {
  constructor(private prisma: PrismaService) {}

  // ── Dispatcher: the shareable link ──────────────────────────────────────────

  async getLink(ownerId: string) {
    const link = await this.prisma.applicationLink.findFirst({ where: { ownerId, active: true } })
    return link ?? this.prisma.applicationLink.create({ data: { ownerId, token: this.newToken() } })
  }

  /** Invalidates the old link (e.g. it was shared too widely) and issues a new one. */
  async rotateLink(ownerId: string) {
    return this.prisma.$transaction(async tx => {
      await tx.applicationLink.updateMany({ where: { ownerId, active: true }, data: { active: false } })
      return tx.applicationLink.create({ data: { ownerId, token: this.newToken() } })
    })
  }

  // ── Public: the application form ────────────────────────────────────────────

  async formInfo(token: string) {
    await this.getActiveLink(token)
    return {
      documents:    APPLICATION_DOCUMENTS,
      truckTypes:   TRUCK_TYPES,
      licenceCodes: LICENCE_CODES,
      hazmatTypes:  HAZMAT_TYPES,
      maxFileBytes: MAX_FILE_BYTES,
      mimeTypes:    ALLOWED_MIME_TYPES,
    }
  }

  async submit(token: string, rawData: unknown, files: UploadedDoc[]) {
    const link = await this.getActiveLink(token)
    const dto = await this.parse(rawData)

    // Files: one per known kind, allowed types only, required ones present
    const byKind = new Map<string, UploadedDoc>()
    for (const f of files) {
      if (!DOCUMENT_KINDS.includes(f.fieldname)) throw new BadRequestException(`Unknown document "${f.fieldname}"`)
      if (byKind.has(f.fieldname)) throw new BadRequestException(`Only one file allowed for ${this.docLabel(f.fieldname)}`)
      if (!ALLOWED_MIME_TYPES.includes(f.mimetype)) {
        throw new BadRequestException(`${this.docLabel(f.fieldname)} must be a PDF or photo (JPG, PNG, HEIC)`)
      }
      byKind.set(f.fieldname, f)
    }
    const hauling = (dto.hazmatTypes ?? []).length > 0
    const missing = APPLICATION_DOCUMENTS
      .filter(d => d.required === true || (d.required === 'hazmat' && hauling))
      .filter(d => !byKind.has(d.kind))
    if (missing.length) throw new BadRequestException(`Missing documents: ${missing.map(d => d.label).join(', ')}`)

    // Business rules
    if (dto.tareWeightKg >= dto.grossWeightKg) throw new BadRequestException('Tare weight must be less than gross weight')
    const today = new Date(new Date().toDateString())
    if (new Date(dto.licenceExpiry) < today) throw new BadRequestException("The driver's licence has expired")
    if (new Date(dto.prdpExpiry) < today) throw new BadRequestException('The PrDP has expired')

    let reference = newReference()
    while (await this.prisma.truckApplication.findUnique({ where: { reference } })) reference = newReference()

    await this.prisma.truckApplication.create({
      data: {
        ownerId: link.ownerId,
        linkId: link.id,
        reference,
        companyName:    dto.companyName?.trim() || null,
        contactName:    dto.contactName.trim(),
        contactPhone:   dto.contactPhone.trim(),
        contactEmail:   dto.contactEmail?.trim() || null,
        driverName:     dto.driverName.trim(),
        driverPhone:    dto.driverPhone.trim(),
        driverIdNumber: dto.driverIdNumber.trim().toUpperCase(),
        licenceCode:    dto.licenceCode,
        licenceExpiry:  new Date(dto.licenceExpiry),
        prdpExpiry:     new Date(dto.prdpExpiry),
        passwordHash:   bcrypt.hashSync(dto.password, 10),
        discExpiry:       dto.discExpiry ? new Date(dto.discExpiry) : null,
        roadworthyExpiry: dto.roadworthyExpiry ? new Date(dto.roadworthyExpiry) : null,
        insuranceExpiry:  dto.insuranceExpiry ? new Date(dto.insuranceExpiry) : null,
        truckType:      dto.truckType,
        make:           dto.make.trim(),
        model:          dto.model?.trim() || null,
        year:           dto.year ?? null,
        plate:          dto.plate.trim().toUpperCase(),
        vin:            dto.vin?.trim().toUpperCase() || null,
        heightMm:       dto.heightMm,
        widthMm:        dto.widthMm,
        lengthMm:       dto.lengthMm,
        grossWeightKg:  dto.grossWeightKg,
        tareWeightKg:   dto.tareWeightKg,
        axleCount:      dto.axleCount,
        hazmatTypes:    dto.hazmatTypes ?? [],
        consentAt:      new Date(),
        documents: {
          create: [...byKind.values()].map(f => ({
            kind: f.fieldname,
            fileName: f.originalname.slice(0, 200),
            mimeType: f.mimetype,
            size: f.size,
            data: f.buffer,
          })),
        },
      },
    })
    return { reference }
  }

  // ── Dispatcher: review ──────────────────────────────────────────────────────

  async list(ownerId: string, status?: string) {
    const rows = await this.prisma.truckApplication.findMany({
      where:   { ownerId, ...(status ? { status } : {}) },
      orderBy: { createdAt: 'desc' },
      take:    200,
      include: { documents: { select: { id: true } } },
    })
    return rows.map(({ passwordHash, documents, ...a }) => ({ ...a, documentCount: documents.length }))
  }

  async get(ownerId: string, id: string) {
    const app = await this.prisma.truckApplication.findFirst({
      where: { id, ownerId },
      include: { documents: { select: DOC_META, orderBy: { createdAt: 'asc' } } },
    })
    if (!app) throw new NotFoundException('Application not found')
    const { passwordHash, ...rest } = app
    return { ...rest, checks: await this.checks(ownerId, app) }
  }

  async document(ownerId: string, id: string, docId: string) {
    const doc = await this.prisma.applicationDocument.findFirst({
      where: { id: docId, applicationId: id, application: { ownerId } },
    })
    if (!doc) throw new NotFoundException('Document not found')
    return doc
  }

  /**
   * Adds the truck to the fleet and, if the driver has no account yet, creates
   * their driver-app login with the password they chose on the form.
   */
  async approve(ownerId: string, id: string) {
    const app = await this.prisma.truckApplication.findFirst({ where: { id, ownerId } })
    if (!app) throw new NotFoundException('Application not found')
    if (app.status !== 'pending') throw new ConflictException(`Application is already ${app.status}`)
    if (await this.prisma.truck.findFirst({ where: { ownerId, plate: app.plate } })) {
      throw new ConflictException(`A truck with plate ${app.plate} is already in your fleet`)
    }

    const existingUser = await this.prisma.user.findUnique({ where: { phone: app.driverPhone } })
    const [firstName, ...rest] = app.driverName.split(/\s+/)

    return this.prisma.$transaction(async tx => {
      const truck = await tx.truck.create({
        data: {
          ownerId,
          name:           [app.make, app.model].filter(Boolean).join(' ') || app.plate,
          plate:          app.plate,
          driverName:     app.driverName,
          driverPhone:    app.driverPhone,
          driverPhoneKey: phoneKey(app.driverPhone),
          heightMm:       app.heightMm,
          widthMm:        app.widthMm,
          lengthMm:       app.lengthMm,
          grossWeightKg:  app.grossWeightKg,
          tareWeightKg:   app.tareWeightKg,
          axleCount:      app.axleCount,
          hazmatTypes:    app.hazmatTypes,
          licenceDiscExpiry:   app.discExpiry,
          roadworthyExpiry:    app.roadworthyExpiry,
          insuranceExpiry:     app.insuranceExpiry,
          driverLicenceExpiry: app.licenceExpiry,
          driverPrdpExpiry:    app.prdpExpiry,
          applicationId:       app.id,
        },
      })
      let driverAccount: 'created' | 'existing' = 'existing'
      if (!existingUser && app.passwordHash) {
        await tx.user.create({
          data: {
            phone:        app.driverPhone,
            passwordHash: app.passwordHash,
            role:         'driver',
            firstName,
            lastName:     rest.join(' ') || null,
          },
        })
        driverAccount = 'created'
      }
      const updated = await tx.truckApplication.update({
        where: { id },
        // The password hash has done its job; don't keep it around
        data:  { status: 'approved', reviewedAt: new Date(), truckId: truck.id, passwordHash: null },
      })
      const { passwordHash, ...application } = updated
      return { application, truck, driverAccount }
    })
  }

  async reject(ownerId: string, id: string, dto: RejectApplicationDto) {
    const app = await this.prisma.truckApplication.findFirst({ where: { id, ownerId } })
    if (!app) throw new NotFoundException('Application not found')
    if (app.status !== 'pending') throw new ConflictException(`Application is already ${app.status}`)
    const { passwordHash, ...updated } = await this.prisma.truckApplication.update({
      where: { id },
      data:  { status: 'rejected', reviewNote: dto.note?.trim() || null, reviewedAt: new Date(), passwordHash: null },
    })
    return updated
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  /** Things the reviewer should notice before approving. */
  private async checks(ownerId: string, app: {
    status: string; plate: string; driverPhone: string; licenceExpiry: Date; prdpExpiry: Date | null
  }) {
    const warnings: string[] = []
    const soon = (d: Date | null, label: string) => {
      if (!d) return
      const days = Math.ceil((d.getTime() - Date.now()) / DAY_MS)
      if (days < 0) warnings.push(`${label} expired ${-days} day(s) ago`)
      else if (days <= EXPIRY_WARNING_DAYS) warnings.push(`${label} expires in ${days} day(s)`)
    }
    soon(app.licenceExpiry, "Driver's licence")
    soon(app.prdpExpiry, 'PrDP')
    if (app.status === 'pending' && await this.prisma.truck.findFirst({ where: { ownerId, plate: app.plate } })) {
      warnings.push(`Plate ${app.plate} is already in your fleet`)
    }
    const hasAccount = !!(await this.prisma.user.findUnique({ where: { phone: app.driverPhone } }))
    return { warnings, driverHasAccount: hasAccount }
  }

  private async getActiveLink(token: string) {
    const link = await this.prisma.applicationLink.findUnique({ where: { token } })
    if (!link || !link.active) throw new NotFoundException('This application link is no longer active')
    return link
  }

  private async parse(raw: unknown): Promise<ApplicationDto> {
    let obj: unknown = raw
    if (typeof raw === 'string') {
      try { obj = JSON.parse(raw) } catch { throw new BadRequestException('Malformed application data') }
    }
    if (!obj || typeof obj !== 'object') throw new BadRequestException('Missing application data')
    const dto = plainToInstance(ApplicationDto, obj)
    const errors = await validate(dto, { whitelist: true, forbidNonWhitelisted: false })
    if (errors.length) {
      throw new BadRequestException(errors.flatMap(e => Object.values(e.constraints ?? {})))
    }
    return dto
  }

  private docLabel(kind: string) {
    return APPLICATION_DOCUMENTS.find(d => d.kind === kind)?.label ?? kind
  }

  private newToken() {
    return randomBytes(12).toString('base64url')
  }
}
