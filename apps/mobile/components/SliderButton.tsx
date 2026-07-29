import { useRef, useState } from 'react'
import {
  View, Text, StyleSheet, TouchableWithoutFeedback,
  Animated, Dimensions, Vibration,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'

const HOLD_MS    = 900   // how long to hold before confirm
const THUMB_SIZE = 56
const PAD        = 4

interface Props {
  label:       string
  sublabel?:   string
  onConfirm:   () => void
  trackColor?: string
  thumbColor?: string
}

export default function SliderButton({
  label,
  sublabel,
  onConfirm,
  trackColor = '#1A0000',
  thumbColor = '#C0392B',
}: Props) {
  const trackWidth = Dimensions.get('window').width - 32

  const progress   = useRef(new Animated.Value(0)).current
  const thumbScale = useRef(new Animated.Value(1)).current
  const anim       = useRef<Animated.CompositeAnimation | null>(null)
  const [confirmed, setConfirmed] = useState(false)
  const [pressing,  setPressing]  = useState(false)

  // Fill width: 0 → full track width
  const fillWidth = progress.interpolate({
    inputRange:  [0, 1],
    outputRange: [THUMB_SIZE + PAD * 2, trackWidth],
    extrapolate: 'clamp',
  })

  // Thumb moves with fill
  const thumbX = progress.interpolate({
    inputRange:  [0, 1],
    outputRange: [0, trackWidth - THUMB_SIZE - PAD * 2],
    extrapolate: 'clamp',
  })

  // Label fades as fill advances
  const labelOpacity = progress.interpolate({
    inputRange:  [0, 0.35],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  })

  // Pulse animation on the icon while pressing
  const startPulse = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(thumbScale, { toValue: 1.12, duration: 300, useNativeDriver: false }),
        Animated.timing(thumbScale, { toValue: 1,    duration: 300, useNativeDriver: false }),
      ])
    ).start()
  }

  const stopPulse = () => {
    thumbScale.stopAnimation()
    Animated.spring(thumbScale, { toValue: 1, useNativeDriver: false }).start()
  }

  const onPressIn = () => {
    if (confirmed) return
    setPressing(true)
    startPulse()
    Vibration.vibrate(10)

    anim.current = Animated.timing(progress, {
      toValue:  1,
      duration: HOLD_MS,
      useNativeDriver: false,
    })

    anim.current.start(({ finished }) => {
      if (finished) {
        setConfirmed(true)
        stopPulse()
        Vibration.vibrate([0, 60, 40, 80])
        setTimeout(onConfirm, 300)
      }
    })
  }

  const onPressOut = () => {
    if (confirmed) return
    setPressing(false)
    stopPulse()
    anim.current?.stop()
    Animated.spring(progress, {
      toValue:  0,
      tension:  80,
      friction: 8,
      useNativeDriver: false,
    }).start()
  }

  return (
    <TouchableWithoutFeedback onPressIn={onPressIn} onPressOut={onPressOut}>
      <View style={[s.track, { backgroundColor: trackColor }]}>

        {/* Animated fill */}
        <Animated.View
          style={[s.fill, { width: fillWidth, backgroundColor: thumbColor }]}
        />

        {/* Label centred in track */}
        <Animated.View style={[s.labelWrap, { opacity: labelOpacity }]}>
          <Text style={s.label}>{label}</Text>
          {sublabel && <Text style={s.sublabel}>{sublabel}</Text>}
        </Animated.View>

        {/* Thumb slides along */}
        <Animated.View
          style={[
            s.thumb,
            {
              backgroundColor: confirmed ? '#27AE60' : thumbColor,
              transform: [{ translateX: thumbX }, { scale: thumbScale }],
            },
          ]}
        >
          {confirmed ? (
            <Ionicons name="checkmark" size={24} color="#fff" />
          ) : (
            <Ionicons
              name={pressing ? 'flash' : 'chevron-forward'}
              size={24}
              color="#fff"
            />
          )}
        </Animated.View>

        {/* Hold hint — fades in when not pressing */}
        {!confirmed && !pressing && (
          <View style={s.hintWrap}>
            <Text style={s.hint}>hold</Text>
          </View>
        )}
      </View>
    </TouchableWithoutFeedback>
  )
}

const TRACK_H = THUMB_SIZE + PAD * 2

const s = StyleSheet.create({
  track: {
    height:         TRACK_H,
    borderRadius:   TRACK_H / 2,
    overflow:       'hidden',
    justifyContent: 'center',
    position:       'relative',
  },
  fill: {
    position:     'absolute',
    left:         0,
    top:          0,
    bottom:       0,
    borderRadius: TRACK_H / 2,
    opacity:      0.9,
  },
  labelWrap: {
    position:       'absolute',
    left:           THUMB_SIZE + 20,
    right:          16,
    alignItems:     'center',
    justifyContent: 'center',
  },
  label: {
    fontSize:      13,
    fontWeight:    '700',
    color:         'rgba(255,255,255,0.85)',
    letterSpacing: 0.5,
  },
  sublabel: {
    fontSize:  10,
    color:     'rgba(255,255,255,0.5)',
    marginTop: 2,
  },
  thumb: {
    position:       'absolute',
    left:           PAD,
    width:          THUMB_SIZE,
    height:         THUMB_SIZE,
    borderRadius:   THUMB_SIZE / 2,
    alignItems:     'center',
    justifyContent: 'center',
    shadowColor:    '#000',
    shadowOffset:   { width: 0, height: 3 },
    shadowOpacity:  0.4,
    shadowRadius:   5,
    elevation:      6,
  },
  hintWrap: {
    position: 'absolute',
    right:    20,
  },
  hint: {
    fontSize:      10,
    color:         'rgba(255,255,255,0.3)',
    fontWeight:    '600',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
})
