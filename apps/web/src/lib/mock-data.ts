export const STATS = {
  activeBookings: 47,
  techsLive: 23,
  revenueToday: 'R14.2k',
  avgRating: 4.8,
}

export const BOOKINGS = [
  { id: 'B-1042', service: 'Electrical fault', location: 'Umhlanga', client: 'Thabo Nkosi', plan: 'Premium Home', tech: 'Kevin Mhlongo', eta: '4 min', quoted: 'R 1 250', status: 'live' as const, icon: 'bolt', color: '#FEF3C7', iconColor: '#D97706', ago: '2 min ago' },
  { id: 'B-1041', service: 'Burst pipe', location: 'Ballito Estate', client: 'Sarah van der Merwe', plan: 'Basic Home', tech: null, eta: null, quoted: 'R 1 800', status: 'emergency' as const, icon: 'droplet', color: '#DBEAFE', iconColor: '#1D4ED8', ago: '8 min ago' },
  { id: 'B-1040', service: 'Deep clean', location: 'La Lucia', client: 'Ahmed Patel', plan: 'Premium Home', tech: 'Zanele Dlamini', eta: '22 min', quoted: 'R 550', status: 'live' as const, icon: 'wash', color: '#D1FAE5', iconColor: '#065F46', ago: '14 min ago' },
  { id: 'B-1039', service: 'Geyser repair', location: 'Glenwood', client: 'Priya Govender', plan: 'Premium Home', tech: 'Raj Pillay', eta: '12 min', quoted: 'R 1 000', status: 'pending' as const, icon: 'tools', color: '#EDE9FE', iconColor: '#7C3AED', ago: '22 min ago' },
  { id: 'B-1038', service: 'Gas leak', location: 'Morningside', client: 'Mark Williams', plan: 'Emergency Add-on', tech: 'David Kruger', eta: '8 min', quoted: 'R 950', status: 'emergency' as const, icon: 'flame', color: '#FEE2E2', iconColor: '#DC2626', ago: '35 min ago' },
]

export const PROVIDERS = [
  { initials: 'KM', name: 'Kevin Mhlongo', role: 'Electrician', jobs: 3, rating: 5, status: 'active' as const, bgColor: '#DCF0E8', textColor: '#1A6842' },
  { initials: 'ZD', name: 'Zanele Dlamini', role: 'Cleaner', jobs: 2, rating: 5, status: 'active' as const, bgColor: '#DBEAFE', textColor: '#1D4ED8' },
  { initials: 'DK', name: 'David Kruger', role: 'Gas · Emergency', jobs: 1, rating: 4, status: 'emergency' as const, bgColor: '#FEE2E2', textColor: '#991B1B' },
]

export const SUBSCRIPTIONS = [
  { label: 'Basic Home', count: 1248, pct: 72, color: '#C8922A' },
  { label: 'Premium Home', count: 774, pct: 45, color: '#2D8A6E' },
  { label: 'Estate / Biz', count: 38, pct: 22, color: '#243447' },
  { label: 'Emergency Add-on', count: 582, pct: 34, color: '#C0392B' },
]

export const REVENUE_BARS = [
  { day: 'Mon', amount: 'R9.8k', pct: 52 },
  { day: 'Tue', amount: 'R12.1k', pct: 64 },
  { day: 'Wed', amount: 'R8.5k', pct: 45 },
  { day: 'Thu', amount: 'R14.7k', pct: 78 },
  { day: 'Fri', amount: 'R11.3k', pct: 60 },
  { day: 'Sat', amount: 'R16.6k', pct: 88 },
  { day: 'Today', amount: 'R14.2k', pct: 75, highlight: true },
]

export const SERVICES = [
  { id: 'plumbing', label: 'Plumbing', price: 'From R350', iconClass: 'ti ti-droplet', color: '#1D4ED8', bg: '#DBEAFE' },
  { id: 'electrical', label: 'Electrical', price: 'From R400', iconClass: 'ti ti-bolt', color: '#D97706', bg: '#FEF3C7' },
  { id: 'cleaning', label: 'Cleaning', price: 'From R250', iconClass: 'ti ti-wash', color: '#2D8A6E', bg: '#D1FAE5' },
  { id: 'hvac', label: 'AC & HVAC', price: 'From R500', iconClass: 'ti ti-air-conditioning', color: '#7C3AED', bg: '#EDE9FE' },
  { id: 'gas', label: 'Gas', price: 'From R450', iconClass: 'ti ti-flame', color: '#DC2626', bg: '#FEE2E2' },
  { id: 'handyman', label: 'Handyman', price: 'From R300', iconClass: 'ti ti-tools', color: '#92400E', bg: '#FEF3C7' },
]
