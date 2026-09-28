'use client'
import { useState } from 'react'
import { hazmatLabel, LoadInput, mToMm, TruckInput } from '@/lib/truck-loads'

export const inputCls =
  'w-full rounded-lg border border-silver-300 bg-white px-3 py-2 text-sm text-silver-900 focus:outline-none focus:ring-2 focus:ring-brand-600/30 focus:border-brand-600'

export function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-silver-600 mb-1">{label}</span>
      {children}
      {hint && <span className="block text-[11px] text-silver-400 mt-1">{hint}</span>}
    </label>
  )
}

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-start sm:items-center justify-center p-4 overflow-y-auto" onClick={onClose}>
      <div className="screen-enter w-full max-w-xl rounded-2xl bg-white shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-silver-200">
          <h2 className="font-semibold text-silver-900">{title}</h2>
          <button onClick={onClose} className="text-silver-400 hover:text-silver-700" aria-label="Close">
            <i className="ti ti-x text-lg" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}

export function HazmatPicker({ types, value, onChange }: { types: string[]; value: string[]; onChange: (v: string[]) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {types.map(t => {
        const on = value.includes(t)
        return (
          <button
            type="button" key={t}
            onClick={() => onChange(on ? value.filter(v => v !== t) : [...value, t])}
            className={`press rounded-full px-2.5 py-1 text-xs border ${on
              ? 'bg-orange-100 border-orange-400 text-orange-800'
              : 'bg-white border-silver-300 text-silver-600 hover:border-silver-400'}`}
          >
            {hazmatLabel(t)}
          </button>
        )
      })}
    </div>
  )
}

function FormFooter({ busy, error, label }: { busy: boolean; error: string | null; label: string }) {
  return (
    <div className="pt-2">
      {error && <p className="mb-3 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{error}</p>}
      <button disabled={busy} className="press w-full rounded-lg bg-brand-700 hover:bg-brand-800 text-white py-2.5 text-sm font-medium disabled:opacity-50">
        {busy ? 'Saving…' : label}
      </button>
    </div>
  )
}

const num = (v: FormDataEntryValue | null) => (v === null || v === '' ? undefined : Number(v))
const str = (v: FormDataEntryValue | null) => (v === null || String(v).trim() === '' ? undefined : String(v).trim())

export function TruckForm({ hazmatTypes, onSubmit }: { hazmatTypes: string[]; onSubmit: (t: TruckInput) => Promise<void> }) {
  const [hazmat, setHazmat] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    setBusy(true); setError(null)
    try {
      await onSubmit({
        name:          str(f.get('name'))!,
        plate:         str(f.get('plate'))!,
        driverName:    str(f.get('driverName')) ?? null,
        driverPhone:   str(f.get('driverPhone')) ?? null,
        heightMm:      mToMm(num(f.get('heightM'))!),
        widthMm:       mToMm(num(f.get('widthM'))!),
        lengthMm:      mToMm(num(f.get('lengthM'))!),
        grossWeightKg: Math.round(num(f.get('grossKg'))!),
        tareWeightKg:  Math.round(num(f.get('tareKg'))!),
        axleCount:     num(f.get('axles'))!,
        hazmatTypes:   hazmat,
        licenceDiscExpiry:   str(f.get('licenceDiscExpiry')) ?? null,
        roadworthyExpiry:    str(f.get('roadworthyExpiry')) ?? null,
        insuranceExpiry:     str(f.get('insuranceExpiry')) ?? null,
        driverLicenceExpiry: str(f.get('driverLicenceExpiry')) ?? null,
        driverPrdpExpiry:    str(f.get('driverPrdpExpiry')) ?? null,
      })
    } catch (err: any) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  // Defaults: a typical South African interlink (7 axles, 56 t GCM)
  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Unit name"><input name="name" required className={inputCls} placeholder="Unit 12" /></Field>
        <Field label="Plate"><input name="plate" required className={inputCls} placeholder="ND 123-456" /></Field>
        <Field label="Driver"><input name="driverName" className={inputCls} /></Field>
        <Field label="Driver phone" hint="The driver signs in to the driver app with this number."><input name="driverPhone" type="tel" className={inputCls} /></Field>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Height (m)"><input name="heightM" type="number" step="0.01" min="1" max="6" required defaultValue="4.3" className={inputCls} /></Field>
        <Field label="Width (m)"><input name="widthM" type="number" step="0.01" min="1" max="4" required defaultValue="2.6" className={inputCls} /></Field>
        <Field label="Length (m)"><input name="lengthM" type="number" step="0.1" min="3" max="40" required defaultValue="22" className={inputCls} /></Field>
        <Field label="Gross weight (kg)"><input name="grossKg" type="number" min="1000" max="100000" required defaultValue="56000" className={inputCls} /></Field>
        <Field label="Tare weight (kg)"><input name="tareKg" type="number" min="500" max="60000" required defaultValue="17000" className={inputCls} /></Field>
        <Field label="Axles"><input name="axles" type="number" min="2" max="12" required defaultValue="7" className={inputCls} /></Field>
      </div>
      <details className="rounded-lg border border-silver-200 px-3 py-2">
        <summary className="text-sm text-silver-700 cursor-pointer">Document expiry dates (recommended)</summary>
        <p className="text-xs text-silver-500 mt-1">Used for compliance alerts. A truck with an expired licence disc, driver&apos;s licence or PrDP can&apos;t be dispatched.</p>
        <div className="grid grid-cols-2 gap-3 mt-2">
          <Field label="Licence disc"><input name="licenceDiscExpiry" type="date" className={inputCls} /></Field>
          <Field label="Roadworthy (COR)"><input name="roadworthyExpiry" type="date" className={inputCls} /></Field>
          <Field label="Insurance"><input name="insuranceExpiry" type="date" className={inputCls} /></Field>
          <Field label="Driver's licence"><input name="driverLicenceExpiry" type="date" className={inputCls} /></Field>
          <Field label="PrDP"><input name="driverPrdpExpiry" type="date" className={inputCls} /></Field>
        </div>
      </details>
      <Field label="Hazmat certifications" hint="Loads with hazmat can only go on trucks certified for every class.">
        <HazmatPicker types={hazmatTypes} value={hazmat} onChange={setHazmat} />
      </Field>
      <FormFooter busy={busy} error={error} label="Add truck" />
    </form>
  )
}

