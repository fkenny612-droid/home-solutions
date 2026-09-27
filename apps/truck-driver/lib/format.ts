const LB_PER_KG = 2.20462

export const fmtLb = (kg: number) => `${(Math.round(kg * LB_PER_KG / 10) * 10).toLocaleString('en-US')} lb`
export const fmtMiles = (m: number) => `${Math.round(m / 1609.344).toLocaleString('en-US')} mi`
export function fmtFeet(mm: number) {
  const totalIn = Math.round(mm / 25.4)
  return `${Math.floor(totalIn / 12)}′${totalIn % 12}″`
}
export function fmtDuration(s: number) {
  const h = Math.floor(s / 3600)
  const m = Math.round((s % 3600) / 60)
  return h ? `${h} h ${m} min` : `${m} min`
}
export function fmtDate(iso: string | null) {
  if (!iso) return 'Not set'
  return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}
export const hazmatLabel = (h: string) => h.toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
