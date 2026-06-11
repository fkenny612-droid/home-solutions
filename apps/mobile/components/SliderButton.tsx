import { useRef, useState } from 'react'
import {
  View, Text, StyleSheet, PanResponder, Animated,
  Dimensions, Vibration,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'

const TRACK_PADDING = 4
const THUMB_SIZE    = 48

interface Props {
  label:       string
  sublabel?:   string
  onConfirm:   () => void
  trackColor?: string
  thumbColor?: string
  labelColor?: string
}

export default function SliderButton({
  label,
  sublabel,
  onConfirm,
  trackColor = '#3A0000',
  thumbColor = '#C0392B',
  labelColor = 'rgba(255,255,255,0.7)',
}: Props) {
  const trackWidth  = Dimensions.get('window').width - 32 // 16px margin each side
  const maxSlide    = trackWidth - THUMB_SIZE - TRACK_PADDING * 2

  const translateX  = useRef(new Animated.Value(0)).current
  const [confirmed, setConfirmed] = useState(false)
  const [sliding,   setSliding]   = useState(false)

  const labelOpacity = translateX.interpolate({
    inputRange: [0, maxSlide * 0.4],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  })

  const fillWidth = translateX.interpolate({
    inputRange: [0, maxSlide],
    outputRange: [THUMB_SIZE + TRACK_PADDING * 2, trackWidth],
    extrapolate: 'clamp',
  })

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !confirmed,
      onMoveShouldSetPanResponder:  () => !confirmed,
      onPanResponderGrant: () => setSliding(true),
      onPanResponderMove: (_, g) => {
        const val = Math.max(0, Math.min(g.dx, maxSlide))
        translateX.setValue(val)
      },
      onPanResponderRelease: (_, g) => {
        setSliding(false)
        if (g.dx >= maxSlide * 0.85) {
          Animated.spring(translateX, { toValue: maxSlide, useNativeDriver: false }).start()
          setConfirmed(true)
          Vibration.vibrate(40)
          setTimeout(onConfirm, 200)
        } else {
          Animated.spring(translateX, { toValue: 0, useNativeDriver: false, tension: 80, friction: 8 }).start()
        }
      },
    })
  ).current

  return (
    <View style={[s.track, { backgroundColor: trackColor }]}>
      {/* Red fill that expands as thumb slides */}
      <Animated.View style={[s.fill, { width: fillWidth, backgroundColor: thumbColor + 'AA' }]} />

      {/* Label */}
      <Animated.View style={[s.labelWrap, { opacity: labelOpacity }]}>
        <Text style={[s.label, { color: labelColor }]}>{label}</Text>
        {sublabel && <Text style={[s.sublabel, { color: labelColor }]}>{sublabel}</Text>}
      </Animated.View>

      {/* Thumb */}
      <Animated.View
        style={[s.thumb, { backgroundColor: thumbColor, transform: [{ translateX }] }]}
        {...panResponder.panHandlers}
      >
        {confirmed
          ? <Ionicons name="checkmark" size={22} color="#fff" />
          : <Ionicons name={sliding ? 'chevron-forward-outline' : 'chevron-forward'} size={22} color="#fff" />
        }
      </Animated.View>
    </View>
  )
}

const s = StyleSheet.create({
  track: {
    height:       THUMB_SIZE + TRACK_PADDING * 2,
    borderRadius: (THUMB_SIZE + TRACK_PADDING * 2) / 2,
    overflow:     'hidden',
    justifyContent: 'center',
    position:     'relative',
  },
  fill: {
    position:     'absolute',
    left:         0,
    top:          0,
    bottom:       0,
    borderRadius: (THUMB_SIZE + TRACK_PADDING * 2) / 2,
  },
  labelWrap: {
    position:   'absolute',
    left:       THUMB_SIZE + 24,
    right:      16,
    alignItems: 'center',
  },
  label: {
    fontSize:   13,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  sublabel: {
    fontSize:  10,
    marginTop: 1,
    opacity:   0.7,
  },
  thumb: {
    position:       'absolute',
    left:           TRACK_PADDING,
    width:          THUMB_SIZE,
    height:         THUMB_SIZE,
    borderRadius:   THUMB_SIZE / 2,
    alignItems:     'center',
    justifyContent: 'center',
    shadowColor:    '#000',
    shadowOffset:   { width: 0, height: 2 },
    shadowOpacity:  0.3,
    shadowRadius:   4,
    elevation:      4,
  },
})
