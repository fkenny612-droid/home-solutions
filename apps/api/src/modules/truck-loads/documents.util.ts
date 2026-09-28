import { BadRequestException } from '@nestjs/common'
import { ALLOWED_MIME_TYPES } from './applications.constants'

/** The subset of a multer file we use (avoids a @types/multer dependency). */
export interface UploadedDoc {
  fieldname: string
  originalname: string
  mimetype: string
  size: number
  buffer: Buffer
}

export function assertDocType(f: UploadedDoc, label: string) {
  if (!ALLOWED_MIME_TYPES.includes(f.mimetype)) {
    throw new BadRequestException(`${label} must be a PDF or photo (JPG, PNG, HEIC)`)
  }
}

/**
 * Stream a stored document. Uploaded files are untrusted: serve them with
 * their declared type, no sniffing, and a sandbox CSP so they can never run
 * as a page on the API's origin.
 */
export function sendDocument(res: any, doc: { fileName: string; mimeType: string; size: number; data: Uint8Array }) {
  res.set({
    'Content-Type': doc.mimeType,
    'Content-Length': String(doc.size),
    'Content-Disposition': `inline; filename="${doc.fileName.replace(/[^\w.\- ]/g, '_')}"`,
    'X-Content-Type-Options': 'nosniff',
    'Content-Security-Policy': "default-src 'none'; sandbox",
    'Cache-Control': 'private, no-store',
  })
  res.end(Buffer.from(doc.data))
}