export function LoadForm({ hazmatTypes, onSubmit }: { hazmatTypes: string[]; onSubmit: (l: LoadInput) => Promise<void> }) {
  const [hazmat, setHazmat] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    const iso = (k: string) => { const v = str(f.get(k)); return v ? new Date(v).toISOString() : undefined }
    setBusy(true); setError(null)
    try {
      await onSubmit({
        reference:     str(f.get('reference'))!,
        shipperName:   str(f.get('shipperName'))!,
        commodity:     str(f.get('commodity'))!,
        weightKg:      Math.round(num(f.get('weightKg'))!),
        hazmatTypes:   hazmat,
        rate:          num(f.get('rate')),
        originAddress: str(f.get('originAddress'))!,
        destAddress:   str(f.get('destAddress'))!,
        pickupAt:      iso('pickupAt'),
        deliverBy:     iso('deliverBy'),
        notes:         str(f.get('notes')),
      })
    } catch (err: any) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Load #"><input name="reference" required className={inputCls} placeholder="LD-10482" /></Field>
        <Field label="Shipper"><input name="shipperName" required className={inputCls} /></Field>
        <Field label="Commodity"><input name="commodity" required className={inputCls} placeholder="Palletised beverages" /></Field>
        <Field label="Weight (kg)"><input name="weightKg" type="number" min="1" max="60000" required className={inputCls} /></Field>
      </div>
      <Field label="Pickup address"><input name="originAddress" required className={inputCls} placeholder="12 Jet Park Rd, Boksburg" /></Field>
      <Field label="Delivery address"><input name="destAddress" required className={inputCls} placeholder="1 Bayhead Rd, Durban" /></Field>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Pickup"><input name="pickupAt" type="datetime-local" className={inputCls} /></Field>
        <Field label="Deliver by"><input name="deliverBy" type="datetime-local" className={inputCls} /></Field>
        <Field label="Rate (R)"><input name="rate" type="number" min="0" step="1" className={inputCls} /></Field>
      </div>
      <Field label="Hazmat">
        <HazmatPicker types={hazmatTypes} value={hazmat} onChange={setHazmat} />
      </Field>
      <Field label="Notes"><textarea name="notes" rows={2} className={inputCls} /></Field>
      <FormFooter busy={busy} error={error} label="Book load" />
    </form>
  )
}
