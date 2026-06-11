import { useEffect, useState } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ActivityIndicator, Alert, ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { colors } from '../../constants/theme'
import { useAuth } from '../../context/auth'
import { api } from '../../lib/api'

const DURBAN_AREAS = [
  'Umhlanga', 'Ballito', 'La Lucia', 'Durban North', 'Musgrave', 'Berea',
  'Morningside', 'Glenwood', 'Bluff', 'Chatsworth', 'Pinetown', 'Westville',
  'Hillcrest', 'Kloof', 'Gillitts', 'Waterfall', 'Amanzimtoti', 'Umlazi',
  'KwaMashu', 'Phoenix', 'Tongaat', 'Stanger', 'Verulam', 'Inanda',
  'Overport', 'Sydenham', 'Springfield', 'Durban CBD', 'Point', 'Brickfield',
]

export default function ServiceAreaScreen() {
  const { user } = useAuth()
  const [selected, setSelected] = useState<string[]>([])
  const [custom,   setCustom]   = useState('')
  const [loading,  setLoading]  = useState(true)
  const [saving,   setSaving]   = useState(false)

  useEffect(() => {
    if (!user?.id) return
    api.providers.get(user.id)
      .then(p => setSelected(p.serviceAreas ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [user?.id])

  const toggle = (area: string) => {
    setSelected(prev =>
      prev.includes(area) ? prev.filter(a => a !== area) : [...prev, area]
    )
  }

  const addCustom = () => {
    const val = custom.trim()
    if (!val) return
    if (selected.includes(val)) { setCustom(''); return }
    setSelected(prev => [...prev, val])
    setCustom('')
  }

  const remove = (area: string) => setSelected(prev => prev.filter(a => a !== area))

  const handleSave = async () => {
    if (!user?.id) return
    if (selected.length === 0) {
      Alert.alert('No areas selected', 'Please select at least one service area.')
      return
    }
    setSaving(true)
    try {
      await api.providers.updateServiceAreas(user.id, selected)
      Alert.alert('Saved', 'Your service area has been updated.', [{ text: 'OK', onPress: () => router.back() }])
    } catch {
      Alert.alert('Error', 'Could not save service areas. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.white} />
        </TouchableOpacity>
        <Text style={s.title}>Service Area</Text>
        {selected.length > 0 && (
          <View style={s.countBadge}>
            <Text style={s.countText}>{selected.length}</Text>
          </View>
        )}
      </View>

      {loading ? (
        <View style={s.center}><ActivityIndicator color={colors.gold} /></View>
      ) : (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={s.body} keyboardShouldPersistTaps="handled">

            <View style={s.infoBox}>
              <Ionicons name="location-outline" size={16} color={colors.gold} />
              <Text style={s.infoText}>
                Select the suburbs and areas you cover. Clients will only see you as a match if their location is in your service area.
              </Text>
            </View>

            {/* Selected chips */}
            {selected.length > 0 && (
              <View style={s.section}>
                <Text style={s.sectionLabel}>YOUR AREAS ({selected.length})</Text>
                <View style={s.chipRow}>
                  {selected.map(area => (
                    <TouchableOpacity key={area} style={s.chipSelected} onPress={() => remove(area)}>
                      <Text style={s.chipSelectedText}>{area}</Text>
                      <Ionicons name="close" size={12} color={colors.black} />
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Custom area input */}
            <View style={s.section}>
              <Text style={s.sectionLabel}>ADD CUSTOM AREA</Text>
              <View style={s.inputRow}>
                <TextInput
                  style={s.input}
                  value={custom}
                  onChangeText={setCustom}
                  placeholder="e.g. Ashwood, Malvern, Sea View…"
                  placeholderTextColor={colors.gray400}
                  onSubmitEditing={addCustom}
                  returnKeyType="done"
                />
                <TouchableOpacity style={s.addBtn} onPress={addCustom}>
                  <Ionicons name="add" size={20} color={colors.white} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Quick-pick grid */}
            <View style={s.section}>
              <Text style={s.sectionLabel}>DURBAN & SURROUNDS</Text>
              <View style={s.chipRow}>
                {DURBAN_AREAS.map(area => {
                  const on = selected.includes(area)
                  return (
                    <TouchableOpacity
                      key={area}
                      style={[s.chip, on && s.chipOn]}
                      onPress={() => toggle(area)}
                    >
                      <Text style={[s.chipText, on && s.chipTextOn]}>{area}</Text>
                    </TouchableOpacity>
                  )
                })}
              </View>
            </View>

            <TouchableOpacity
              style={[s.saveBtn, saving && { opacity: 0.6 }]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving
                ? <ActivityIndicator color={colors.black} />
                : <Text style={s.saveBtnText}>Save service area</Text>}
            </TouchableOpacity>

            <View style={{ height: 32 }} />
          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe:            { flex: 1, backgroundColor: colors.gray50 },
  header:          { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.black, paddingHorizontal: 16, paddingVertical: 14 },
  backBtn:         { padding: 2 },
  title:           { flex: 1, fontSize: 18, fontWeight: '700', color: colors.white },
  countBadge:      { backgroundColor: colors.gold, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  countText:       { fontSize: 12, fontWeight: '700', color: colors.black },
  center:          { flex: 1, justifyContent: 'center', alignItems: 'center' },
  body:            { padding: 16, gap: 16 },

  infoBox:         { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: colors.gold + '15', borderRadius: 12, padding: 14 },
  infoText:        { flex: 1, fontSize: 12, color: colors.gray600, lineHeight: 18 },

  section:         { gap: 10 },
  sectionLabel:    { fontSize: 11, fontWeight: '700', color: colors.gray400, letterSpacing: 0.8 },

  chipRow:         { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip:            { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.gray100 },
  chipOn:          { backgroundColor: colors.black, borderColor: colors.black },
  chipText:        { fontSize: 13, color: colors.gray600, fontWeight: '500' },
  chipTextOn:      { color: colors.white, fontWeight: '600' },
  chipSelected:    { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 20, backgroundColor: colors.gold },
  chipSelectedText:{ fontSize: 13, fontWeight: '600', color: colors.black },

  inputRow:        { flexDirection: 'row', gap: 10 },
  input:           { flex: 1, backgroundColor: colors.white, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: colors.black, borderWidth: 1, borderColor: colors.gray100 },
  addBtn:          { width: 46, backgroundColor: colors.black, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },

  saveBtn:         { backgroundColor: colors.gold, borderRadius: 12, padding: 16, alignItems: 'center' },
  saveBtnText:     { fontSize: 15, fontWeight: '700', color: colors.black },
})
