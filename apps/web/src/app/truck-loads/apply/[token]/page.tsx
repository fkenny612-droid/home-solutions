'use client'
import { useEffect, useState } from 'react'
import TruckLoadsMark from '@/components/truck-loads/TruckLoadsMark'
import { Field, HazmatPicker, inputCls } from '@/components/truck-loads/forms'
import {
  applyForm, ApplicationFormInfo, DocumentSpec, fmtFileSize, hazmatLabel, mToMm, truckTypeLabel,
} from '@/lib/truck-loads'

function Section({ n, title, children, hint }: { n: number; title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl bg-white border border-silver-200 p-5 space-y-4">
      <div>
        <h2 className="font-semibold text-silver-900 flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-brand-700 text-white text-xs flex items-center justify-center">{n}</span>
          {title}
        </h2>
        {hint && <p className="text-sm text-silver-500 mt-1">{hint}</p>}
      </div>
      {children}
    </section>
  )
}

const req = <span className="text-red-600">*</span>

/** Vehicle documents whose expiry we track, and the form field it goes in. */
const EXPIRY_FIELD: Record<string, string> = {
  licence_disc: 'discExpiry', roadworthy: 'roadworthyExpiry', git_insurance: 'insuranceExpiry',
}

function DocInput({ spec, required, file, onChange, maxBytes }: {
  spec: DocumentSpec; required: boolean; file: File | null; maxBytes: number; onChange: (f: File | null) => void
}) {
  const expiryField = EXPIRY_FIELD[spec.kind]
  const [error, setError] = useState<string | null>(null)
  return (
    <div className={`rounded-xl border p-3 ${file ? 'border-brand-600 bg-brand-50' : 'border-silver-200'}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-medium text-silver-900">{spec.label} {required && req}</div>
          {file
            ? <div className="text-xs text-brand-700 truncate">✓ {file.name} · {fmtFileSize(file.size)}</div>
            : <div className="text-xs text-silver-500">PDF or photo, up to {fmtFileSize(maxBytes)}</div>}
          {error && <div className="text-xs text-red-700">{error}</div>}
          {file && expiryField && (
            <label className="mt-1 flex items-center gap-2 text-xs text-silver-600">Expiry date
              <input name={expiryField} type="date" required className="rounded-md border border-silver-300 px-2 py-1 text-xs" />
            </label>
          )}
        </div>
        <label className="press shrink-0 cursor-pointer rounded-lg border border-silver-300 bg-white px-3 py-2 text-sm text-silver-800">
          {file ? 'Change' : 'Upload'}
          <input
            type="file" className="sr-only" accept="application/pdf,image/*"
            onChange={e => {
              const f = e.target.files?.[0] ?? null
              e.target.value = ''
              if (f && f.size > maxBytes) { setError(`Too large — max ${fmtFileSize(maxBytes)}`); return }
              setError(null); onChange(f)
            }}
          />
        </label>
      </div>
    </div>
  )
}

export default function ApplyPage({ params }: { params: { token: string } }) {
  const [info, setInfo] = useState<ApplicationFormInfo | null>(null)
  const [linkError, setLinkError] = useState<string | null>(null)
  const [hazmat, setHazmat] = useState<string[]>([])
  const [files, setFiles] = useState<Record<string, File | null>>({})
  const [progress, setProgress] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [reference, setReference] = useState<string | null>(null)

  useEffect(() => {
    applyForm.info(params.token).then(setInfo).catch(e => setLinkError(e.message))
  }, [params.token])

  const isRequired = (d: DocumentSpec) => d.required === true || (d.required === 'hazmat' && hazmat.length > 0)

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!info) return
    const f = new FormData(e.currentTarget)
    const str = (k: string) => String(f.get(k) ?? '').trim()
    const num = (k: string) => Number(f.get(k))

    if (str('password') !== str('password2')) return setError('The two driver app passwords do not match')
    const missing = info.documents.filter(d => isRequired(d) && !files[d.kind])
    if (missing.length) return setError(`Please upload: ${missing.map(d => d.label).join(', ')}`)

    const data = {
      companyName:    str('companyName') || undefined,
      contactName:    str('contactName'),
      contactPhone:   str('contactPhone'),
      contactEmail:   str('contactEmail') || undefined,
      driverName:     str('driverName'),
      driverPhone:    str('driverPhone'),
      driverIdNumber: str('driverIdNumber'),
      licenceCode:    str('licenceCode'),
      licenceExpiry:  str('licenceExpiry'),
      prdpExpiry:     str('prdpExpiry'),
      password:       str('password'),
      truckType:      str('truckType'),
      make:           str('make'),
      model:          str('model') || undefined,
      year:           str('year') ? num('year') : undefined,
      plate:          str('plate'),
      vin:            str('vin') || undefined,
      heightMm:       mToMm(num('heightM')),
      widthMm:        mToMm(num('widthM')),
      lengthMm:       mToMm(num('lengthM')),
      grossWeightKg:  Math.round(num('grossKg')),
      tareWeightKg:   Math.round(num('tareKg')),
      axleCount:      num('axles'),
      hazmatTypes:    hazmat,
      discExpiry:       str('discExpiry') || undefined,
      roadworthyExpiry: str('roadworthyExpiry') || undefined,
      insuranceExpiry:  str('insuranceExpiry') || undefined,
      consent:        f.get('consent') === 'on',
    }
    const body = new FormData()
    body.append('data', JSON.stringify(data))
    for (const [kind, file] of Object.entries(files)) if (file) body.append(kind, file, file.name)

    setError(null); setProgress(0)
    try {
      const r = await applyForm.submit(params.token, body, setProgress)
      setReference(r.reference)
      window.scrollTo(0, 0)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setProgress(null)
    }
  }

  const shell = (children: React.ReactNode) => (
    <main className="min-h-screen bg-silver-100 text-silver-900" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <header className="bg-brand-800 text-white">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center gap-2">
          <TruckLoadsMark size={26} onDark />
          <span className="font-semibold">Truck Loads</span>
          <span className="text-white/60 text-sm">· Carrier application</span>
        </div>
      </header>
      <div className="max-w-2xl mx-auto px-4 py-6">{children}</div>
    </main>
  )

  if (linkError) {
    return shell(
      <div className="rounded-2xl bg-white border border-silver-200 p-8 text-center space-y-2">
        <p className="font-semibold">This application link isn&apos;t active</p>
        <p className="text-sm text-silver-500">Ask the dispatcher who sent it for a new link.</p>
      </div>,
    )
  }
  if (!info) return shell(<p className="text-center text-silver-500 py-16">Loading…</p>)

  if (reference) {
    return shell(
      <div className="screen-enter rounded-2xl bg-white border border-silver-200 p-8 text-center space-y-3">
        <div className="mx-auto w-12 h-12 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-2xl">✓</div>
        <h1 className="text-xl font-semibold">Application submitted</h1>
        <p className="text-silver-600">Your reference is</p>
        <p className="text-2xl font-mono font-semibold tracking-wider text-brand-700">{reference}</p>
        <p className="text-sm text-silver-500 max-w-md mx-auto">
          The dispatcher will review your truck and documents. Once approved, the driver can sign in to the
          Truck Loads driver app with their phone number and the password chosen on this form.
        </p>
      </div>,
    )
  }

  return shell(
    <form onSubmit={submit} className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-brand-800">Apply to haul with us</h1>
        <p className="text-silver-600 mt-1">Tell us about your truck and driver, and upload the compliance documents. It takes about 10 minutes.</p>
      </div>

      <Section n={1} title="Company & contact" hint="Who we should speak to about this application.">
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Company name (if any)"><input name="companyName" className={inputCls} autoComplete="organization" /></Field>
          <Field label="Contact person *"><input name="contactName" required className={inputCls} autoComplete="name" /></Field>
          <Field label="Contact phone *"><input name="contactPhone" type="tel" required className={inputCls} placeholder="082 123 4567" autoComplete="tel" /></Field>
          <Field label="Contact email"><input name="contactEmail" type="email" className={inputCls} autoComplete="email" /></Field>
        </div>
      </Section>

      <Section n={2} title="Driver">
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Full name *"><input name="driverName" required className={inputCls} /></Field>
          <Field label="Cellphone *" hint="The driver signs in to the driver app with this number.">
            <input name="driverPhone" type="tel" required className={inputCls} placeholder="072 123 4567" />
          </Field>
          <Field label="SA ID or passport number *"><input name="driverIdNumber" required className={inputCls} /></Field>
          <Field label="Licence code *">
            <select name="licenceCode" required className={inputCls} defaultValue="EC">
              {info.licenceCodes.map(c => <option key={c} value={c}>Code {c}</option>)}
            </select>
          </Field>
          <Field label="Licence expiry date *"><input name="licenceExpiry" type="date" required className={inputCls} /></Field>
          <Field label="PrDP expiry date *"><input name="prdpExpiry" type="date" required className={inputCls} /></Field>
          <Field label="Driver app password *" hint="At least 8 characters.">
            <input name="password" type="password" required minLength={8} className={inputCls} autoComplete="new-password" />
          </Field>
          <Field label="Repeat password *"><input name="password2" type="password" required minLength={8} className={inputCls} autoComplete="new-password" /></Field>
        </div>
      </Section>

      <Section n={3} title="Truck" hint="Dimensions are used to plan routes that avoid low bridges and weight limits.">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <Field label="Truck type *">
            <select name="truckType" required className={inputCls} defaultValue="interlink">
              {info.truckTypes.map(t => <option key={t} value={t}>{truckTypeLabel(t)}</option>)}
            </select>
          </Field>
          <Field label="Make *"><input name="make" required className={inputCls} placeholder="Scania" /></Field>
          <Field label="Model"><input name="model" className={inputCls} placeholder="R 500" /></Field>
          <Field label="Year"><input name="year" type="number" min="1970" max="2100" className={inputCls} /></Field>
          <Field label="Registration (plate) *"><input name="plate" required className={inputCls} placeholder="ND 123-456" /></Field>
          <Field label="VIN"><input name="vin" className={inputCls} /></Field>
          <Field label="Height (m) *"><input name="heightM" type="number" step="0.01" min="1" max="6" required defaultValue="4.3" className={inputCls} /></Field>
          <Field label="Width (m) *"><input name="widthM" type="number" step="0.01" min="1" max="4" required defaultValue="2.6" className={inputCls} /></Field>
          <Field label="Length (m) *"><input name="lengthM" type="number" step="0.1" min="3" max="40" required defaultValue="22" className={inputCls} /></Field>
          <Field label="Gross weight (kg) *"><input name="grossKg" type="number" min="1000" max="100000" required defaultValue="56000" className={inputCls} /></Field>
          <Field label="Tare weight (kg) *"><input name="tareKg" type="number" min="500" max="60000" required defaultValue="17000" className={inputCls} /></Field>
          <Field label="Axles *"><input name="axles" type="number" min="2" max="12" required defaultValue="7" className={inputCls} /></Field>
        </div>
        <Field label="Hazardous goods the truck is certified for" hint="Leave empty if you don't haul dangerous goods.">
          <HazmatPicker types={info.hazmatTypes} value={hazmat} onChange={setHazmat} />
        </Field>
      </Section>

      <Section n={4} title="Documents" hint="Clear photos or scans. Photos from your phone camera are fine.">
        <div className="space-y-2">
          {info.documents.map(d => (
            <DocInput
              key={d.kind} spec={d} required={isRequired(d)} maxBytes={info.maxFileBytes}
              file={files[d.kind] ?? null} onChange={f => setFiles(prev => ({ ...prev, [d.kind]: f }))}
            />
          ))}
        </div>
        {hazmat.length > 0 && (
          <p className="text-xs text-silver-500">A dangerous goods certificate is required because you selected {hazmat.map(hazmatLabel).join(', ')}.</p>
        )}
      </Section>

      <Section n={5} title="Consent">
        <label className="flex gap-3 text-sm text-silver-700">
          <input name="consent" type="checkbox" required className="mt-1 h-4 w-4 accent-brand-700" />
          <span>
            I confirm the information and documents are true and mine to share, and I consent to Truck Loads processing
            this personal information to assess the application, as required by the Protection of Personal Information
            Act (POPIA).
          </span>
        </label>
      </Section>

      {error && <p className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{error}</p>}

      <div className="space-y-2">
        {progress !== null && (
          <div className="h-2 rounded-full bg-silver-200 overflow-hidden">
            <div className="h-full bg-brand-600 transition-all" style={{ width: `${Math.round(progress * 100)}%` }} />
          </div>
        )}
        <button disabled={progress !== null}
          className="press w-full rounded-xl bg-brand-700 hover:bg-brand-800 text-white py-3.5 font-semibold disabled:opacity-60">
          {progress !== null ? `Uploading… ${Math.round(progress * 100)}%` : 'Submit application'}
        </button>
      </div>
    </form>,
  )
}
