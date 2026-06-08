/**
 * Service catalogue — questions, pricing and metadata for all 19 services.
 * Used by the booking quote form and the client home screen.
 */

export interface ServiceOption {
  label: string
  value: string
  priceMin: number
  priceMax: number
}

export interface ServiceQuestion {
  key:      string
  label:    string
  type:     'select' | 'counter' | 'toggle'
  options?: ServiceOption[]
  unit?:    string   // for counter (e.g. "units", "rooms")
  min?:     number
  max?:     number
  default?: number
}

export interface ServiceConfig {
  id:               string
  label:            string
  emoji:            string
  bg:               string
  iconColor:        string
  priceLabel:       string
  requiresTradeCert: boolean
  questions:        ServiceQuestion[]
}

// ─── Urgency — shared across all services ───────────────────────────────────
export const URGENCY_QUESTION: ServiceQuestion = {
  key:   'urgency',
  label: 'How urgent is this?',
  type:  'select',
  options: [
    { label: 'Standard (within 24hrs)', value: 'standard',  priceMin: 0,   priceMax: 0   },
    { label: 'Urgent (within 4hrs)',     value: 'urgent',    priceMin: 150, priceMax: 150 },
    { label: 'Emergency (ASAP)',         value: 'emergency', priceMin: 350, priceMax: 350 },
  ],
}

