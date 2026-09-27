/** Truck Loads logo: white truck on a green tile with a silver rim. */
export default function TruckLoadsMark({ size = 28, onDark = false }: { size?: number; onDark?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <rect x="0.5" y="0.5" width="31" height="31" rx="8" fill="#1A7340" stroke={onDark ? '#C9CED4' : '#A3AAB2'} />
      <path d="M6 11.5h11v8.5H6z" fill="#FFFFFF" />
      <path d="M17 14h4.6l3.4 3.4V20H17z" fill="#E3E6EA" />
      <circle cx="10" cy="21.5" r="2.2" fill="#FFFFFF" stroke="#1A7340" strokeWidth="1.2" />
      <circle cx="21" cy="21.5" r="2.2" fill="#FFFFFF" stroke="#1A7340" strokeWidth="1.2" />
    </svg>
  )
}
