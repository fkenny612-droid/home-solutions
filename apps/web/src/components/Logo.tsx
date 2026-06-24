interface LogoMarkProps {
  size?: number
  variant?: 'dark' | 'gold'
}

/** Brand mark: abstract roofline merged with an "H" — reads as "home" and "Home Solutions". */
export default function LogoMark({ size = 32, variant = 'dark' }: LogoMarkProps) {
  const markColor = variant === 'gold' ? '#0C0A09' : '#CA8A04'
  const tileColor = variant === 'gold' ? '#CA8A04' : '#0C0A09'

  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
      <rect width="32" height="32" rx="8" fill={tileColor} />
      <path d="M16 7L23 14H21V14H11V14H9L16 7Z" fill={markColor} />
      <rect x="10" y="14" width="3" height="9" rx="1" fill={markColor} />
      <rect x="19" y="14" width="3" height="9" rx="1" fill={markColor} />
      <rect x="10" y="17.5" width="12" height="3" rx="1" fill={markColor} />
    </svg>
  )
}
