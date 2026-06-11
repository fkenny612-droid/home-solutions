import { useEffect, useRef } from 'react'
import { Animated, StyleSheet, View, Text, Easing } from 'react-native'
import { colors } from '../constants/theme'

interface Props {
  onDone: () => void
}

export default function SplashScreen({ onDone }: Props) {
  // Logo mark scale + opacity
  const logoScale   = useRef(new Animated.Value(0.6)).current
  const logoOpacity = useRef(new Animated.Value(0)).current

  // Brand name slide up + fade
  const nameY       = useRef(new Animated.Value(18)).current
  const nameOpacity = useRef(new Animated.Value(0)).current

  // Tagline fade
  const tagOpacity  = useRef(new Animated.Value(0)).current

  // Gold bar width
  const barWidth    = useRef(new Animated.Value(0)).current

  // Whole screen fade-out at the end
  const screenOpacity = useRef(new Animated.Value(1)).current

  useEffect(() => {
    Animated.sequence([
      // 1. Logo mark pops in
      Animated.parallel([
        Animated.spring(logoScale, {
          toValue: 1,
          tension: 60,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]),
      // 2. Brand name slides up
      Animated.parallel([
        Animated.timing(nameY, {
          toValue: 0,
          duration: 350,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(nameOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]),
      // 3. Gold bar expands
      Animated.timing(barWidth, {
        toValue: 48,
        duration: 400,
        easing: Easing.out(Easing.quad),
        useNativeDriver: false, // width can't use native driver
      }),
      // 4. Tagline fades in
      Animated.timing(tagOpacity, {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
      }),
      // 5. Hold
      Animated.delay(500),
      // 6. Fade whole screen out
      Animated.timing(screenOpacity, {
        toValue: 0,
        duration: 400,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start(() => onDone())
  }, [])

  return (
    <Animated.View style={[s.container, { opacity: screenOpacity }]}>
      {/* Logo mark */}
      <Animated.View style={[s.logoMark, { transform: [{ scale: logoScale }], opacity: logoOpacity }]}>
        <Text style={s.logoMarkText}>EF</Text>
      </Animated.View>

      {/* Brand name */}
      <Animated.Text style={[s.brandName, { transform: [{ translateY: nameY }], opacity: nameOpacity }]}>
        Easy-Fix
      </Animated.Text>

      {/* Gold bar */}
      <Animated.View style={[s.goldBar, { width: barWidth }]} />

      {/* Tagline */}
      <Animated.Text style={[s.tagline, { opacity: tagOpacity }]}>
        Home services, on demand
      </Animated.Text>

      {/* Sub */}
      <Animated.Text style={[s.sub, { opacity: tagOpacity }]}>
        Nationwide · South Africa
      </Animated.Text>
    </Animated.View>
  )
}

const s = StyleSheet.create({
  container:    {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.black,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
  },
  logoMark:     {
    width: 80,
    height: 80,
    borderRadius: 22,
    backgroundColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  logoMarkText: { fontSize: 28, fontWeight: '800', color: colors.black, letterSpacing: 1 },
  brandName:    { fontSize: 40, fontWeight: '800', color: colors.white, letterSpacing: -1, marginBottom: 12 },
  goldBar:      { height: 3, backgroundColor: colors.gold, borderRadius: 2, marginBottom: 16 },
  tagline:      { fontSize: 15, color: 'rgba(255,255,255,0.6)', fontWeight: '500', letterSpacing: 0.2 },
  sub:          { fontSize: 11, color: colors.gray400, marginTop: 8, letterSpacing: 1, textTransform: 'uppercase' },
})
