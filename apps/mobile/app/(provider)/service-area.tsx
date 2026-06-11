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

// ── South Africa: provinces → cities → suburbs ──────────────────────────────
const SA: Record<string, Record<string, string[]>> = {
  'KwaZulu-Natal': {
    'Durban': [
      'Durban CBD', 'Berea', 'Musgrave', 'Morningside', 'Glenwood',
      'Bluff', 'Overport', 'Sydenham', 'Springfield', 'Point',
      'Umbilo', 'Clairwood', 'Wentworth',
    ],
    'Umhlanga / Ballito': [
      'Umhlanga', 'La Lucia', 'Durban North', 'Ballito', 'Tongaat',
      'Salt Rock', 'Sheffield Beach', 'Blythedale',
    ],
    'Pinetown / Westville': [
      'Pinetown', 'Westville', 'Hillcrest', 'Kloof', 'Gillitts',
      'Waterfall', 'New Germany', 'Cowies Hill',
    ],
    'South Durban': [
      'Amanzimtoti', 'Umlazi', 'Chatsworth', 'Isipingo', 'Prospecton',
      'Reunion', 'Warner Beach', 'Winklespruit',
    ],
    'North of Durban': [
      'Phoenix', 'KwaMashu', 'Inanda', 'Verulam', 'Stanger',
      'Tongaat', 'Duffs Road',
    ],
    'Pietermaritzburg': [
      'Pietermaritzburg CBD', 'Northdale', 'Edendale', 'Mkondeni',
      'Scottsville', 'Hayfields', 'Athlone',
    ],
    'Richards Bay': [
      'Richards Bay CBD', 'Meerensee', 'Empangeni', 'Esikhawini',
    ],
  },
  'Gauteng': {
    'Johannesburg': [
      'Sandton', 'Rosebank', 'Fourways', 'Randburg', 'Roodepoort',
      'Soweto', 'Alexandra', 'Midrand', 'Centurion',
      'Joburg CBD', 'Braamfontein', 'Parktown', 'Melville',
    ],
    'Pretoria': [
      'Pretoria CBD', 'Arcadia', 'Hatfield', 'Menlyn', 'Sunnyside',
      'Brooklyn', 'Lynnwood', 'Centurion', 'Atteridgeville',
    ],
    'East Rand': [
      'Boksburg', 'Benoni', 'Kempton Park', 'Edenvale', 'Germiston',
      'Springs', 'Brakpan',
    ],
    'West Rand': [
      'Krugersdorp', 'Randfontein', 'Westonaria', 'Carletonville',
    ],
  },
  'Western Cape': {
    'Cape Town': [
      'Cape Town CBD', 'Sea Point', 'Green Point', 'Camps Bay',
      'Clifton', 'Woodstock', 'Observatory', 'Mowbray', 'Rondebosch',
      'Claremont', 'Kenilworth', 'Wynberg', 'Plumstead',
    ],
    'Northern Suburbs': [
      'Bellville', 'Parow', 'Goodwood', 'Durbanville', 'Brackenfell',
      'Kraaifontein', 'Kuils River', 'Mitchells Plain',
    ],
    'Southern Suburbs': [
      'Constantia', 'Tokai', 'Retreat', 'Steenberg', 'Muizenberg',
      'Kalk Bay', 'Fish Hoek', 'Simon\'s Town',
    ],
    'Stellenbosch / Paarl': [
      'Stellenbosch', 'Paarl', 'Franschhoek', 'Wellington',
    ],
    'George / Knysna': [
      'George', 'Knysna', 'Mossel Bay', 'Oudtshoorn', 'Plettenberg Bay',
    ],
  },
  'Eastern Cape': {
    'Gqeberha (Port Elizabeth)': [
      'PE CBD', 'Walmer', 'Summerstrand', 'Greenacres', 'Newton Park',
      'Uitenhage', 'Despatch',
    ],
    'East London': [
      'East London CBD', 'Beacon Bay', 'Nahoon', 'Gonubie',
      'Cambridge', 'Southernwood',
    ],
    'Mthatha': ['Mthatha CBD', 'Ngangelizwe', 'Southernwood (MTH)'],
  },
  'Free State': {
    'Bloemfontein': [
      'Bloemfontein CBD', 'Westdene', 'Universitas', 'Langenhoven Park',
      'Mangaung', 'Botshabelo', 'Thaba Nchu',
    ],
    'Welkom': ['Welkom', 'Virginia', 'Odendaalsrus'],
  },
  'Limpopo': {
    'Polokwane': [
      'Polokwane CBD', 'Bendor', 'Flora Park', 'Seshego', 'Mankweng',
    ],
    'Tzaneen': ['Tzaneen', 'Letsitele', 'Giyani'],
    'Musina': ['Musina', 'Beit Bridge area'],
  },
  'Mpumalanga': {
    'Mbombela (Nelspruit)': [
      'Nelspruit CBD', 'Riverside Park', 'White River', 'Hazyview',
    ],
    'Witbank (eMalahleni)': ['eMalahleni', 'Middelburg', 'Secunda'],
  },
  'North West': {
    'Rustenburg': [
      'Rustenburg CBD', 'Waterfall East', 'Tlhabane', 'Boitekong',
    ],
    'Mahikeng': ['Mahikeng CBD', 'Mmabatho'],
    'Potchefstroom': ['Potchefstroom', 'Klerksdorp', 'Stilfontein'],
  },
  'Northern Cape': {
    'Kimberley': ['Kimberley CBD', 'Galeshewe', 'Roodepan'],
    'Upington': ['Upington', 'Kenhardt'],
  },
}