// ─── Service catalogue ────────────────────────────────────────────────────────
export const SERVICES: ServiceConfig[] = [
  {
    id: 'plumbing', label: 'Plumbing', emoji: '💧', bg: '#DBEAFE', iconColor: '#1D4ED8',
    priceLabel: 'From R350', requiresTradeCert: true,
    questions: [
      { key: 'issue', label: 'What is the issue?', type: 'select', options: [
        { label: 'Blocked drain',         value: 'blocked_drain',        priceMin: 350,  priceMax: 600   },
        { label: 'Burst pipe',            value: 'burst_pipe',           priceMin: 600,  priceMax: 1800  },
        { label: 'Geyser repair',         value: 'geyser_repair',        priceMin: 800,  priceMax: 1800  },
        { label: 'Geyser replacement',    value: 'geyser_replacement',   priceMin: 3500, priceMax: 7000  },
        { label: 'Leak repair',           value: 'leak',                 priceMin: 400,  priceMax: 900   },
        { label: 'Toilet repair',         value: 'toilet',               priceMin: 300,  priceMax: 700   },
        { label: 'New installation',      value: 'installation',         priceMin: 500,  priceMax: 2500  },
      ]},
      URGENCY_QUESTION,
    ],
  },
  {
    id: 'electrical', label: 'Electrical', emoji: '⚡', bg: '#FEF3C7', iconColor: '#D97706',
    priceLabel: 'From R400', requiresTradeCert: true,
    questions: [
      { key: 'issue', label: 'What do you need?', type: 'select', options: [
        { label: 'DB board / tripped switch', value: 'db_board',     priceMin: 400,  priceMax: 1200  },
        { label: 'New plug points',           value: 'plug_points',  priceMin: 300,  priceMax: 600   },
        { label: 'Lighting installation',     value: 'lighting',     priceMin: 250,  priceMax: 500   },
        { label: 'Fault finding',             value: 'fault',        priceMin: 500,  priceMax: 900   },
        { label: 'Rewiring',                  value: 'rewiring',     priceMin: 2000, priceMax: 8000  },
        { label: 'Certificate of compliance', value: 'coc',          priceMin: 800,  priceMax: 1500  },
        { label: 'New installation',          value: 'installation', priceMin: 500,  priceMax: 3000  },
      ]},
      { key: 'qty', label: 'How many points / fittings?', type: 'counter', unit: 'items', min: 1, max: 20, default: 1 },
      URGENCY_QUESTION,
    ],
  },
  {
    id: 'cleaning', label: 'Cleaning', emoji: '🧹', bg: '#D1FAE5', iconColor: '#065F46',
    priceLabel: 'From R250', requiresTradeCert: false,
    questions: [
      { key: 'type', label: 'Type of clean', type: 'select', options: [
        { label: 'Regular clean',       value: 'regular',   priceMin: 250, priceMax: 500  },
        { label: 'Deep clean',          value: 'deep',      priceMin: 500, priceMax: 1200 },
        { label: 'Move-in / move-out',  value: 'move',      priceMin: 800, priceMax: 2000 },
        { label: 'Office clean',        value: 'office',    priceMin: 400, priceMax: 1500 },
        { label: 'Post-construction',   value: 'post_con',  priceMin: 800, priceMax: 2500 },
      ]},
      { key: 'bedrooms',  label: 'Number of bedrooms',  type: 'counter', unit: 'bedrooms',  min: 0, max: 10, default: 2 },
      { key: 'bathrooms', label: 'Number of bathrooms', type: 'counter', unit: 'bathrooms', min: 1, max: 6,  default: 1 },
      { key: 'extras', label: 'Extras needed', type: 'select', options: [
        { label: 'No extras',           value: 'none',     priceMin: 0,   priceMax: 0   },
        { label: 'Oven cleaning',       value: 'oven',     priceMin: 150, priceMax: 200 },
        { label: 'Window cleaning',     value: 'windows',  priceMin: 150, priceMax: 300 },
        { label: 'Carpet cleaning',     value: 'carpets',  priceMin: 200, priceMax: 500 },
        { label: 'All extras',          value: 'all',      priceMin: 400, priceMax: 800 },
      ]},
    ],
  },
  {
    id: 'hvac', label: 'AC & HVAC', emoji: '❄️', bg: '#EDE9FE', iconColor: '#7C3AED',
    priceLabel: 'From R500', requiresTradeCert: true,
    questions: [
      { key: 'service', label: 'What do you need?', type: 'select', options: [
        { label: 'Installation',          value: 'install',     priceMin: 3000, priceMax: 9000 },
        { label: 'Repair',                value: 'repair',      priceMin: 500,  priceMax: 2000 },
        { label: 'Service / maintenance', value: 'service',     priceMin: 500,  priceMax: 900  },
        { label: 'Gas recharge',          value: 'gas_recharge',priceMin: 600,  priceMax: 1400 },
      ]},
      { key: 'units', label: 'Number of units', type: 'counter', unit: 'units', min: 1, max: 10, default: 1 },
      URGENCY_QUESTION,
    ],
  },
  {
    id: 'gas', label: 'Gas', emoji: '🔥', bg: '#FEE2E2', iconColor: '#DC2626',
    priceLabel: 'From R450', requiresTradeCert: true,
    questions: [
      { key: 'work', label: 'Type of work', type: 'select', options: [
        { label: 'Gas installation',          value: 'installation',   priceMin: 1500, priceMax: 4000 },
        { label: 'Leak detection & repair',   value: 'leak',           priceMin: 500,  priceMax: 1500 },
        { label: 'Compliance certificate',    value: 'coc',            priceMin: 800,  priceMax: 1500 },
        { label: 'Appliance connection',      value: 'appliance',      priceMin: 400,  priceMax: 900  },
        { label: 'Gas geyser installation',   value: 'geyser',         priceMin: 3000, priceMax: 7000 },
      ]},
      { key: 'appliance', label: 'Appliance type', type: 'select', options: [
        { label: 'Stove / hob',  value: 'stove',  priceMin: 0, priceMax: 0 },
        { label: 'Geyser',       value: 'geyser', priceMin: 0, priceMax: 0 },
        { label: 'Braai',        value: 'braai',  priceMin: 0, priceMax: 0 },
        { label: 'Heater',       value: 'heater', priceMin: 0, priceMax: 0 },
        { label: 'Other',        value: 'other',  priceMin: 0, priceMax: 0 },
      ]},
      URGENCY_QUESTION,
    ],
  },
  {
    id: 'handyman', label: 'Handyman', emoji: '🔧', bg: '#FEF3C7', iconColor: '#92400E',
    priceLabel: 'From R300', requiresTradeCert: false,
    questions: [
      { key: 'job', label: 'What needs doing?', type: 'select', options: [
        { label: 'Furniture assembly',  value: 'furniture',  priceMin: 300,  priceMax: 800  },
        { label: 'General repairs',     value: 'repairs',    priceMin: 300,  priceMax: 1000 },
        { label: 'TV / shelf mounting', value: 'mounting',   priceMin: 300,  priceMax: 600  },
        { label: 'Door / lock repair',  value: 'door',       priceMin: 350,  priceMax: 700  },
        { label: 'Gutter cleaning',     value: 'gutters',    priceMin: 400,  priceMax: 900  },
        { label: 'Other',               value: 'other',      priceMin: 250,  priceMax: 1000 },
      ]},
      { key: 'scope', label: 'Scope of work', type: 'select', options: [
        { label: 'Small (under 2hrs)',  value: 'small',  priceMin: 0,   priceMax: 0   },
        { label: 'Medium (2–4hrs)',     value: 'medium', priceMin: 200, priceMax: 400 },
        { label: 'Large (4hrs+)',       value: 'large',  priceMin: 400, priceMax: 800 },
      ]},
    ],
  },
  {
    id: 'tiling', label: 'Tiling', emoji: '🪟', bg: '#F0FDF4', iconColor: '#15803D',
    priceLabel: 'From R150/m²', requiresTradeCert: true,
    questions: [
      { key: 'area', label: 'Area to tile', type: 'select', options: [
        { label: 'Bathroom floor',     value: 'bathroom_floor',  priceMin: 800,  priceMax: 2500  },
        { label: 'Bathroom walls',     value: 'bathroom_walls',  priceMin: 1000, priceMax: 3000  },
        { label: 'Kitchen floor',      value: 'kitchen_floor',   priceMin: 1000, priceMax: 3000  },
        { label: 'Kitchen backsplash', value: 'backsplash',      priceMin: 600,  priceMax: 1800  },
        { label: 'Living area',        value: 'living',          priceMin: 2000, priceMax: 8000  },
        { label: 'Outdoor / patio',    value: 'outdoor',         priceMin: 1500, priceMax: 6000  },
        { label: 'Pool area',          value: 'pool',            priceMin: 2000, priceMax: 8000  },
      ]},
      { key: 'sqm', label: 'Approximate area (m²)', type: 'counter', unit: 'm²', min: 1, max: 200, default: 10 },
      { key: 'supply', label: 'Tiles supplied by', type: 'select', options: [
        { label: 'I supply the tiles',      value: 'client',    priceMin: 0,   priceMax: 0    },
        { label: 'Provider to supply tiles', value: 'provider', priceMin: 500, priceMax: 3000 },
      ]},
    ],
  },
  {
    id: 'painting', label: 'Painting', emoji: '🎨', bg: '#FFF7ED', iconColor: '#C2410C',
    priceLabel: 'From R80/m²', requiresTradeCert: false,
    questions: [
      { key: 'type', label: 'Type of painting', type: 'select', options: [
        { label: 'Interior walls',    value: 'interior',  priceMin: 800,  priceMax: 5000  },
        { label: 'Exterior walls',    value: 'exterior',  priceMin: 2000, priceMax: 12000 },
        { label: 'Roof / ceiling',    value: 'ceiling',   priceMin: 600,  priceMax: 3000  },
        { label: 'Damp seal',         value: 'damp',      priceMin: 1000, priceMax: 4000  },
        { label: 'Doors & trims',     value: 'trims',     priceMin: 400,  priceMax: 1500  },
        { label: 'Garage floor',      value: 'garage',    priceMin: 800,  priceMax: 2500  },
      ]},
      { key: 'rooms', label: 'Number of rooms', type: 'counter', unit: 'rooms', min: 1, max: 20, default: 2 },
      { key: 'paint', label: 'Paint supplied by', type: 'select', options: [
        { label: 'I supply the paint',       value: 'client',   priceMin: 0,   priceMax: 0    },
        { label: 'Provider to supply paint', value: 'provider', priceMin: 500, priceMax: 3000 },
      ]},
    ],
  },
  {
    id: 'landscaping', label: 'Landscaping', emoji: '🌿', bg: '#DCFCE7', iconColor: '#15803D',
    priceLabel: 'From R350', requiresTradeCert: false,
    questions: [
      { key: 'service', label: 'What do you need?', type: 'select', options: [
        { label: 'Lawn mowing',          value: 'mowing',     priceMin: 300,  priceMax: 900   },
        { label: 'Garden cleanup',       value: 'cleanup',    priceMin: 400,  priceMax: 1500  },
        { label: 'Tree felling / trim',  value: 'tree',       priceMin: 500,  priceMax: 3000  },
        { label: 'Garden design',        value: 'design',     priceMin: 2000, priceMax: 10000 },
        { label: 'Irrigation system',    value: 'irrigation', priceMin: 2000, priceMax: 8000  },
        { label: 'Hedge trimming',       value: 'hedge',      priceMin: 300,  priceMax: 900   },
        { label: 'Planting & mulching',  value: 'planting',   priceMin: 500,  priceMax: 2000  },
      ]},
      { key: 'size', label: 'Garden size', type: 'select', options: [
        { label: 'Small (under 100m²)',  value: 'small',  priceMin: 0,   priceMax: 0    },
        { label: 'Medium (100–300m²)',   value: 'medium', priceMin: 200, priceMax: 500  },
        { label: 'Large (300m²+)',       value: 'large',  priceMin: 400, priceMax: 1000 },
      ]},
    ],
  },
  {
    id: 'pool', label: 'Pool', emoji: '🏊', bg: '#CFFAFE', iconColor: '#0E7490',
    priceLabel: 'From R350', requiresTradeCert: false,
    questions: [
      { key: 'service', label: 'What do you need?', type: 'select', options: [
        { label: 'Pool cleaning',       value: 'cleaning',   priceMin: 350, priceMax: 700  },
        { label: 'Chemical balance',    value: 'chemicals',  priceMin: 300, priceMax: 600  },
        { label: 'Pump / filter repair',value: 'pump',       priceMin: 500, priceMax: 2000 },
        { label: 'Pool plastering',     value: 'plaster',    priceMin: 3000,priceMax: 12000},
        { label: 'Leak detection',      value: 'leak',       priceMin: 600, priceMax: 1500 },
        { label: 'Monthly maintenance', value: 'monthly',    priceMin: 500, priceMax: 900  },
      ]},
    ],
  },
  {
    id: 'pest_control', label: 'Pest Control', emoji: '🐜', bg: '#FEF9C3', iconColor: '#A16207',
    priceLabel: 'From R500', requiresTradeCert: false,
    questions: [
      { key: 'pest', label: 'Type of pest', type: 'select', options: [
        { label: 'Cockroaches',          value: 'cockroaches', priceMin: 500,  priceMax: 1000 },
        { label: 'Rats / mice',          value: 'rodents',     priceMin: 600,  priceMax: 1500 },
        { label: 'Termites',             value: 'termites',    priceMin: 1000, priceMax: 4000 },
        { label: 'Bed bugs',             value: 'bed_bugs',    priceMin: 800,  priceMax: 2000 },
        { label: 'Ants',                 value: 'ants',        priceMin: 400,  priceMax: 900  },
        { label: 'Bees / wasps',         value: 'bees',        priceMin: 500,  priceMax: 1200 },
        { label: 'General fumigation',   value: 'fumigation',  priceMin: 800,  priceMax: 2500 },
      ]},
      { key: 'property', label: 'Property type', type: 'select', options: [
        { label: 'House',       value: 'house',      priceMin: 0,   priceMax: 0   },
        { label: 'Flat / unit', value: 'flat',       priceMin: 0,   priceMax: 0   },
        { label: 'Business',    value: 'commercial', priceMin: 300, priceMax: 800 },
      ]},
    ],
  },
  {
    id: 'locksmith', label: 'Locksmith', emoji: '🔑', bg: '#F3F4F6', iconColor: '#374151',
    priceLabel: 'From R300', requiresTradeCert: false,
    questions: [
      { key: 'service', label: 'What do you need?', type: 'select', options: [
        { label: 'Locked out of home',   value: 'lockout',    priceMin: 300,  priceMax: 700  },
        { label: 'Lock replacement',     value: 'replace',    priceMin: 400,  priceMax: 1200 },
        { label: 'New lock installation',value: 'install',    priceMin: 350,  priceMax: 900  },
        { label: 'Safe opening',         value: 'safe',       priceMin: 500,  priceMax: 1500 },
        { label: 'Key duplication',      value: 'keys',       priceMin: 150,  priceMax: 400  },
        { label: 'Gate lock',            value: 'gate',       priceMin: 350,  priceMax: 900  },
      ]},
      URGENCY_QUESTION,
    ],
  },
  {
    id: 'carpentry', label: 'Carpentry', emoji: '🪚', bg: '#FEF3C7', iconColor: '#78350F',
    priceLabel: 'From R500', requiresTradeCert: true,
    questions: [
      { key: 'job', label: 'What do you need?', type: 'select', options: [
        { label: 'Built-in cupboards',   value: 'cupboards',  priceMin: 3000, priceMax: 15000 },
        { label: 'Wooden flooring',      value: 'flooring',   priceMin: 2000, priceMax: 10000 },
        { label: 'Door installation',    value: 'door',       priceMin: 500,  priceMax: 2000  },
        { label: 'Deck / pergola',       value: 'deck',       priceMin: 3000, priceMax: 20000 },
        { label: 'Furniture repairs',    value: 'repairs',    priceMin: 300,  priceMax: 1500  },
        { label: 'Custom furniture',     value: 'custom',     priceMin: 2000, priceMax: 15000 },
      ]},
    ],
  },
  {
    id: 'solar', label: 'Solar', emoji: '☀️', bg: '#FEF9C3', iconColor: '#CA8A04',
    priceLabel: 'From R8,000', requiresTradeCert: true,
    questions: [
      { key: 'system', label: 'What do you need?', type: 'select', options: [
        { label: 'Solar panels only',        value: 'panels',   priceMin: 8000,  priceMax: 40000 },
        { label: 'Inverter + battery',       value: 'inverter', priceMin: 15000, priceMax: 60000 },
        { label: 'Full solar system',        value: 'full',     priceMin: 25000, priceMax: 120000},
        { label: 'Solar geyser',             value: 'geyser',   priceMin: 8000,  priceMax: 20000 },
        { label: 'Solar repair / fault',     value: 'repair',   priceMin: 500,   priceMax: 3000  },
      ]},
      { key: 'panels', label: 'Number of panels', type: 'counter', unit: 'panels', min: 1, max: 30, default: 6 },
    ],
  },
  {
    id: 'security', label: 'Security', emoji: '📷', bg: '#F1F5F9', iconColor: '#334155',
    priceLabel: 'From R2,000', requiresTradeCert: true,
    questions: [
      { key: 'service', label: 'What do you need?', type: 'select', options: [
        { label: 'CCTV installation',       value: 'cctv',       priceMin: 2000, priceMax: 15000 },
        { label: 'Alarm system',            value: 'alarm',      priceMin: 2500, priceMax: 10000 },
        { label: 'Electric fence',          value: 'fence',      priceMin: 3000, priceMax: 20000 },
        { label: 'Intercom system',         value: 'intercom',   priceMin: 1500, priceMax: 8000  },
        { label: 'Repair / maintenance',    value: 'repair',     priceMin: 500,  priceMax: 2000  },
      ]},
      { key: 'cameras', label: 'Number of cameras', type: 'counter', unit: 'cameras', min: 1, max: 20, default: 4 },
    ],
  },
  {
    id: 'paving', label: 'Paving', emoji: '🛤️', bg: '#E7E5E4', iconColor: '#44403C',
    priceLabel: 'From R150/m²', requiresTradeCert: true,
    questions: [
      { key: 'type', label: 'Type of paving', type: 'select', options: [
        { label: 'Brick paving',     value: 'brick',    priceMin: 1500, priceMax: 8000  },
        { label: 'Concrete paving',  value: 'concrete', priceMin: 1000, priceMax: 6000  },
        { label: 'Driveway',         value: 'driveway', priceMin: 3000, priceMax: 15000 },
        { label: 'Pathway',          value: 'pathway',  priceMin: 800,  priceMax: 4000  },
        { label: 'Patio',            value: 'patio',    priceMin: 2000, priceMax: 10000 },
        { label: 'Repairs',          value: 'repair',   priceMin: 500,  priceMax: 3000  },
      ]},
      { key: 'sqm', label: 'Approximate area (m²)', type: 'counter', unit: 'm²', min: 5, max: 500, default: 30 },
    ],
  },
  {
    id: 'waterproofing', label: 'Waterproofing', emoji: '💦', bg: '#DBEAFE', iconColor: '#1E40AF',
    priceLabel: 'From R800', requiresTradeCert: true,
    questions: [
      { key: 'area', label: 'Area to waterproof', type: 'select', options: [
        { label: 'Flat roof',            value: 'flat_roof',  priceMin: 2000, priceMax: 10000 },
        { label: 'Pitched roof',         value: 'pitched',    priceMin: 1500, priceMax: 8000  },
        { label: 'Bathroom',             value: 'bathroom',   priceMin: 800,  priceMax: 3000  },
        { label: 'Basement',             value: 'basement',   priceMin: 2000, priceMax: 12000 },
        { label: 'Balcony / deck',       value: 'balcony',    priceMin: 1000, priceMax: 5000  },
        { label: 'Retaining wall',       value: 'wall',       priceMin: 1000, priceMax: 5000  },
      ]},
      { key: 'sqm', label: 'Approximate area (m²)', type: 'counter', unit: 'm²', min: 5, max: 300, default: 30 },
    ],
  },
  {
    id: 'roofing', label: 'Roofing', emoji: '🏠', bg: '#FEE2E2', iconColor: '#991B1B',
    priceLabel: 'From R1,000', requiresTradeCert: true,
    questions: [
      { key: 'job', label: 'What do you need?', type: 'select', options: [
        { label: 'Leak repair',         value: 'leak',         priceMin: 1000, priceMax: 5000  },
        { label: 'Tile replacement',    value: 'tiles',        priceMin: 1500, priceMax: 8000  },
        { label: 'IBR / corrugated',    value: 'ibr',          priceMin: 2000, priceMax: 12000 },
        { label: 'Full re-roof',        value: 'reroof',       priceMin: 10000,priceMax: 60000 },
        { label: 'Gutter replacement',  value: 'gutters',      priceMin: 800,  priceMax: 4000  },
        { label: 'Fascia & barge',      value: 'fascia',       priceMin: 500,  priceMax: 3000  },
        { label: 'Insulation',          value: 'insulation',   priceMin: 2000, priceMax: 8000  },
      ]},
      URGENCY_QUESTION,
    ],
  },
  {
    id: 'gate_motor', label: 'Gate & Garage', emoji: '🚪', bg: '#F3F4F6', iconColor: '#4B5563',
    priceLabel: 'From R500', requiresTradeCert: false,
    questions: [
      { key: 'service', label: 'What do you need?', type: 'select', options: [
        { label: 'Gate motor installation', value: 'gate_install', priceMin: 2500, priceMax: 6000 },
        { label: 'Gate motor repair',       value: 'gate_repair',  priceMin: 500,  priceMax: 2000 },
        { label: 'Garage motor install',    value: 'gar_install',  priceMin: 2000, priceMax: 5000 },
        { label: 'Garage motor repair',     value: 'gar_repair',   priceMin: 400,  priceMax: 1800 },
        { label: 'Remote programming',      value: 'remote',       priceMin: 150,  priceMax: 400  },
        { label: 'Intercom installation',   value: 'intercom',     priceMin: 1500, priceMax: 5000 },
      ]},
      URGENCY_QUESTION,
    ],
  },
  {
    id: 'moving', label: 'Moving', emoji: '📦', bg: '#E0E7FF', iconColor: '#4338CA',
    priceLabel: 'From R800', requiresTradeCert: false,
    questions: [
      { key: 'move', label: 'Type of move', type: 'select', options: [
        { label: 'Single room',      value: 'room',       priceMin: 800,  priceMax: 2000  },
        { label: '1–2 bedroom home', value: 'small_home', priceMin: 1500, priceMax: 4000  },
        { label: '3+ bedroom home',  value: 'large_home', priceMin: 3000, priceMax: 10000 },
        { label: 'Office move',      value: 'office',     priceMin: 2000, priceMax: 15000 },
        { label: 'Piano / safe',     value: 'heavy',      priceMin: 1000, priceMax: 3000  },
        { label: 'Furniture only',   value: 'furniture',  priceMin: 800,  priceMax: 3000  },
      ]},
      { key: 'packing', label: 'Packing service', type: 'select', options: [
        { label: 'No packing needed',    value: 'none',   priceMin: 0,   priceMax: 0    },
        { label: 'Partial packing',      value: 'partial',priceMin: 300, priceMax: 800  },
        { label: 'Full packing service', value: 'full',   priceMin: 600, priceMax: 2000 },
      ]},
    ],
  },

  // ─── Home Trades ─────────────────────────────────────────────────────────────
  {
    id: 'bricklaying', label: 'Bricklaying', emoji: '🧱', bg: '#FEF3C7', iconColor: '#92400E',
    priceLabel: 'From R800', requiresTradeCert: true,
    questions: [
      { key: 'job', label: 'What do you need?', type: 'select', options: [
        { label: 'New wall',           value: 'new_wall',  priceMin: 2000, priceMax: 15000 },
        { label: 'Boundary wall',      value: 'boundary',  priceMin: 3000, priceMax: 20000 },
        { label: 'Braai / fireplace',  value: 'braai',     priceMin: 2500, priceMax: 10000 },
        { label: 'Retaining wall',     value: 'retaining', priceMin: 3000, priceMax: 18000 },
        { label: 'Repairs / repoint',  value: 'repair',    priceMin: 800,  priceMax: 4000  },
        { label: 'Paving / steps',     value: 'steps',     priceMin: 1500, priceMax: 8000  },
      ]},
      { key: 'sqm', label: 'Approximate area (m²)', type: 'counter', unit: 'm²', min: 1, max: 200, default: 10 },
    ],
  },
  {
    id: 'borehole', label: 'Borehole', emoji: '🌊', bg: '#DBEAFE', iconColor: '#1E40AF',
    priceLabel: 'From R25,000', requiresTradeCert: true,
    questions: [
      { key: 'service', label: 'What do you need?', type: 'select', options: [
        { label: 'New borehole drilling',   value: 'drilling', priceMin: 25000, priceMax: 80000 },
        { label: 'Pump installation',       value: 'pump',     priceMin: 5000,  priceMax: 15000 },
        { label: 'Pump repair',             value: 'repair',   priceMin: 1500,  priceMax: 6000  },
        { label: 'Water testing',           value: 'testing',  priceMin: 800,   priceMax: 2500  },
        { label: 'Storage tank connection', value: 'tank',     priceMin: 2000,  priceMax: 8000  },
      ]},
      URGENCY_QUESTION,
    ],
  },
  {
    id: 'septic_tank', label: 'Septic Tank', emoji: '🚽', bg: '#E7E5E4', iconColor: '#44403C',
    priceLabel: 'From R800', requiresTradeCert: false,
    questions: [
      { key: 'service', label: 'What do you need?', type: 'select', options: [
        { label: 'Pump-out / emptying',   value: 'pumpout',  priceMin: 800,  priceMax: 2500  },
        { label: 'New installation',      value: 'install',  priceMin: 8000, priceMax: 25000 },
        { label: 'Repair / inspection',   value: 'repair',   priceMin: 1000, priceMax: 5000  },
        { label: 'Soakaway installation', value: 'soakaway', priceMin: 3000, priceMax: 10000 },
      ]},
      URGENCY_QUESTION,
    ],
  },
  {
    id: 'dstv', label: 'DSTV / Satellite', emoji: '📡', bg: '#F0FDF4', iconColor: '#15803D',
    priceLabel: 'From R350', requiresTradeCert: false,
    questions: [
      { key: 'service', label: 'What do you need?', type: 'select', options: [
        { label: 'New dish installation', value: 'install',  priceMin: 350, priceMax: 900  },
        { label: 'Signal / alignment',    value: 'signal',   priceMin: 300, priceMax: 700  },
        { label: 'Extra point / cabling', value: 'extra',    priceMin: 400, priceMax: 1000 },
        { label: 'Decoder setup',         value: 'decoder',  priceMin: 250, priceMax: 500  },
        { label: 'OpenView / Ovhd',       value: 'openview', priceMin: 350, priceMax: 800  },
      ]},
      URGENCY_QUESTION,
    ],
  },

  // ─── Event Hire ───────────────────────────────────────────────────────────────
  {
    id: 'tent_hire', label: 'Tent Hire', emoji: '⛺', bg: '#FEF9C3', iconColor: '#CA8A04',
    priceLabel: 'From R1,500', requiresTradeCert: false,
    questions: [
      { key: 'size', label: 'Tent size', type: 'select', options: [
        { label: 'Small (up to 50 pax)',  value: 'small',   priceMin: 1500, priceMax: 4000  },
        { label: 'Medium (50–150 pax)',   value: 'medium',  priceMin: 4000, priceMax: 10000 },
        { label: 'Large (150–300 pax)',   value: 'large',   priceMin: 8000, priceMax: 20000 },
        { label: 'Marquee (300+ pax)',    value: 'marquee', priceMin: 15000,priceMax: 50000 },
      ]},
      { key: 'days', label: 'Number of days', type: 'counter', unit: 'days', min: 1, max: 7, default: 1 },
      { key: 'delivery', label: 'Delivery & setup', type: 'select', options: [
        { label: 'Delivery only',                    value: 'delivery', priceMin: 500,  priceMax: 1500 },
        { label: 'Delivery + setup',                 value: 'setup',    priceMin: 1000, priceMax: 3000 },
        { label: 'Full service (take-down incl.)',   value: 'full',     priceMin: 1500, priceMax: 5000 },
      ]},
    ],
  },
  {
    id: 'chair_table_hire', label: 'Chair & Table Hire', emoji: '🪑', bg: '#F3F4F6', iconColor: '#374151',
    priceLabel: 'From R15/chair', requiresTradeCert: false,
    questions: [
      { key: 'package', label: 'What do you need?', type: 'select', options: [
        { label: 'Chairs only',            value: 'chairs', priceMin: 500,  priceMax: 3000  },
        { label: 'Tables only',            value: 'tables', priceMin: 800,  priceMax: 4000  },
        { label: 'Chairs + tables',        value: 'both',   priceMin: 1200, priceMax: 6000  },
        { label: 'Full function package',  value: 'full',   priceMin: 2500, priceMax: 12000 },
      ]},
      { key: 'qty', label: 'Number of guests', type: 'counter', unit: 'guests', min: 10, max: 500, default: 50 },
      { key: 'days', label: 'Number of days', type: 'counter', unit: 'days', min: 1, max: 5, default: 1 },
    ],
  },
  {
    id: 'decor_hire', label: 'Décor Hire', emoji: '🌸', bg: '#FDF2F8', iconColor: '#9D174D',
    priceLabel: 'From R2,000', requiresTradeCert: false,
    questions: [
      { key: 'event', label: 'Event type', type: 'select', options: [
        { label: 'Wedding',          value: 'wedding',    priceMin: 5000, priceMax: 30000 },
        { label: 'Birthday party',   value: 'birthday',   priceMin: 2000, priceMax: 10000 },
        { label: 'Corporate event',  value: 'corporate',  priceMin: 3000, priceMax: 20000 },
        { label: 'Funeral',          value: 'funeral',    priceMin: 2000, priceMax: 8000  },
        { label: 'Baby shower',      value: 'babyshower', priceMin: 1500, priceMax: 6000  },
        { label: 'General function', value: 'general',    priceMin: 2000, priceMax: 12000 },
      ]},
      { key: 'delivery', label: 'Setup included?', type: 'select', options: [
        { label: 'Pickup only',       value: 'pickup', priceMin: 0,   priceMax: 0    },
        { label: 'Delivery + setup',  value: 'setup',  priceMin: 800, priceMax: 2000 },
      ]},
    ],
  },
  {
    id: 'sound_pa_hire', label: 'Sound / PA Hire', emoji: '🔊', bg: '#EDE9FE', iconColor: '#6D28D9',
    priceLabel: 'From R1,500', requiresTradeCert: false,
    questions: [
      { key: 'system', label: 'System size', type: 'select', options: [
        { label: 'Small (up to 50 pax)',  value: 'small',  priceMin: 1500, priceMax: 4000  },
        { label: 'Medium (50–200 pax)',   value: 'medium', priceMin: 3000, priceMax: 8000  },
        { label: 'Large (200+ pax)',      value: 'large',  priceMin: 6000, priceMax: 20000 },
        { label: 'DJ setup + lights',     value: 'dj',     priceMin: 3500, priceMax: 10000 },
        { label: 'Live band PA',          value: 'band',   priceMin: 5000, priceMax: 15000 },
      ]},
      { key: 'operator', label: 'Operator needed?', type: 'select', options: [
        { label: 'Equipment only',        value: 'equipment', priceMin: 0,    priceMax: 0    },
        { label: 'Equipment + operator',  value: 'operator',  priceMin: 1000, priceMax: 3000 },
      ]},
      { key: 'days', label: 'Number of days', type: 'counter', unit: 'days', min: 1, max: 5, default: 1 },
    ],
  },
  {
    id: 'jumping_castle_hire', label: 'Jumping Castle', emoji: '🏰', bg: '#FEE2E2', iconColor: '#DC2626',
    priceLabel: 'From R600', requiresTradeCert: false,
    questions: [
      { key: 'size', label: 'Castle size', type: 'select', options: [
        { label: 'Small (toddlers)',        value: 'small',  priceMin: 600,  priceMax: 1200 },
        { label: 'Medium (up to 10 kids)',  value: 'medium', priceMin: 900,  priceMax: 1800 },
        { label: 'Large combo unit',        value: 'large',  priceMin: 1400, priceMax: 3000 },
        { label: 'Water slide combo',       value: 'water',  priceMin: 1800, priceMax: 4000 },
      ]},
      { key: 'hours', label: 'Hours needed', type: 'counter', unit: 'hours', min: 2, max: 12, default: 4 },
    ],
  },
  {
    id: 'catering_equipment_hire', label: 'Catering Equipment', emoji: '🍳', bg: '#F0FDF4', iconColor: '#065F46',
    priceLabel: 'From R500', requiresTradeCert: false,
    questions: [
      { key: 'equipment', label: 'What do you need?', type: 'select', options: [
        { label: 'Pots & pans set',       value: 'pots',     priceMin: 500,  priceMax: 1500 },
        { label: 'Gas stoves / burners',  value: 'stoves',   priceMin: 400,  priceMax: 1200 },
        { label: 'Chafing dishes',        value: 'chafing',  priceMin: 300,  priceMax: 1000 },
        { label: 'Full catering kit',     value: 'full_kit', priceMin: 1500, priceMax: 5000 },
        { label: 'Crockery & cutlery',    value: 'crockery', priceMin: 600,  priceMax: 2000 },
        { label: 'Coffee / urn station',  value: 'urn',      priceMin: 300,  priceMax: 800  },
      ]},
      { key: 'days', label: 'Number of days', type: 'counter', unit: 'days', min: 1, max: 5, default: 1 },
    ],
  },
  {
    id: 'cold_room_hire', label: 'Cold Room Hire', emoji: '🧊', bg: '#CFFAFE', iconColor: '#0E7490',
    priceLabel: 'From R1,200/day', requiresTradeCert: false,
    questions: [
      { key: 'size', label: 'Cold room size', type: 'select', options: [
        { label: 'Small (1–2 pallets)',   value: 'small',  priceMin: 1200, priceMax: 2500 },
        { label: 'Medium (3–5 pallets)',  value: 'medium', priceMin: 2000, priceMax: 4000 },
        { label: 'Large (6+ pallets)',    value: 'large',  priceMin: 3500, priceMax: 8000 },
        { label: 'Trailer unit (mobile)', value: 'mobile', priceMin: 1800, priceMax: 5000 },
      ]},
      { key: 'days', label: 'Number of days', type: 'counter', unit: 'days', min: 1, max: 14, default: 2 },
    ],
  },
  {
    id: 'mobile_toilet_hire', label: 'Mobile Toilets', emoji: '🚻', bg: '#E7E5E4', iconColor: '#57534E',
    priceLabel: 'From R400/day', requiresTradeCert: false,
    questions: [
      { key: 'type', label: 'Toilet type', type: 'select', options: [
        { label: 'Standard portable',      value: 'standard', priceMin: 400,  priceMax: 800  },
        { label: 'Luxury / VIP unit',      value: 'luxury',   priceMin: 1200, priceMax: 3000 },
        { label: 'Disabled-access unit',   value: 'disabled', priceMin: 600,  priceMax: 1500 },
        { label: 'Toilet trailer (multi)', value: 'trailer',  priceMin: 2000, priceMax: 6000 },
      ]},
      { key: 'qty', label: 'Number of units', type: 'counter', unit: 'units', min: 1, max: 20, default: 2 },
      { key: 'days', label: 'Number of days', type: 'counter', unit: 'days', min: 1, max: 14, default: 1 },
    ],
  },

  // ─── Plant & Equipment ────────────────────────────────────────────────────────
  {
    id: 'generator_hire', label: 'Generator Hire', emoji: '⚡', bg: '#FEF3C7', iconColor: '#D97706',
    priceLabel: 'From R600/day', requiresTradeCert: false,
    questions: [
      { key: 'size', label: 'Generator size', type: 'select', options: [
        { label: 'Small (up to 5kVA)',    value: 'small',      priceMin: 600,  priceMax: 1200  },
        { label: 'Medium (5–15kVA)',      value: 'medium',     priceMin: 1000, priceMax: 2500  },
        { label: 'Large (15–50kVA)',      value: 'large',      priceMin: 2000, priceMax: 6000  },
        { label: 'Industrial (50kVA+)',   value: 'industrial', priceMin: 4000, priceMax: 15000 },
      ]},
      { key: 'days', label: 'Number of days', type: 'counter', unit: 'days', min: 1, max: 30, default: 1 },
      { key: 'fuel', label: 'Fuel included?', type: 'select', options: [
        { label: 'No fuel — I supply',     value: 'no_fuel', priceMin: 0,   priceMax: 0   },
        { label: 'Fuel included (per day)', value: 'fuel',   priceMin: 300, priceMax: 800 },
      ]},
    ],
  },
  {
    id: 'water_bowser_hire', label: 'Water Bowser', emoji: '🚰', bg: '#DBEAFE', iconColor: '#1D4ED8',
    priceLabel: 'From R800/delivery', requiresTradeCert: false,
    questions: [
      { key: 'service', label: 'What do you need?', type: 'select', options: [
        { label: 'Water delivery (once-off)',  value: 'delivery',     priceMin: 800,  priceMax: 2000 },
        { label: 'Bowser hire (daily)',        value: 'hire',         priceMin: 1200, priceMax: 3500 },
        { label: 'Bowser + driver (per day)',  value: 'driver',       priceMin: 1800, priceMax: 4500 },
        { label: 'Construction water supply',  value: 'construction', priceMin: 2000, priceMax: 8000 },
      ]},
      { key: 'capacity', label: 'Capacity needed', type: 'select', options: [
        { label: 'Small (up to 5,000L)',    value: 'small',  priceMin: 0,   priceMax: 0    },
        { label: 'Medium (5,000–10,000L)',  value: 'medium', priceMin: 300, priceMax: 800  },
        { label: 'Large (10,000L+)',        value: 'large',  priceMin: 600, priceMax: 1500 },
      ]},
    ],
  },

  // ─── Transport & Logistics ────────────────────────────────────────────────────
  {
    id: 'van_hire', label: 'Van Hire', emoji: '🚐', bg: '#E0E7FF', iconColor: '#4338CA',
    priceLabel: 'From R450/day', requiresTradeCert: false,
    questions: [
      { key: 'type', label: 'Van type', type: 'select', options: [
        { label: 'Panel van (small)',     value: 'panel',   priceMin: 450,  priceMax: 900  },
        { label: 'Minibus (9–15 seater)', value: 'minibus', priceMin: 600,  priceMax: 1500 },
        { label: 'Midi-bus (22 seater)',  value: 'midibus', priceMin: 1000, priceMax: 2500 },
        { label: 'Crew-cab / load van',   value: 'crewcab', priceMin: 700,  priceMax: 1800 },
      ]},
      { key: 'driver', label: 'Driver included?', type: 'select', options: [
        { label: 'Self-drive',  value: 'self',   priceMin: 0,   priceMax: 0   },
        { label: 'With driver', value: 'driver', priceMin: 400, priceMax: 900 },
      ]},
      { key: 'days', label: 'Number of days', type: 'counter', unit: 'days', min: 1, max: 30, default: 1 },
    ],
  },
  {
    id: 'bakkie_hire', label: 'Bakkie Hire', emoji: '🛻', bg: '#FEF3C7', iconColor: '#78350F',
    priceLabel: 'From R350/day', requiresTradeCert: false,
    questions: [
      { key: 'type', label: 'Bakkie type', type: 'select', options: [
        { label: '½ ton (single cab)',  value: 'half_ton', priceMin: 350, priceMax: 700  },
        { label: '1 ton (double cab)',  value: 'one_ton',  priceMin: 500, priceMax: 1100 },
        { label: '1.5 ton (flatbed)',   value: 'flatbed',  priceMin: 600, priceMax: 1400 },
        { label: '4×4 offroad',         value: 'fourx4',   priceMin: 700, priceMax: 1800 },
      ]},
      { key: 'driver', label: 'Driver included?', type: 'select', options: [
        { label: 'Self-drive',  value: 'self',   priceMin: 0,   priceMax: 0   },
        { label: 'With driver', value: 'driver', priceMin: 350, priceMax: 800 },
      ]},
      { key: 'days', label: 'Number of days', type: 'counter', unit: 'days', min: 1, max: 30, default: 1 },
    ],
  },
  {
    id: 'furniture_removal', label: 'Furniture Removal', emoji: '🛋️', bg: '#E0E7FF', iconColor: '#3730A3',
    priceLabel: 'From R800', requiresTradeCert: false,
    questions: [
      { key: 'load', label: 'Load size', type: 'select', options: [
        { label: 'Few items (bakkie load)',  value: 'small',  priceMin: 800,  priceMax: 2000  },
        { label: '1–2 bedroom home',        value: 'medium', priceMin: 1800, priceMax: 5000  },
        { label: '3+ bedroom home',         value: 'large',  priceMin: 3500, priceMax: 10000 },
        { label: 'Office / commercial',     value: 'office', priceMin: 3000, priceMax: 15000 },
      ]},
      { key: 'distance', label: 'Distance', type: 'select', options: [
        { label: 'Local (within 30km)',     value: 'local',    priceMin: 0,    priceMax: 0    },
        { label: 'Regional (30–150km)',     value: 'regional', priceMin: 500,  priceMax: 1500 },
        { label: 'Long distance (150km+)',  value: 'long',     priceMin: 1200, priceMax: 4000 },
      ]},
    ],
  },
  {
    id: 'last_mile_delivery', label: 'Last-Mile Delivery', emoji: '📬', bg: '#F0FDF4', iconColor: '#166534',
    priceLabel: 'From R200', requiresTradeCert: false,
    questions: [
      { key: 'vehicle', label: 'Vehicle needed', type: 'select', options: [
        { label: 'Motorbike / courier',  value: 'moto',   priceMin: 200, priceMax: 500  },
        { label: 'Bakkie (small load)',  value: 'bakkie', priceMin: 400, priceMax: 900  },
        { label: 'Van (medium load)',    value: 'van',    priceMin: 600, priceMax: 1400 },
        { label: 'Truck (large load)',   value: 'truck',  priceMin: 900, priceMax: 2500 },
      ]},
      { key: 'distance', label: 'Delivery distance', type: 'select', options: [
        { label: 'Within same town',  value: 'local',    priceMin: 0,   priceMax: 0    },
        { label: '30–100km',          value: 'regional', priceMin: 150, priceMax: 500  },
        { label: '100km+',            value: 'long',     priceMin: 400, priceMax: 1200 },
      ]},
    ],
  },
  {
    id: 'livestock_transport', label: 'Livestock Transport', emoji: '🐄', bg: '#DCFCE7', iconColor: '#15803D',
    priceLabel: 'From R800', requiresTradeCert: false,
    questions: [
      { key: 'animal', label: 'Animal type', type: 'select', options: [
        { label: 'Cattle',          value: 'cattle',  priceMin: 1500, priceMax: 5000 },
        { label: 'Sheep / goats',   value: 'sheep',   priceMin: 800,  priceMax: 3000 },
        { label: 'Pigs',            value: 'pigs',    priceMin: 800,  priceMax: 3000 },
        { label: 'Horses',          value: 'horses',  priceMin: 2000, priceMax: 8000 },
        { label: 'Poultry (crates)',value: 'poultry', priceMin: 500,  priceMax: 2000 },
        { label: 'Mixed / other',   value: 'other',   priceMin: 1000, priceMax: 4000 },
      ]},
      { key: 'distance', label: 'Transport distance', type: 'select', options: [
        { label: 'Local (under 50km)',   value: 'local',    priceMin: 0,    priceMax: 0    },
        { label: 'Regional (50–200km)',  value: 'regional', priceMin: 500,  priceMax: 1500 },
        { label: 'Long haul (200km+)',   value: 'long',     priceMin: 1200, priceMax: 3500 },
      ]},
    ],
  },

  // ─── Security ─────────────────────────────────────────────────────────────────
  {
    id: 'security_guard_hire', label: 'Security Guard', emoji: '💂', bg: '#F1F5F9', iconColor: '#1E293B',
    priceLabel: 'From R1,200/shift', requiresTradeCert: false,
    questions: [
      { key: 'type', label: 'Type of security', type: 'select', options: [
        { label: 'Event security (per guard)', value: 'event',   priceMin: 1200, priceMax: 2500 },
        { label: 'Site security (per shift)',  value: 'site',    priceMin: 1200, priceMax: 2500 },
        { label: 'Armed response callout',     value: 'armed',   priceMin: 1800, priceMax: 4000 },
        { label: 'Access control officer',     value: 'access',  priceMin: 1000, priceMax: 2000 },
        { label: 'Traffic marshal',            value: 'marshal', priceMin: 800,  priceMax: 1800 },
      ]},
      { key: 'guards', label: 'Number of guards', type: 'counter', unit: 'guards', min: 1, max: 20, default: 2 },
      { key: 'shifts', label: 'Number of shifts', type: 'counter', unit: 'shifts', min: 1, max: 14, default: 1 },
    ],
  },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function getService(id: string): ServiceConfig | undefined {
  return SERVICES.find(s => s.id === id)
}

export function calculateEstimate(serviceId: string, answers: Record<string, any>): { min: number; max: number } {
  const config = getService(serviceId)
  if (!config) return { min: 0, max: 0 }

  let min = 0, max = 0

  for (const q of config.questions) {
    const answer = answers[q.key]
    if (!answer) continue

    if (q.type === 'select') {
      const opt = q.options?.find(o => o.value === answer)
      if (opt) { min += opt.priceMin; max += opt.priceMax }
    }

    if (q.type === 'counter' && q.options === undefined) {
      // Multiply base rate by qty for counters (use parent select price / qty)
      // Handled by the select above
    }
  }

  // Add call-out fee
  min += 150; max += 150

  return { min: Math.max(min, 150), max: Math.max(max, 300) }
}
