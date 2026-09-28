/**
 * What a carrier / owner-driver submits through a dispatcher's application
 * link. South African compliance documents.
 */

export const TRUCK_TYPES = [
  'interlink', 'superlink', 'tautliner', 'flatbed', 'tanker', 'tipper',
  'reefer', 'lowbed', 'rigid', 'other',
] as const

/** SA licence codes that may drive heavy goods vehicles. */
export const LICENCE_CODES = ['C1', 'C', 'EC1', 'EC'] as const

export interface DocumentSpec {
  kind: string
  label: string
  /** 'always', never, or only when the truck hauls hazmat */
  required: boolean | 'hazmat'
}

export const APPLICATION_DOCUMENTS: DocumentSpec[] = [
  { kind: 'driver_id',            label: 'Driver ID (SA ID or passport)',            required: true },
  { kind: 'drivers_licence',      label: "Driver's licence card (both sides)",      required: true },
  { kind: 'prdp',                 label: 'Professional Driving Permit (PrDP)',      required: true },
  { kind: 'vehicle_registration', label: 'Vehicle registration certificate',        required: true },
  { kind: 'licence_disc',         label: 'Vehicle licence disc',                    required: false },
  { kind: 'roadworthy',           label: 'Roadworthy certificate (COR)',            required: false },
  { kind: 'operator_card',        label: 'Operator card',                           required: false },
  { kind: 'git_insurance',        label: 'Goods-in-transit insurance',              required: false },
  { kind: 'hazmat_certificate',   label: 'Dangerous goods (hazchem) certificate',   required: 'hazmat' },
  { kind: 'truck_photo',          label: 'Photo of the truck',                      required: false },
]

export const DOCUMENT_KINDS = APPLICATION_DOCUMENTS.map(d => d.kind)

export const ALLOWED_MIME_TYPES = [
  'application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif',
]

export const MAX_FILE_BYTES = 8 * 1024 * 1024
export const MAX_FILES = APPLICATION_DOCUMENTS.length
