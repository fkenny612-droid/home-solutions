import { useEffect, useState, useCallback } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, Alert, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { colors } from '../../constants/theme'
import { api, SavedAddress } from '../../lib/api'

export default function SavedAddresses() {
  const [addresses, setAddresses] = useState<SavedAddress[]>([])
  const [loading,   setLoading]   = useState(true)
  const [adding,    setAdding]    = useState(false)
  const [saving,    setSaving]    = useState(false)
  const [label,     setLabel]     = useState('')
  const [address,   setAddress]   = useState('')

  const load = useCallback(async () => {
    try { setAddresses(await api.auth.getAddresses()) }
    catch {}
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const handleAdd = async () => {
    if (!label.trim() || !address.trim()) {
      Alert.alert('Missing fields', 'Please enter both a label and an address.')
      return
    }
    setSaving(true)
    try {
      const saved = await api.auth.saveAddress({ label: label.trim(), address: address.trim() })
      setAddresses(prev => [...prev, saved])
      setLabel(''); setAddress(''); setAdding(false)
    } catch { Alert.alert('Error', 'Could not save address. Please try again.') }
    finally { setSaving(false) }
  }

  const handleDelete = (id: string) => {
    Alert.alert('Remove address', 'Remove this saved address?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive',
        onPress: async () => {
          try {
            await api.auth.deleteAddress(id)
            setAddresses(prev => prev.filter(a => a.id !== id))
          } catch { Alert.alert('Error', 'Could not remove address.') }
        },
      },
    ])
  }

  const handleSetDefault = async (id: string) => {
    try {
      await api.auth.setDefaultAddress(id)
      setAddresses(prev => prev.map(a => ({ ...a, isDefault: a.id === id })))
    } catch { Alert.alert('Error', 'Could not update default address.') }
  }

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.white} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Saved Addresses</Text>
        <TouchableOpacity style={s.addBtn} onPress={() => setAdding(true)}>
          <Ionicons name="add" size={22} color={colors.white} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={s.center}><ActivityIndicator color={colors.gold} /></View>
      ) : (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={s.body}>

            {addresses.length === 0 && !adding && (
              <View style={s.empty}>
                <Ionicons name="location-outline" size={48} color={colors.gray200} />
                <Text style={s.emptyTitle}>No saved addresses</Text>
                <Text style={s.emptySub}>Tap + to add your first address</Text>
              </View>
            )}

            {addresses.map(addr => (
              <View key={addr.id} style={s.card}>
                <View style={s.cardIcon}>
                  <Ionicons
                    name={addr.label.toLowerCase() === 'home' ? 'home' : addr.label.toLowerCase() === 'work' ? 'briefcase' : 'location'}
                    size={18}
                    color={addr.isDefault ? colors.gold : colors.gray400}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={s.cardLabelRow}>
                    <Text style={s.cardLabel}>{addr.label}</Text>
                    {addr.isDefault && (
                      <View style={s.defaultBadge}>
                        <Text style={s.defaultBadgeText}>DEFAULT</Text>
                      </View>
                    )}
                  </View>
                  <Text style={s.cardAddress}>{addr.address}</Text>
                  {!addr.isDefault && (
                    <TouchableOpacity onPress={() => handleSetDefault(addr.id)}>
                      <Text style={s.setDefaultLink}>Set as default</Text>
                    </TouchableOpacity>
                  )}
                </View>
                <TouchableOpacity onPress={() => handleDelete(addr.id)} style={s.deleteBtn}>
                  <Ionicons name="trash-outline" size={18} color={colors.gray400} />
                </TouchableOpacity>
              </View>
            ))}

            {adding && (
              <View style={s.addForm}>
                <Text style={s.formTitle}>New Address</Text>
                <TextInput
                  style={s.input}
                  placeholder="Label (e.g. Home, Work)"
                  placeholderTextColor={colors.gray400}
                  value={label}
                  onChangeText={setLabel}
                />
                <TextInput
                  style={[s.input, { marginTop: 10 }]}
                  placeholder="Full address"
                  placeholderTextColor={colors.gray400}
                  value={address}
                  onChangeText={setAddress}
                  multiline
                />
                <View style={s.formButtons}>
                  <TouchableOpacity style={s.cancelBtn} onPress={() => { setAdding(false); setLabel(''); setAddress('') }}>
                    <Text style={s.cancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[s.saveBtn, saving && { opacity: 0.6 }]} onPress={handleAdd} disabled={saving}>
                    {saving ? <ActivityIndicator color={colors.white} size="small" /> : <Text style={s.saveBtnText}>Save</Text>}
                  </TouchableOpacity>
                </View>
              </View>
            )}

            <View style={{ height: 32 }} />
          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe:             { flex: 1, backgroundColor: colors.gray50 },
  header:           { backgroundColor: colors.black, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 14 },
  backBtn:          { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle:      { flex: 1, textAlign: 'center', fontSize: 16, fontWeight: '700', color: colors.white },
  addBtn:           { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  center:           { flex: 1, justifyContent: 'center', alignItems: 'center' },
  body:             { padding: 16 },
  empty:            { alignItems: 'center', paddingTop: 80, gap: 10 },
  emptyTitle:       { fontSize: 15, fontWeight: '700', color: colors.black },
  emptySub:         { fontSize: 13, color: colors.gray400 },
  card:             { backgroundColor: colors.white, borderRadius: 14, padding: 16, flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 10, borderWidth: 1, borderColor: colors.gray100 },
  cardIcon:         { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.gray50, alignItems: 'center', justifyContent: 'center' },
  cardLabelRow:     { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  cardLabel:        { fontSize: 14, fontWeight: '700', color: colors.black },
  defaultBadge:     { backgroundColor: colors.gold + '20', borderWidth: 1, borderColor: colors.gold + '60', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  defaultBadgeText: { fontSize: 8, fontWeight: '700', color: colors.gold, letterSpacing: 0.8 },
  cardAddress:      { fontSize: 12, color: colors.gray600, lineHeight: 17 },
  setDefaultLink:   { fontSize: 11, color: colors.gold, fontWeight: '600', marginTop: 6 },
  deleteBtn:        { padding: 4 },
  addForm:          { backgroundColor: colors.white, borderRadius: 14, padding: 16, marginTop: 8, borderWidth: 1, borderColor: colors.gray100 },
  formTitle:        { fontSize: 14, fontWeight: '700', color: colors.black, marginBottom: 12 },
  input:            { backgroundColor: colors.gray50, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: colors.black, borderWidth: 1, borderColor: colors.gray100 },
  formButtons:      { flexDirection: 'row', gap: 10, marginTop: 14 },
  cancelBtn:        { flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: colors.gray50, alignItems: 'center', borderWidth: 1, borderColor: colors.gray100 },
  cancelBtnText:    { fontSize: 14, fontWeight: '600', color: colors.gray600 },
  saveBtn:          { flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: colors.black, alignItems: 'center' },
  saveBtnText:      { fontSize: 14, fontWeight: '700', color: colors.white },
})
