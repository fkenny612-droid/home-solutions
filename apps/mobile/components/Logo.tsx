import { View, Text, StyleSheet, Image } from 'react-native'
import { colors, fonts } from '../constants/theme'

// Safely try to load the logo image — falls back to text wordmark if not yet added
let logoImg: ReturnType<typeof require> | null = null
try { logoImg = require('../assets/logo.png') } catch {}

// ─── Image logo (uses logo.png when available) ────────────────────────────────

interface LogoImageProps {
  /** Height of the rendered logo image */
  height?: number
  /** Tint — 'white' renders the logo in white (for dark headers) */
  tint?: 'default' | 'white'
}

export function LogoImage({ height = 28, tint = 'default' }: LogoImageProps) {
  // On dark backgrounds always use the text wordmark — the PNG has a white
  // background and can't be tinted transparently without a PNG with alpha.
  if (tint === 'white') {
    return (
      <Text style={[s.wordmarkFallback, { fontSize: height * 0.9, color: colors.white }]}>
        Easyfix
      </Text>
    )
  }

  // On light backgrounds show the actual logo image
  const width = height * 4.6
  if (logoImg) {
    return (
      <Image
        source={logoImg}
        style={{ width, height, resizeMode: 'contain' }}
      />
    )
  }

  return (
    <Text style={[s.wordmarkFallback, { fontSize: height * 0.85, color: colors.brand }]}>
      Easyfix
    </Text>
  )
}

// ─── Legacy mark + wordmark lockup (kept for backward-compat) ─────────────────

interface LogoMarkProps {
  size?: number
  variant?: 'dark' | 'gold' | 'mono' | 'brand'
}

export function LogoMark({ size = 40, variant = 'dark' }: LogoMarkProps) {
  const markColor = variant === 'gold' ? colors.black : variant === 'brand' ? colors.white : colors.gold
  const tileColor =
    variant === 'gold'  ? colors.gold  :
    variant === 'brand' ? colors.brand :
    variant === 'mono'  ? 'transparent' :
    colors.black

  const roofHalf  = size * 0.27
  const roofHeight = size * 0.24
  const legWidth  = size * 0.085
  const legHeight = size * 0.26
  const legGap    = size * 0.16
  const barWidth  = legGap + legWidth * 2
  const barHeight = legWidth

  return (
    <View style={[s.tile, { width: size, height: size, borderRadius: size * 0.26, backgroundColor: tileColor }]}>
      <View style={{ alignItems: 'center' }}>
        <View style={{
          width: 0, height: 0,
          borderLeftWidth: roofHalf, borderRightWidth: roofHalf, borderBottomWidth: roofHeight,
          borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: markColor,
          marginBottom: -barHeight * 0.4,
        }} />
        <View style={{ width: barWidth, height: legHeight, position: 'relative' }}>
          <View style={{ position: 'absolute', left: 0, top: 0, width: legWidth, height: legHeight, backgroundColor: markColor, borderRadius: 1 }} />
          <View style={{ position: 'absolute', right: 0, top: 0, width: legWidth, height: legHeight, backgroundColor: markColor, borderRadius: 1 }} />
          <View style={{ position: 'absolute', left: 0, top: (legHeight - barHeight) / 2, width: barWidth, height: barHeight, backgroundColor: markColor, borderRadius: 1 }} />
        </View>
      </View>
    </View>
  )
}

interface LogoProps {
  size?: number
  variant?: 'dark' | 'gold' | 'mono' | 'brand'
  textColor?: string
  showTagline?: boolean
}

export function Logo({ size = 40, variant = 'dark', textColor, showTagline = false }: LogoProps) {
  const resolvedTextColor = textColor ?? (variant === 'dark' || variant === 'brand' ? colors.white : colors.black)
  return (
    <View style={s.row}>
      <LogoMark size={size} variant={variant} />
      <View style={{ marginLeft: size * 0.28 }}>
        <Text style={[s.wordmark, { color: resolvedTextColor, fontSize: size * 0.42 }]}>Easyfix</Text>
        {showTagline && (
          <Text style={[s.tagline, { color: resolvedTextColor === colors.white ? colors.gray400 : colors.gray600 }]}>
            Durban · KwaZulu-Natal
          </Text>
        )}
      </View>
    </View>
  )
}

const s = StyleSheet.create({
  tile:             { alignItems: 'center', justifyContent: 'center' },
  row:              { flexDirection: 'row', alignItems: 'center' },
  wordmark:         { fontFamily: fonts.serif, letterSpacing: -0.3 },
  wordmarkFallback: { fontWeight: '800', fontStyle: 'italic', letterSpacing: -0.5 },
  tagline:          { fontSize: 10, letterSpacing: 0.4, marginTop: 1 },
})
