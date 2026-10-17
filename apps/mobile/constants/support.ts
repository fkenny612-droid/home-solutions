/**
 * How customers and providers reach Easyfix. Every contact method here is shown in the app ONLY if it is set —
 * never put a placeholder number in: people really do call these in an emergency.
 *
 * Set these when they exist, then rebuild:
 *   phone     — e.g. '+27311234567'  (enables the "Call us" cards)
 *   whatsapp  — digits with country code, no plus, e.g. '27821234567' (enables the WhatsApp cards)
 *   hours     — e.g. 'Mon–Fri 07:00–20:00' (enables the support-hours note)
 */
export const SUPPORT = {
  email:    'hello@easyfix.co.za',   // the contact address in our published privacy policy and terms
  phone:    null as string | null,
  whatsapp: null as string | null,
  hours:    null as string | null,
}

export const supportEmailUrl  = (subject: string) => `mailto:${SUPPORT.email}?subject=${encodeURIComponent(subject)}`
export const supportPhoneUrl  = () => (SUPPORT.phone ? `tel:${SUPPORT.phone}` : null)
export const supportWhatsAppUrl = (message: string) => (SUPPORT.whatsapp ? `https://wa.me/${SUPPORT.whatsapp}?text=${encodeURIComponent(message)}` : null)
