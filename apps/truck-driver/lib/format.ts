/** Metric, South African formatting. */
/** 13600 → "13 600 kg" */
export const fmtWeight = (kg: number) => `${Math.round(kg).toLocaleString('en-ZA')} kg`
/** 727000 → "727 km" */
export function fmtDistance(m: number) {
  const km = m / 1000
  return km < 10 ? `${km.toFixed(1)} km` : `${Math.round(km).toLocaleString('en-ZA')} km`
}
/** 4115 → "4.12 m" */
export const fmtLength = (mm: number) => `${(mm / 1000).toFixed(2)} m`
export function fmtDuration(s: number) {
  const h = Math.floor(s / 3600)
  const m = Math.round((s % 3600) / 60)
  return h ? `${h} h ${m} min` : `${m} min`
}
export function fmtDate(iso: string | null) {
  if (!iso) return 'Not set'
  return new Date(iso).toLocaleString('en-ZA', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}
export const hazmatLabel = (h: string) => h.toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
