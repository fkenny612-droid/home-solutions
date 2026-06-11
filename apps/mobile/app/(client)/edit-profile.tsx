import { useState } from 'react'
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ActivityIndicator, ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import * as ImagePicker from 'expo-image-picker'
import { colors } from '../../constants/theme'
import { useAuth } from '../../context/auth'
import { api } from '../../lib/api'
import { uploadToCloudinary } from '../../lib/cloudinary'

export default function EditProfile() {
  const { user } = useAuth()

  const [firstName, setFirstName] = useState(user?.firstName ?? '')
  const [lastName,  setLastName]  = useState(user?.lastName  ?? '')
  const [email,     setEmail]     = useState('')
  const [saving,    setSaving]    = useState(false)
  const [uploading, setUploading] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)

  const initials = ((firstName[0] ?? '') + (lastName[0] ?? '')).toUpperCase() || '?'

  const pickAvatar = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!perm.granted) { Alert.alert('Permission needed', 'Allow photo access to upload a profile photo.'); return }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8, allowsEditing: true, aspect: [1, 1] })
    if (result.canceled) return
    const asset = result.assets[0]
    setUploading(true)
    try {
      const { url } = await uploadToCloudinary(asset.uri, `avatar_${user?.id}.jpg`, 'image/jpeg', 'easy-fix/avatars')
      setAvatarUrl(url)
    } catch { Alert.alert('Upload failed', 'Please try again.') }
    finally { setUploading(false) }
  }

  const handleSave = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      Alert.alert('Required', 'First and last name are required.')
      return
    }
    setSaving(true)
    try {
      await api.auth.updateProfile({
        firstName: firstName.trim(),
        lastName:  lastName.trim(),
        ...(email.trim() ? { email: email.trim() } : {}),
      })
      Alert.alert('Saved', 'Your profile has been updated.', [
        { text: 'OK', onPress: () => router.back() }
      ])
    } catch {
      Alert.alert('Error', 'Could not save changes. Please try again.')
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
        <Text style={s.title}>Edit profile</Text>
      </View>

      <ScrollView contentContainerStyle={s.body} keyboardShouldPersistTaps="handled">
        {/* Avatar */}
        <TouchableOpacity style={s.avatarWrap} onPress={pickAvatar} disabled={uploading}>
          <View style={s.avatar}>
            {uploading
              ? <ActivityIndicator color={colors.gold} />
              : <Text style={s.avatarText}>{initials}</Text>
            }
          </View>
          <View style={s.avatarEdit}>
            <Ionicons name="camera" size={14} color={colors.white} />
          </View>
          <Text style={s.avatarHint}>{avatarUrl ? 'Photo updated' : 'Tap to change photo'}</Text>
        </TouchableOpacity>

        {/* Fields */}
        <View style={s.fieldGroup}>
          <View style={s.field}>
            <Text style={s.label}>First name</Text>
            <TextInput
              style={s.input}
              value={firstName}
              onChangeText={setFirstName}
              placeholder="First name"
              placeholderTextColor={colors.gray400}
              autoCapitalize="words"
              returnKeyType="next"
            />
          </View>
          <View style={[s.field, s.fieldBorder]}>
            <Text style={s.label}>Last name</Text>
            <TextInput
              style={s.input}
              value={lastName}
              onChangeText={setLastName}
              placeholder="Last name"
              placeholderTextColor={colors.gray400}
              autoCapitalize="words"
              returnKeyType="next"
            />
          </View>
          <View style={[s.field, s.fieldBorder]}>
            <Text style={s.label}>Email</Text>
            <TextInput
              style={s.input}
              value={email}
              onChangeText={setEmail}
              placeholder="your@email.com"
              placeholderTextColor={colors.gray400}
              keyboardType="email-address"
              autoCapitalize="none"
              returnKeyType="done"
            />
          </View>
        </View>

        <View style={s.phoneBox}>
          <Ionicons name="lock-closed-outline" size={14} color={colors.gray400} />
          <Text style={s.phoneText}>Phone number ({user?.phone}) cannot be changed</Text>
        </View>

        <TouchableOpacity
          style={[s.saveBtn, saving && { opacity: 0.6 }]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving
            ? <ActivityIndicator color={colors.black} />
            : <Text style={s.saveBtnText}>Save changes</Text>}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe:         { flex: 1, backgroundColor: colors.gray50 },
  header:       { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.black, paddingHorizontal: 16, paddingVertical: 14 },
  backBtn:      { padding: 2 },
  title:        { fontSize: 18, fontWeight: '700', color: colors.white },
  body:         { padding: 20, gap: 20 },
  // Avatar
  avatarWrap:   { alignItems: 'center', gap: 8 },
  avatar:       { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.black2, borderWidth: 2, borderColor: colors.gold, alignItems: 'center', justifyContent: 'center' },
  avatarText:   { fontSize: 28, fontWeight: '700', color: colors.gold },
  avatarEdit:   { position: 'absolute', bottom: 24, right: '37%', backgroundColor: colors.gold, borderRadius: 12, padding: 4 },
  avatarHint:   { fontSize: 12, color: colors.gray400 },
  // Fields
  fieldGroup:   { backgroundColor: colors.white, borderRadius: 14, overflow: 'hidden' },
  field:        { paddingHorizontal: 16, paddingVertical: 14 },
  fieldBorder:  { borderTopWidth: 1, borderTopColor: colors.gray100 },
  label:        { fontSize: 11, fontWeight: '600', color: colors.gray400, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 6 },
  input:        { fontSize: 15, color: colors.black },
  // Phone lock
  phoneBox:     { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.gray100, borderRadius: 10, padding: 12 },
  phoneText:    { fontSize: 12, color: colors.gray400, flex: 1 },
  // Save
  saveBtn:      { backgroundColor: colors.gold, borderRadius: 12, padding: 16, alignItems: 'center' },
  saveBtnText:  { fontSize: 15, fontWeight: '700', color: colors.black },
})
