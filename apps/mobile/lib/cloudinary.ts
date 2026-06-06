/**
 * Cloudinary direct upload utility (unsigned)
 * Cloud: drtku12eq  |  Preset: HMS
 */
const CLOUD_NAME    = 'drtku12eq'
const UPLOAD_PRESET = 'HMS'
const UPLOAD_URL    = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`

export interface UploadResult {
  url:      string
  publicId: string
  format:   string
  bytes:    number
}

export async function uploadToCloudinary(
  uri:      string,
  fileName: string,
  mimeType: string,
  folder    = 'home-solutions/kyc',
): Promise<UploadResult> {
  const form = new FormData()
  form.append('file', { uri, type: mimeType, name: fileName } as any)
  form.append('upload_preset', UPLOAD_PRESET)
  form.append('folder', folder)

  const res  = await fetch(UPLOAD_URL, { method: 'POST', body: form })
  const data = await res.json()

  if (!res.ok || data.error) {
    throw new Error(data.error?.message ?? 'Upload failed')
  }

  return {
    url:      data.secure_url,
    publicId: data.public_id,
    format:   data.format,
    bytes:    data.bytes,
  }
}