const PROVINCES = Object.keys(SA)

// ── Dropdown component ───────────────────────────────────────────────────────
function Dropdown({
  label, placeholder, value, options, onSelect,
}: {
  label: string
  placeholder: string
  value: string
  options: string[]
  onSelect: (v: string) => void
}) {
  const [open, setOpen] = useState(false)
  return (
    <View style={d.wrap}>
      <Text style={d.label}>{label}</Text>
      <TouchableOpacity style={d.picker} onPress={() => setOpen(p => !p)}>
        <Text style={[d.pickerText, !value && d.placeholder]}>
          {value || placeholder}
        </Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={16} color={colors.gray400} />
      </TouchableOpacity>
      {open && (
        <View style={d.list}>
          {options.map(opt => (
            <TouchableOpacity
              key={opt}
              style={[d.item, opt === value && d.itemActive]}
              onPress={() => { onSelect(opt); setOpen(false) }}
            >
              <Text style={[d.itemText, opt === value && d.itemTextActive]}>{opt}</Text>
              {opt === value && <Ionicons name="checkmark" size={14} color={colors.gold} />}
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  )
}

const d = StyleSheet.create({
  wrap:          { gap: 8 },
  label:         { fontSize: 11, fontWeight: '700', color: colors.gray400, letterSpacing: 0.8, textTransform: 'uppercase' },
  picker:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.white, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 14, borderWidth: 1, borderColor: colors.gray100 },
  pickerText:    { fontSize: 15, color: colors.black, flex: 1 },
  placeholder:   { color: colors.gray400 },
  list:          { backgroundColor: colors.white, borderRadius: 12, borderWidth: 1, borderColor: colors.gray100, overflow: 'hidden', marginTop: 4 },
  item:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: colors.gray100 },
  itemActive:    { backgroundColor: colors.gold + '15' },
  itemText:      { fontSize: 14, color: colors.black },
  itemTextActive:{ fontWeight: '700', color: colors.gold },
})

// ── Main screen ──────────────────────────────────────────────────────────────
export default function ServiceAreaScreen() {
  const { user } = useAuth()
  const [selected,  setSelected]  = useState<string[]>([])
  const [province,  setProvince]  = useState('')
  const [city,      setCity]      = useState('')
  const [custom,    setCustom]    = useState('')
  const [loading,   setLoading]   = useState(true)
  const [saving,    setSaving]    = useState(false)

  const cities   = province ? Object.keys(SA[province] ?? {}) : []
  const suburbs  = (province && city) ? (SA[province]?.[city] ?? []) : []

  useEffect(() => {
    if (!user?.id) return
    api.providers.get(user.id)
      .then(p => setSelected(p.serviceAreas ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [user?.id])

  const toggleSuburb = (area: string) =>
    setSelected(prev => prev.includes(area) ? prev.filter(a => a !== area) : [...prev, area])

  const addCustom = () => {
    const val = custom.trim()
    if (!val || selected.includes(val)) { setCustom(''); return }
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
                Select the suburbs you cover. Pick a province and city to browse suburbs, or type a custom area.
              </Text>
            </View>

            {/* Province dropdown */}
            <Dropdown
              label="Province"
              placeholder="Select a province…"
              value={province}
              options={PROVINCES}
              onSelect={v => { setProvince(v); setCity('') }}
            />

            {/* City dropdown — only shown once province selected */}
            {province !== '' && (
              <Dropdown
                label="City / Region"
                placeholder="Select a city…"
                value={city}
                options={cities}
                onSelect={setCity}
              />
            )}

            {/* Suburb chips — only shown once city selected */}
            {suburbs.length > 0 && (
              <View style={s.section}>
                <Text style={s.sectionLabel}>SUBURBS IN {city.toUpperCase()}</Text>
                <View style={s.chipRow}>
                  {suburbs.map(area => {
                    const on = selected.includes(area)
                    return (
                      <TouchableOpacity
                        key={area}
                        style={[s.chip, on && s.chipOn]}
                        onPress={() => toggleSuburb(area)}
                      >
                        <Text style={[s.chipText, on && s.chipTextOn]}>{area}</Text>
                      </TouchableOpacity>
                    )
                  })}
                </View>
              </View>
            )}

            {/* Custom area */}
            <View style={s.section}>
              <Text style={s.sectionLabel}>ADD CUSTOM SUBURB</Text>
              <View style={s.inputRow}>
                <TextInput
                  style={s.input}
                  value={custom}
                  onChangeText={setCustom}
                  placeholder="Type any suburb not listed…"
                  placeholderTextColor={colors.gray400}
                  onSubmitEditing={addCustom}
                  returnKeyType="done"
                />
                <TouchableOpacity style={s.addBtn} onPress={addCustom}>
                  <Ionicons name="add" size={20} color={colors.white} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Selected areas summary */}
            {selected.length > 0 && (
              <View style={s.section}>
                <Text style={s.sectionLabel}>SELECTED AREAS ({selected.length})</Text>
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
  safe:             { flex: 1, backgroundColor: colors.gray50 },
  header:           { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.black, paddingHorizontal: 16, paddingVertical: 14 },
  backBtn:          { padding: 2 },
  title:            { flex: 1, fontSize: 18, fontWeight: '700', color: colors.white },
  countBadge:       { backgroundColor: colors.gold, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  countText:        { fontSize: 12, fontWeight: '700', color: colors.black },
  center:           { flex: 1, justifyContent: 'center', alignItems: 'center' },
  body:             { padding: 16, gap: 16 },

  infoBox:          { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: colors.gold + '15', borderRadius: 12, padding: 14 },
  infoText:         { flex: 1, fontSize: 12, color: colors.gray600, lineHeight: 18 },

  section:          { gap: 10 },
  sectionLabel:     { fontSize: 11, fontWeight: '700', color: colors.gray400, letterSpacing: 0.8 },

  chipRow:          { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip:             { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.gray100 },
  chipOn:           { backgroundColor: colors.black, borderColor: colors.black },
  chipText:         { fontSize: 13, color: colors.gray600, fontWeight: '500' },
  chipTextOn:       { color: colors.white, fontWeight: '600' },
  chipSelected:     { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 20, backgroundColor: colors.gold },
  chipSelectedText: { fontSize: 13, fontWeight: '600', color: colors.black },

  inputRow:         { flexDirection: 'row', gap: 10 },
  input:            { flex: 1, backgroundColor: colors.white, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: colors.black, borderWidth: 1, borderColor: colors.gray100 },
  addBtn:           { width: 46, backgroundColor: colors.black, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },

  saveBtn:          { backgroundColor: colors.gold, borderRadius: 12, padding: 16, alignItems: 'center' },
  saveBtnText:      { fontSize: 15, fontWeight: '700', color: colors.black },
})
