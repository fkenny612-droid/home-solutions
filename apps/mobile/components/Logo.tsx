import { View, Text, StyleSheet } from 'react-native'
import { colors, fonts } from '../constants/theme'

interface LogoMarkProps {
  size?: number
  /** 'dark' = gold mark on black tile (default), 'gold' = black mark on gold tile, 'mono' = mark only, no tile */
  variant?: 'dark' | 'gold' | 'mono'
}

/**
 * Brand mark: an abstract roofline merged with an "H" — the roof apex doubles
 * as the crossbar's peak, evoking "home" for the Easy-Fix home services brand.
 */
export function LogoMark({ size = 40, variant = 'dark' }: LogoMarkProps) {
  const markColor = variant === 'gold' ? colors.black : colors.gold
  const tileColor = variant === 'gold' ? colors.gold : variant === 'dark' ? colors.black : 'transparent'

  const roofHalf = size * 0.27
  const roofHeight = size * 0.24
  const legWidth = size * 0.085
  const legHeight = size * 0.26
  const legGap = size * 0.16
  const barWidth = legGap + legWidth * 2
  const barHeight = legWidth

  return (
    <View style={[
      styles.tile,
      {
        width: size, height: size, borderRadius: size * 0.26,
        backgroundColor: tileColor,
      },
    ]}>
      <View style={{ alignItems: 'center' }}>
        {/* Roof */}
        <View style={{
          width: 0, height: 0,
          borderLeftWidth: roofHalf, borderRightWidth: roofHalf, borderBottomWidth: roofHeight,
          borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: markColor,
          marginBottom: -barHeight * 0.4,
        }} />
        {/* H legs + crossbar */}
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
  variant?: 'dark' | 'gold' | 'mono'
  /** Text color for the wordmark — defaults based on variant */
  textColor?: string
  showTagline?: boolean
}

/** Full lockup: mark + "Easy-Fix" wordmark, optional tagline. */
export function Logo({ size = 40, variant = 'dark', textColor, showTagline = false }: LogoProps) {
  const resolvedTextColor = textColor ?? (variant === 'dark' ? colors.white : colors.black)
  return (
    <View style={styles.row}>
      <LogoMark size={size} variant={variant} />
      <View style={{ marginLeft: size * 0.28 }}>
        <Text style={[styles.wordmark, { color: resolvedTextColor, fontSize: size * 0.42 }]}>Easy-Fix</Text>
        {showTagline && (
          <Text style={[styles.tagline, { color: resolvedTextColor === colors.white ? colors.gray400 : colors.gray600 }]}>
            Durban · KwaZulu-Natal
          </Text>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  tile:     { alignItems: 'center', justifyContent: 'center' },
  row:      { flexDirection: 'row', alignItems: 'center' },
  wordmark: { fontFamily: fonts.serif, letterSpacing: -0.3 },
  tagline:  { fontSize: 10, letterSpacing: 0.4, marginTop: 1 },
})
