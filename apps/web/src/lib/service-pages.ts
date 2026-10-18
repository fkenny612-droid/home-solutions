/**
 * Copy for the /services/[slug] pages. Prices are NOT written here — they come from services.generated.ts
 * (the same catalogue the app quotes from), so a page can't advertise a price the app doesn't charge.
 */
export interface ServiceFaq { q: string; a: string }

export interface ServicePage {
  slug: string
  nav: string                // footer / related-link label
  catalogueId: string        // key into CATALOGUE
  emoji: string
  bg: string
  title: string              // <title> without the " | Easyfix" suffix
  h1: string
  summary: string            // meta description lead (price line is appended)
  intro: string[]
  signs: string[]            // "when to book" bullets
  tip: { heading: string; body: string[] }
  faqs: ServiceFaq[]
}

export const SERVICE_PAGES: ServicePage[] = [
  {
    slug: 'plumbers-durban', nav: 'Plumbers', catalogueId: 'plumbing', emoji: '💧', bg: '#DBEAFE',
    title: 'Plumbers in Durban – Geysers, Leaks, Drains',
    h1: 'Book a plumber in Durban',
    summary: 'Blocked drains, burst pipes, leaks and geyser repairs in Durban.',
    intro: [
      'A burst pipe or a geyser that has stopped heating does not wait for a convenient time. With Easyfix you choose the job, see the price, and send a request to a plumber in Durban without phoning around for quotes.',
      'Your card is only held while you wait. You are charged when the plumber marks the job done, and the hold is released if nobody accepts or the plumber declines.',
    ],
    signs: [
      'Water running down a wall, ceiling or driveway that was dry yesterday',
      'A blocked drain, slow basin or toilet that keeps overflowing',
      'No hot water, or a geyser dripping from the overflow pipe',
      'A tap or toilet that will not stop running and is pushing up your water bill',
    ],
    tip: {
      heading: 'Stop the damage while you wait',
      body: [
        'If a pipe has burst, close the main water valve (usually at the meter or where the supply enters your property) and open a tap to drain the line. Switch off the geyser at the DB board if it is leaking, so the element does not run dry.',
      ],
    },
    faqs: [
      { q: 'How much does a plumber cost in Durban?', a: 'It depends on the job. Easyfix shows a price range for each type of plumbing job, then the exact quote before you pay. Blocked drains are at the low end; geyser replacements are at the high end.' },
      { q: 'Can I get a plumber in an emergency?', a: 'Yes. Easyfix has an emergency request option with a flat R850 callout. If nobody accepts within 15 minutes the request is cancelled automatically and the hold on your card is released, so you can try another option quickly.' },
      { q: 'When do I pay?', a: 'The amount is held on your card when you request the plumber and charged when the plumber marks the job complete.' },
    ],
  },
  {
    slug: 'electricians-durban', nav: 'Electricians', catalogueId: 'electrical', emoji: '⚡', bg: '#FEF3C7',
    title: 'Electricians in Durban – Faults, DB Boards, Plugs',
    h1: 'Book an electrician in Durban',
    summary: 'Tripping DB boards, fault finding, new plug points, lighting and certificates of compliance in Durban.',
    intro: [
      'Power problems are stressful, and electrical work is not a job for guesswork. Easyfix lets you describe what you need, see the price range and a quote up front, and send a request to an electrician in Durban.',
      'You are charged only when the electrician marks the work complete. Until then the amount is just held on your card.',
    ],
    signs: [
      'The main switch or a circuit keeps tripping',
      'Burning smell, warm plug sockets or flickering lights',
      'You need extra plug points or new lighting installed',
      'You are selling or transferring a property and need a certificate of compliance',
    ],
    tip: {
      heading: 'Electrical work is regulated',
      body: [
        'In South Africa, fixed electrical installation work should be done by a registered person, and a certificate of compliance is normally required when a property changes hands. Whoever you hire, ask about their registration before work starts.',
      ],
    },
    faqs: [
      { q: 'Can an electrician issue a certificate of compliance?', a: 'You can request a certificate of compliance as a job type on Easyfix and see the price range for it before you book. Confirm the electrician\'s registration with them directly.' },
      { q: 'How is the price worked out?', a: 'You answer a few questions about the job, such as the type of work and how many points or fittings. The app shows a price range, then the quote you pay.' },
      { q: 'What if no electrician accepts my request?', a: 'Standard requests are cancelled if no provider accepts within 2 hours, and the hold on your card is released.' },
    ],
  },
  {
    slug: 'cleaning-services-durban', nav: 'Cleaning', catalogueId: 'cleaning', emoji: '🧹', bg: '#D1FAE5',
    title: 'Cleaning Services in Durban – Home & Office',
    h1: 'Book a cleaner in Durban',
    summary: 'Regular, deep, move-out and office cleaning in Durban.',
    intro: [
      'Whether it is a regular tidy, a deep clean before guests arrive, or a move-out clean to get your deposit back, Easyfix lets you set the size of the job and see the price before you book.',
      'Tell us the type of clean, the number of bedrooms and bathrooms, and any extras like ovens or windows. Your card is held, and charged once the cleaner marks the job done.',
    ],
    signs: [
      'Moving in or out and the place needs to be spotless',
      'Regular weekly or fortnightly home cleaning',
      'A deep clean after renovations or building work',
      'Office or small business cleaning',
    ],
    tip: {
      heading: 'Get the most from a clean',
      body: [
        'Clear surfaces and put away valuables before the cleaner arrives, and mention anything specific (pets, delicate surfaces, areas that need extra attention) in your request so the right person accepts it.',
      ],
    },
    faqs: [
      { q: 'How is the price calculated?', a: 'By the type of clean, the number of bedrooms and bathrooms, and any extras you select. You see the price range, then the quote.' },
      { q: 'Do I need to be home?', a: 'That is between you and the provider. Once a provider accepts your request you can chat with them in the app and agree on access.' },
      { q: 'Can I cancel?', a: 'You can cancel until the work has started and the held amount on your card is released in full.' },
    ],
  },
  {
    slug: 'handyman-durban', nav: 'Handyman', catalogueId: 'handyman', emoji: '🔧', bg: '#FEF3C7',
    title: 'Handyman in Durban – Repairs & Odd Jobs',
    h1: 'Book a handyman in Durban',
    summary: 'Odd jobs, repairs and small installations around the home in Durban.',
    intro: [
      'Shelves to hang, doors that stick, a curtain rail to fit, the list of small jobs never ends. Easyfix connects you with a handyman in Durban for the jobs too small for a big contractor.',
      'Pick the job, see the price, and send the request. You are charged when the job is marked complete.',
    ],
    signs: [
      'Mounting TVs, shelves, mirrors or curtain rails',
      'Doors, hinges, locks and handles that need fixing',
      'Flat-pack assembly',
      'A list of small repairs you want done in one visit',
    ],
    tip: {
      heading: 'Bundle small jobs',
      body: ['If you have several small repairs, describe them all in one request so the handyman can plan the visit and you pay once.'],
    },
    faqs: [
      { q: 'What jobs can a handyman do?', a: 'Small repairs, installations and odd jobs around the home. For regulated work such as electrical or gas, book that trade directly.' },
      { q: 'How do I know the price?', a: 'The app shows a price range for the job type and a quote before you pay.' },
      { q: 'What if I am not happy?', a: 'You can chat with the provider in the app, contact us at hello@easyfix.co.za, and leave a review once the job is done.' },
    ],
  },
  {
    slug: 'pest-control-durban', nav: 'Pest control', catalogueId: 'pest_control', emoji: '🐜', bg: '#FEF9C3',
    title: 'Pest Control in Durban – Ants, Roaches, Rodents',
    h1: 'Book pest control in Durban',
    summary: 'Pest control for homes and businesses in Durban.',
    intro: [
      'Durban\'s warm, humid climate suits cockroaches, ants, termites and rodents just as well as it suits us. Easyfix lets you book pest control, see the price first, and hold the payment until the treatment is done.',
    ],
    signs: [
      'Cockroaches or ants in the kitchen and bathrooms',
      'Droppings, gnaw marks or noises in the roof',
      'Flying termites or damage to wood',
      'Fleas, bed bugs or other infestations indoors',
    ],
    tip: {
      heading: 'Before the treatment',
      body: ['Ask the provider how long to stay out of treated rooms and how to prepare food, pets and children. Tell them about pets, babies or anyone with allergies in your request.'],
    },
    faqs: [
      { q: 'How much does pest control cost?', a: 'The app shows a price range for the treatment type and a quote before you pay.' },
      { q: 'Is it safe with pets and children?', a: 'Mention them in your request and ask the provider about the products they use and how long to stay out of treated areas.' },
      { q: 'Which pests can I book treatment for?', a: 'Cockroaches, rats and mice, termites, bed bugs, ants, bees and wasps, and general fumigation.' },
    ],
  },
  {
    slug: 'locksmith-durban', nav: 'Locksmith', catalogueId: 'locksmith', emoji: '🔑', bg: '#F3F4F6',
    title: 'Locksmith in Durban – Lockouts & Lock Changes',
    h1: 'Book a locksmith in Durban',
    summary: 'Lockouts, lock changes and repairs in Durban.',
    intro: [
      'Locked out, lost your keys, or need locks changed after a break-in or a tenant moving out? Book a locksmith through Easyfix, see the price first, and keep your payment held until the job is done.',
    ],
    signs: [
      'You are locked out of your home, garage or car port',
      'Lost or stolen keys and you want the locks changed',
      'A lock that is stiff, jammed or broken',
      'New tenants or a new home and you want fresh locks',
    ],
    tip: {
      heading: 'Check who you are letting in',
      body: ['Your phone number is only shared with a provider after they accept your request. Confirm the job details with them in the app chat before they arrive.'],
    },
    faqs: [
      { q: 'Can I book a locksmith urgently?', a: 'Easyfix has an emergency request option. If nobody accepts within 15 minutes the request is cancelled and the hold on your card is released.' },
      { q: 'When am I charged?', a: 'When the locksmith marks the job complete.' },
      { q: 'Is my number shared?', a: 'Only with the provider who accepts your request.' },
    ],
  },
  {
    slug: 'aircon-installation-repair-durban', nav: 'Aircon & HVAC', catalogueId: 'hvac', emoji: '❄️', bg: '#EDE9FE',
    title: 'Aircon Installation & Repair in Durban',
    h1: 'Book aircon installation or repair in Durban',
    summary: 'Aircon installation, repairs, servicing and gas recharge in Durban.',
    intro: [
      'Durban summers are long and humid, and an aircon that is not working is more than an inconvenience. Book installation, repair, servicing or a gas recharge through Easyfix and see the price before you commit.',
    ],
    signs: [
      'The unit is running but not cooling',
      'Water leaking from the indoor unit',
      'Strange noises or smells when it starts',
      'You want a new split unit installed or existing units serviced',
    ],
    tip: {
      heading: 'Service before summer',
      body: ['Aircons work harder and fail more often in peak heat. A service before the hot months is usually cheaper than an emergency repair in the middle of them.'],
    },
    faqs: [
      { q: 'What does installation cost?', a: 'The app shows a price range for installation and the number of units you select, then the quote you pay.' },
      { q: 'Can I book more than one unit?', a: 'Yes, tell the app how many units you have.' },
      { q: 'When do I pay?', a: 'The amount is held on your card and charged when the job is marked complete.' },
    ],
  },
  {
    slug: 'pool-services-durban', nav: 'Pool services', catalogueId: 'pool', emoji: '🏊', bg: '#CFFAFE',
    title: 'Pool Cleaning & Repairs in Durban',
    h1: 'Book pool cleaning or repairs in Durban',
    summary: 'Pool cleaning, maintenance and repairs in Durban.',
    intro: [
      'A green pool or a pump that has given up is a quick way to ruin a summer weekend. Book pool cleaning and maintenance in Durban through Easyfix, with the price shown first and payment held until the work is done.',
    ],
    signs: [
      'Green or cloudy water',
      'A pump or filter that is not circulating properly',
      'A pool that has been neglected over winter',
      'Regular maintenance you would rather not do yourself',
    ],
    tip: {
      heading: 'Describe the pool',
      body: ['Mention the pool size and its current condition in your request so the provider arrives with the right equipment and chemicals.'],
    },
    faqs: [
      { q: 'How much does pool cleaning cost?', a: 'The app shows a price range for the type of job and a quote before you pay.' },
      { q: 'Can I book regular maintenance?', a: 'Monthly maintenance is one of the job types you can choose, alongside cleaning, chemical balancing, pump and filter repairs, plastering and leak detection.' },
      { q: 'When am I charged?', a: 'When the provider marks the job complete.' },
    ],
  },
]

export function getServicePage(slug: string): ServicePage | undefined {
  return SERVICE_PAGES.find(s => s.slug === slug)
}
