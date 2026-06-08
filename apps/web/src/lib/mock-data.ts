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

export const SERVICE_CATEGORIES = [
  {
    category: 'Home Trades',
    services: [
      { id: 'plumbing',       label: 'Plumbing',         price: 'From R350',   iconClass: 'ti ti-droplet',           color: '#1D4ED8', bg: '#DBEAFE' },
      { id: 'electrical',     label: 'Electrical',       price: 'From R400',   iconClass: 'ti ti-bolt',              color: '#D97706', bg: '#FEF3C7' },
      { id: 'cleaning',       label: 'Cleaning',         price: 'From R250',   iconClass: 'ti ti-wash',              color: '#2D8A6E', bg: '#D1FAE5' },
      { id: 'hvac',           label: 'AC & HVAC',        price: 'From R500',   iconClass: 'ti ti-air-conditioning',  color: '#7C3AED', bg: '#EDE9FE' },
      { id: 'gas',            label: 'Gas',              price: 'From R450',   iconClass: 'ti ti-flame',             color: '#DC2626', bg: '#FEE2E2' },
      { id: 'handyman',       label: 'Handyman',         price: 'From R300',   iconClass: 'ti ti-tools',             color: '#92400E', bg: '#FEF3C7' },
      { id: 'painting',       label: 'Painting',         price: 'From R280',   iconClass: 'ti ti-paint',             color: '#0891B2', bg: '#CFFAFE' },
      { id: 'tiling',         label: 'Tiling',           price: 'From R320',   iconClass: 'ti ti-grid-pattern',      color: '#6D28D9', bg: '#EDE9FE' },
      { id: 'carpentry',      label: 'Carpentry',        price: 'From R350',   iconClass: 'ti ti-axe',               color: '#78350F', bg: '#FEF3C7' },
      { id: 'roofing',        label: 'Roofing',          price: 'From R600',   iconClass: 'ti ti-home',              color: '#374151', bg: '#F3F4F6' },
      { id: 'bricklaying',    label: 'Bricklaying',      price: 'From R400',   iconClass: 'ti ti-building',          color: '#9D4E15', bg: '#FEF3C7' },
      { id: 'solar',          label: 'Solar Install',    price: 'From R1 500', iconClass: 'ti ti-sun',               color: '#D97706', bg: '#FEF3C7' },
      { id: 'borehole',       label: 'Borehole',         price: 'From R2 500', iconClass: 'ti ti-ripple',            color: '#0369A1', bg: '#E0F2FE' },
      { id: 'septic_tank',    label: 'Septic Tank',      price: 'From R800',   iconClass: 'ti ti-cylinder',          color: '#4B5563', bg: '#F3F4F6' },
      { id: 'dstv',           label: 'DSTV & Satellite', price: 'From R250',   iconClass: 'ti ti-device-tv',         color: '#1E40AF', bg: '#DBEAFE' },
      { id: 'pest_control',   label: 'Pest Control',     price: 'From R450',   iconClass: 'ti ti-bug',               color: '#065F46', bg: '#D1FAE5' },
      { id: 'locksmith',      label: 'Locksmith',        price: 'From R350',   iconClass: 'ti ti-lock',              color: '#374151', bg: '#F3F4F6' },
      { id: 'waterproofing',  label: 'Waterproofing',    price: 'From R700',   iconClass: 'ti ti-umbrella',          color: '#0284C7', bg: '#E0F2FE' },
    ],
  },
  {
    category: 'Event Hire',
    services: [
      { id: 'tent_hire',              label: 'Tent Hire',            price: 'From R800',   iconClass: 'ti ti-tent',         color: '#7C3AED', bg: '#EDE9FE' },
      { id: 'chair_table_hire',       label: 'Chairs & Tables',      price: 'From R15/pc', iconClass: 'ti ti-armchair',     color: '#0891B2', bg: '#CFFAFE' },
      { id: 'decor_hire',             label: 'Décor Hire',           price: 'From R500',   iconClass: 'ti ti-sparkles',     color: '#DB2777', bg: '#FCE7F3' },
      { id: 'sound_pa_hire',          label: 'PA & Sound',           price: 'From R600',   iconClass: 'ti ti-speakerphone', color: '#1D4ED8', bg: '#DBEAFE' },
      { id: 'jumping_castle_hire',    label: 'Jumping Castle',       price: 'From R700',   iconClass: 'ti ti-building-castle', color: '#D97706', bg: '#FEF3C7' },
      { id: 'catering_equipment_hire',label: 'Catering Equipment',   price: 'From R400',   iconClass: 'ti ti-bowl-chopsticks', color: '#065F46', bg: '#D1FAE5' },
      { id: 'cold_room_hire',         label: 'Cold Room Hire',       price: 'From R1 200', iconClass: 'ti ti-snowflake',    color: '#0284C7', bg: '#E0F2FE' },
      { id: 'mobile_toilet_hire',     label: 'Mobile Toilets',       price: 'From R350',   iconClass: 'ti ti-toilet-paper', color: '#374151', bg: '#F3F4F6' },
    ],
  },
  {
    category: 'Plant & Equipment',
    services: [
      { id: 'generator_hire',   label: 'Generator Hire',    price: 'From R600',   iconClass: 'ti ti-bolt',     color: '#D97706', bg: '#FEF3C7' },
      { id: 'water_bowser_hire',label: 'Water Bowser',      price: 'From R500',   iconClass: 'ti ti-droplet',  color: '#0284C7', bg: '#E0F2FE' },
    ],
  },
  {
    category: 'Transport & Logistics',
    services: [
      { id: 'bakkie_hire',        label: 'Bakkie Hire',        price: 'From R400',   iconClass: 'ti ti-truck',          color: '#374151', bg: '#F3F4F6' },
      { id: 'van_hire',           label: 'Van Hire',           price: 'From R600',   iconClass: 'ti ti-truck',          color: '#1D4ED8', bg: '#DBEAFE' },
      { id: 'furniture_removal',  label: 'Furniture Removal',  price: 'From R800',   iconClass: 'ti ti-box',            color: '#78350F', bg: '#FEF3C7' },
      { id: 'last_mile_delivery', label: 'Last-Mile Delivery', price: 'From R80',    iconClass: 'ti ti-package',        color: '#2D8A6E', bg: '#D1FAE5' },
      { id: 'livestock_transport',label: 'Livestock Transport',price: 'From R600',   iconClass: 'ti ti-paw',            color: '#78350F', bg: '#FEF3C7' },
    ],
  },
  {
    category: 'Security',
    services: [
      { id: 'security_guard_hire',label: 'Security Guards',   price: 'From R350',   iconClass: 'ti ti-shield',         color: '#374151', bg: '#F3F4F6' },
      { id: 'security',           label: 'Alarm & CCTV',      price: 'From R500',   iconClass: 'ti ti-camera',         color: '#DC2626', bg: '#FEE2E2' },
    ],
  },
]

// Flat list for backwards-compat
export const SERVICES = SERVICE_CATEGORIES.flatMap(c => c.services)
