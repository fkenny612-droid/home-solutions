import { useEffect, useState } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity, Switch,
  ActivityIndicator, Alert, ScrollView,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { colors } from '../../constants/theme'
import { useAuth } from '../../context/auth'
import { api } from '../../lib/api'

const SLOTS = [
  {
    key: 'monFri' as const,
    label: 'Monday – Friday',
    sub: 'Standard working days',
    icon: 'briefcase-outline' as const,
  },
  {
    key: 'saturday' as const,
    label: 'Saturday',
    sub: 'Weekend morning/afternoon jobs',
    icon: 'calendar-outline' as const,
  },
  {
    key: 'sunday' as const,
    label: 'Sunday',
    sub: 'Weekend jobs (premium rate)',
    icon: 'sunny-outline' as const,
  },
  {
    key: 'emergency' as const,
    label: 'Emergency callouts',
    sub: '24/7 urgent response',
    icon: 'flash-outline' as const,
    highlight: true,
  },
]

type Availability = { monFri: boolean; saturday: boolean; sunday: boolean; emergency: boolean }

export default function AvailabilityScreen() {
  const { user } = useAuth()
  const [avail,   setAvail]   = useState<Availability>({ monFri: true, saturday: false, sunday: false, emergency: false })
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState<string | null>(null)

  useEffect(() => {
    if (!user?.id) return
    api.providers.get(user.id)
      .then(p => setAvail({
        monFri:    p.availability.monFri,
        saturday:  p.availability.saturday,
        sunday:    p.availability.sunday,
        emergency: p.availability.emergency,
      }))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [user?.id])

  const toggle = async (key: keyof Availability) => {
    if (!user?.id) return
    const next = !avail[key]
    setSaving(key)
    try {
      await api.providers.updateAvailability(user.id, { [key]: next })
      setAvail(prev => ({ ...prev, [key]: next }))
    } catch {
      Alert.alert('Error', 'Could not update availability. Please try again.')
    } finally {
      setSaving(null)
    }
  }

  const activeCount = Object.values(avail).filter(Boolean).length

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.white} />
        </TouchableOpacity>
        <Text style={s.title}>Availability</Text>
      </View>

      {loading ? (
        <View style={s.center}><ActivityIndicator color={colors.gold} /></View>
      ) : (
        <ScrollView contentContainerStyle={s.body}>
          <View style={s.infoBox}>
            <Ionicons name="information-circle-outline" size={16} color={colors.gold} />
            <Text style={s.infoText}>
              Clients only see you as a match when your availability overlaps with their requested time.
              Changes take effect immediately.
            </Text>
          </View>

          <View style={s.statusRow}>
            <View style={[s.statusDot, activeCount > 0 ? s.statusDotOn : s.statusDotOff]} />
            <Text style={s.statusText}>
              {activeCount === 0
                ? 'You are currently unavailable for all slots'
                : `Available for ${activeCount} slot${activeCount > 1 ? 's' : ''}`}
            </Text>
          </View>

          <View style={s.card}>
            {SLOTS.map((slot, i) => {
              const isOn     = avail[slot.key]
              const isSaving = saving === slot.key
              return (
                <View key={slot.key} style={[s.row, i < SLOTS.length - 1 && s.rowBorder]}>
                  <View style={[s.iconWrap, slot.highlight && isOn && s.iconWrapEmergency]}>
                    <Ionicons
                      name={slot.icon}
                      size={20}
                      color={slot.highlight ? colors.red : isOn ? colors.gold : colors.gray400}
                    />
                  </View>
                  <View style={s.rowContent}>
                    <Text style={[s.rowLabel, slot.highlight && s.rowLabelEmergency]}>{slot.label}</Text>
                    <Text style={s.rowSub}>{slot.sub}</Text>
                  </View>
                  {isSaving ? (
                    <ActivityIndicator size="small" color={colors.gold} style={{ width: 51 }} />
                  ) : (
                    <Switch
                      value={isOn}
                      onValueChange={() => toggle(slot.key)}
                      trackColor={{ false: colors.gray200, true: slot.highlight ? colors.red + '80' : colors.gold + '80' }}
                      thumbColor={isOn ? (slot.highlight ? colors.red : colors.gold) : colors.gray400}
                    />
                  )}
                </View>
              )
            })}
          </View>

          <View style={s.noteBox}>
            <Text style={s.noteTitle}>Emergency callouts</Text>
            <Text style={s.noteText}>
              Enabling emergency callouts means you may receive urgent job requests at any hour.
              These are billed at a premium rate and clients expect a response within 30 minutes.
            </Text>
          </View>

          <View style={{ height: 32 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe:               { flex: 1, backgroundColor: colors.gray50 },
  header:             { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.black, paddingHorizontal: 16, paddingVertical: 14 },
  backBtn:            { padding: 2 },
  title:              { fontSize: 18, fontWeight: '700', color: colors.white },
  center:             { flex: 1, justifyContent: 'center', alignItems: 'center' },
  body:               { padding: 16, gap: 14 },

  infoBox:            { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: colors.gold + '15', borderRadius: 12, padding: 14 },
  infoText:           { flex: 1, fontSize: 12, color: colors.gray600, lineHeight: 18 },

  statusRow:          { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusDot:          { width: 8, height: 8, borderRadius: 4 },
  statusDotOn:        { backgroundColor: colors.green },
  statusDotOff:       { backgroundColor: colors.gray400 },
  statusText:         { fontSize: 13, color: colors.gray600 },

  card:               { backgroundColor: colors.white, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: colors.gray100 },
  row:                { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 16, gap: 14 },
  rowBorder:          { borderBottomWidth: 1, borderBottomColor: colors.gray100 },
  iconWrap:           { width: 38, height: 38, borderRadius: 10, backgroundColor: colors.gray50, alignItems: 'center', justifyContent: 'center' },
  iconWrapEmergency:  { backgroundColor: '#FFF0F0' },
  rowContent:         { flex: 1 },
  rowLabel:           { fontSize: 14, fontWeight: '600', color: colors.black },
  rowLabelEmergency:  { color: colors.red },
  rowSub:             { fontSize: 12, color: colors.gray400, marginTop: 2 },

  noteBox:            { backgroundColor: '#FFF8EC', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: colors.gold + '40' },
  noteTitle:          { fontSize: 12, fontWeight: '700', color: colors.gold, marginBottom: 6 },
  noteText:           { fontSize: 12, color: colors.gray600, lineHeight: 18 },
})
