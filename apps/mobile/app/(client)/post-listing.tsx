import { useState, useEffect } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, Image,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import * as ImagePicker from 'expo-image-picker'
import { colors } from '../../constants/theme'
import { api, ListingCategory, ListingSubcategory, ListingCondition } from '../../lib/api'
import { useAuth } from '../../context/auth'
import { uploadToCloudinary } from '../../lib/cloudinary'

// ─── Config ───────────────────────────────────────────────────────────────────
type CatOption = { id: ListingCategory; label: string; emoji: string }
const CATEGORIES: CatOption[] = [
  { id: 'goods',    label: 'Goods',    emoji: '📦' },
  { id: 'property', label: 'Property', emoji: '🏠' },
  { id: 'jobs',     label: 'Jobs',     emoji: '💼' },
]

type SubOption = { id: ListingSubcategory; label: string }
const SUBCATEGORIES: Record<ListingCategory, SubOption[]> = {
  goods: [
    { id: 'furniture',   label: 'Furniture' },
    { id: 'appliances',  label: 'Appliances' },
    { id: 'electronics', label: 'Electronics' },
    { id: 'tools',       label: 'Tools & Hardware' },
    { id: 'clothing',    label: 'Clothing & Accessories' },
    { id: 'vehicles',    label: 'Vehicles & Parts' },
    { id: 'garden',      label: 'Garden & Outdoor' },
    { id: 'other_goods', label: 'Other' },
  ],
  property: [
    { id: 'room_to_rent',      label: 'Room to rent' },
    { id: 'house_to_rent',     label: 'House to rent' },
    { id: 'flat_to_rent',      label: 'Flat / Apartment to rent' },
    { id: 'property_for_sale', label: 'Property for sale' },
    { id: 'commercial',        label: 'Commercial / Office' },
  ],
  jobs: [
    { id: 'full_time', label: 'Full-time' },
    { id: 'part_time', label: 'Part-time' },
    { id: 'contract',  label: 'Contract' },
    { id: 'freelance', label: 'Freelance / Remote' },
    { id: 'domestic',  label: 'Domestic / Household' },
  ],
}

const CONDITIONS: { id: ListingCondition; label: string }[] = [
  { id: 'new',       label: 'Brand new' },
  { id: 'like_new',  label: 'Like new' },
  { id: 'good',      label: 'Good' },
  { id: 'fair',      label: 'Fair' },
  { id: 'for_parts', label: 'For parts / not working' },
]

const DURBAN_SUBURBS = [
  'Berea', 'Bluff', 'Chatsworth', 'Durban Central', 'Essenwood', 'Glenwood',
  'Hillcrest', 'La Lucia', 'Morningside', 'Musgrave', 'New Germany', 'Overport',
  'Pinetown', 'Point', 'Rossburgh', 'Sydenham', 'Umhlanga', 'Westville', 'Other',
]

interface PickedImage {
  localUri:  string
  uploading: boolean
  url?:      string
}

function Label({ children }: { children: React.ReactNode }) {
  return <Text style={f.label}>{children}</Text>
}

function SectionCard({ children }: { children: React.ReactNode }) {
  return <View style={f.section}>{children}</View>
}

export default function PostListingScreen() {
  const { user } = useAuth()

  const [verifying,   setVerifying]   = useState(true)

  // Gate: redirect to verify-id if not yet verified
  useEffect(() => {
    api.auth.me().then(me => {
      if (!me.idVerified) {
        router.replace({ pathname: '/(client)/verify-id' as any, params: { returnTo: '/(client)/post-listing' } })
      } else {
        setVerifying(false)
      }
    }).catch(() => setVerifying(false))
  }, [])

  const [category,    setCategory]    = useState<ListingCategory>('goods')
  const [subcategory, setSubcategory] = useState<ListingSubcategory>('furniture')
  const [title,       setTitle]       = useState('')
  const [description, setDescription] = useState('')
  const [price,       setPrice]       = useState('')
  const [salaryMin,   setSalaryMin]   = useState('')
  const [salaryMax,   setSalaryMax]   = useState('')
  const [negotiable,  setNegotiable]  = useState(false)
  const [free,        setFree]        = useState(false)
  const [condition,   setCondition]   = useState<ListingCondition>('good')
  const [suburb,      setSuburb]      = useState(DURBAN_SUBURBS[0])
  const [images,      setImages]      = useState<PickedImage[]>([])
  const [urgent,      setUrgent]      = useState(false)
  const [submitting,  setSubmitting]  = useState(false)

  const showCondition = category === 'goods'

  const pickImage = async () => {
    if (images.length >= 8) { Alert.alert('Max 8 photos'); return }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.7,
      selectionLimit: 8 - images.length,
    })
    if (result.canceled) return

    const picked = result.assets.slice(0, 8 - images.length)
    setImages(prev => [...prev, ...picked.map(a => ({ localUri: a.uri, uploading: true }))])

    picked.forEach(async (a, i) => {
      try {
        const { url } = await uploadToCloudinary(
          a.uri,
          a.fileName ?? `listing_${Date.now()}_${i}.jpg`,
          a.mimeType ?? 'image/jpeg',
          'home-solutions/listings',
        )
        setImages(prev => prev.map(img => img.localUri === a.uri ? { ...img, uploading: false, url } : img))
      } catch {
        setImages(prev => prev.filter(img => img.localUri !== a.uri))
        Alert.alert('Upload failed', `Could not upload one of your photos. Please try again.`)
      }
    })
  }

  const removeImage = (idx: number) => setImages(prev => prev.filter((_, i) => i !== idx))
  const imagesUploading = images.some(img => img.uploading)

  const derivePriceLabel = () => {
    if (category === 'jobs') {
      const min = parseInt(salaryMin.replace(/\D/g, ''), 10)
      const max = parseInt(salaryMax.replace(/\D/g, ''), 10)
      if (negotiable || (isNaN(min) && isNaN(max))) return 'Negotiable'
      if (!isNaN(min) && !isNaN(max)) return `R ${min.toLocaleString('en-ZA')} – R ${max.toLocaleString('en-ZA')} / mo`
      if (!isNaN(min)) return `From R ${min.toLocaleString('en-ZA')} / mo`
      return `Up to R ${max.toLocaleString('en-ZA')} / mo`
    }
    if (free) return 'Free'
    if (negotiable || !price) return 'Negotiable'
    const n = parseInt(price.replace(/\D/g, ''), 10)
    if (isNaN(n)) return 'Negotiable'
    if (category === 'property') return `R ${n.toLocaleString('en-ZA')} / mo`
    return `R ${n.toLocaleString('en-ZA')}`
  }

  const handleSubmit = async () => {
    if (!user) { Alert.alert('Sign in required'); return }
    if (!title.trim())       { Alert.alert('Add a title'); return }
    if (!description.trim()) { Alert.alert('Add a description'); return }
    if (imagesUploading)     { Alert.alert('Please wait', 'Your photos are still uploading.'); return }

    setSubmitting(true)
    try {
      await api.listings.create({
        category,
        subcategory,
        title:       title.trim(),
        description: description.trim(),
        price:       category === 'jobs'
          ? (parseInt(salaryMin.replace(/\D/g, ''), 10) || null) as number | null
          : free ? null : (parseInt(price.replace(/\D/g, ''), 10) || null) as number | null,
        priceLabel:  derivePriceLabel(),
        condition:   showCondition ? condition : null,
        images:      images.filter(img => img.url).map(img => img.url!),
        city:        'Durban',
        suburb,
        urgent,
      })
      Alert.alert('Listing posted!', 'Your listing is now live on the marketplace.', [
        { text: 'View marketplace', onPress: () => router.replace('/(client)/market' as any) },
      ])
    } catch {
      Alert.alert('Error', 'Could not post your listing. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (verifying) return (
    <SafeAreaView style={s.safe}>
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color={colors.gold} />
      </View>
    </SafeAreaView>
  )

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.white} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Post a listing</Text>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">

          {/* Category */}
          <SectionCard>
            <Label>CATEGORY</Label>
            <View style={f.chipRow}>
              {CATEGORIES.map(c => (
                <TouchableOpacity
                  key={c.id}
                  style={[f.chip, category === c.id && f.chipActive]}
                  onPress={() => {
                    setCategory(c.id)
                    setSubcategory(SUBCATEGORIES[c.id][0].id)
                  }}
                >
                  <Text style={f.chipEmoji}>{c.emoji}</Text>
                  <Text style={[f.chipText, category === c.id && f.chipTextActive]}>{c.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Label>SUBCATEGORY</Label>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 4 }}>
              {SUBCATEGORIES[category].map(sc => (
                <TouchableOpacity
                  key={sc.id}
                  style={[f.subChip, subcategory === sc.id && f.subChipActive]}
                  onPress={() => setSubcategory(sc.id)}
                >
                  <Text style={[f.subChipText, subcategory === sc.id && f.subChipTextActive]}>{sc.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </SectionCard>

          {/* Photos */}
          <SectionCard>
            <Label>PHOTOS ({images.length}/8)</Label>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
              <TouchableOpacity style={f.addPhoto} onPress={pickImage}>
                <Ionicons name="camera-outline" size={24} color={colors.gray400} />
                <Text style={f.addPhotoText}>Add photo</Text>
              </TouchableOpacity>
              {images.map((img, i) => (
                <View key={img.localUri} style={f.photoThumb}>
                  <Image source={{ uri: img.localUri }} style={f.photoThumbImg} resizeMode="cover" />
                  {img.uploading && (
                    <View style={f.photoThumbOverlay}>
                      <ActivityIndicator color={colors.white} size="small" />
                    </View>
                  )}
                  <TouchableOpacity style={f.removePhoto} onPress={() => removeImage(i)}>
                    <Ionicons name="close-circle" size={20} color={colors.white} />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          </SectionCard>

          {/* Title & description */}
          <SectionCard>
            <Label>TITLE</Label>
            <TextInput
              style={f.input}
              value={title}
              onChangeText={setTitle}
              placeholder="e.g. Queen bed + mattress — Glenwood"
              placeholderTextColor={colors.gray400}
              maxLength={80}
            />
            <Text style={f.charCount}>{title.length}/80</Text>

            <Label>DESCRIPTION</Label>
            <TextInput
              style={[f.input, f.textarea]}
              value={description}
              onChangeText={setDescription}
              placeholder="Describe the item, condition, size, what's included, collection/delivery options…"
              placeholderTextColor={colors.gray400}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
              maxLength={1000}
            />
            <Text style={f.charCount}>{description.length}/1000</Text>
          </SectionCard>

          {/* Price / Salary */}
          {category === 'jobs' ? (
            <SectionCard>
              <Label>SALARY RANGE (PER MONTH)</Label>
              <View style={f.salaryRow}>
                <View style={{ flex: 1 }}>
                  <Text style={f.salarySubLabel}>Minimum</Text>
                  <TextInput
                    style={[f.input, negotiable && f.inputDisabled]}
                    value={salaryMin}
                    onChangeText={v => setSalaryMin(v.replace(/\D/g, ''))}
                    placeholder="e.g. 8000"
                    placeholderTextColor={colors.gray400}
                    keyboardType="numeric"
                    editable={!negotiable}
                  />
                </View>
                <Text style={f.salaryDash}>—</Text>
                <View style={{ flex: 1 }}>
                  <Text style={f.salarySubLabel}>Maximum</Text>
                  <TextInput
                    style={[f.input, negotiable && f.inputDisabled]}
                    value={salaryMax}
                    onChangeText={v => setSalaryMax(v.replace(/\D/g, ''))}
                    placeholder="e.g. 12000"
                    placeholderTextColor={colors.gray400}
                    keyboardType="numeric"
                    editable={!negotiable}
                  />
                </View>
              </View>
              <View style={f.priceToggles}>
                <TouchableOpacity style={f.toggle} onPress={() => setNegotiable(n => !n)}>
                  <View style={[f.toggleBox, negotiable && f.toggleBoxOn]}>
                    {negotiable && <Ionicons name="checkmark" size={12} color={colors.white} />}
                  </View>
                  <Text style={f.toggleLabel}>Negotiable / DOE</Text>
                </TouchableOpacity>
              </View>
            </SectionCard>
          ) : (
            <SectionCard>
              <Label>PRICE</Label>
              <TextInput
                style={[f.input, (negotiable || free) && f.inputDisabled]}
                value={price}
                onChangeText={setPrice}
                placeholder="e.g. 3500"
                placeholderTextColor={colors.gray400}
                keyboardType="numeric"
                editable={!negotiable && !free}
              />
              <View style={f.priceToggles}>
                <TouchableOpacity style={f.toggle} onPress={() => { setNegotiable(n => !n); setFree(false) }}>
                  <View style={[f.toggleBox, negotiable && f.toggleBoxOn]}>
                    {negotiable && <Ionicons name="checkmark" size={12} color={colors.white} />}
                  </View>
                  <Text style={f.toggleLabel}>Negotiable</Text>
                </TouchableOpacity>
                <TouchableOpacity style={f.toggle} onPress={() => { setFree(n => !n); setNegotiable(false) }}>
                  <View style={[f.toggleBox, free && f.toggleBoxOn]}>
                    {free && <Ionicons name="checkmark" size={12} color={colors.white} />}
                  </View>
                  <Text style={f.toggleLabel}>Free</Text>
                </TouchableOpacity>
              </View>
            </SectionCard>
          )}

          {/* Condition (goods only) */}
          {showCondition && (
            <SectionCard>
              <Label>CONDITION</Label>
              <View style={f.chipRow}>
                {CONDITIONS.map(c => (
                  <TouchableOpacity
                    key={c.id}
                    style={[f.condChip, condition === c.id && f.condChipActive]}
                    onPress={() => setCondition(c.id)}
                  >
                    <Text style={[f.condChipText, condition === c.id && f.condChipTextActive]}>{c.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </SectionCard>
          )}

          {/* Location */}
          <SectionCard>
            <Label>SUBURB</Label>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {DURBAN_SUBURBS.map(sub => (
                <TouchableOpacity
                  key={sub}
                  style={[f.subChip, suburb === sub && f.subChipActive]}
                  onPress={() => setSuburb(sub)}
                >
                  <Text style={[f.subChipText, suburb === sub && f.subChipTextActive]}>{sub}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </SectionCard>

          {/* Urgent toggle */}
          <SectionCard>
            <TouchableOpacity style={f.urgentRow} onPress={() => setUrgent(u => !u)}>
              <View style={{ flex: 1 }}>
                <Text style={f.urgentTitle}>Mark as urgent</Text>
                <Text style={f.urgentSub}>Gets a red URGENT badge — use sparingly</Text>
              </View>
              <View style={[f.urgentSwitch, urgent && f.urgentSwitchOn]}>
                <View style={[f.urgentThumb, urgent && f.urgentThumbOn]} />
              </View>
            </TouchableOpacity>
          </SectionCard>

          {/* Preview label */}
          <View style={s.previewRow}>
            <Text style={s.previewLabel}>{category === 'jobs' ? 'SALARY PREVIEW' : 'PRICE PREVIEW'}</Text>
            <Text style={s.previewValue}>{derivePriceLabel()}</Text>
          </View>

          {/* Submit */}
          <TouchableOpacity
            style={[s.submitBtn, (submitting || imagesUploading) && { opacity: 0.5 }]}
            onPress={handleSubmit}
            disabled={submitting || imagesUploading}
          >
            {submitting
              ? <ActivityIndicator color={colors.black} />
              : <>
                  <Ionicons name="checkmark-circle-outline" size={20} color={colors.black} />
                  <Text style={s.submitBtnText}>Post listing</Text>
                </>
            }
          </TouchableOpacity>

          <Text style={s.terms}>
            By posting you agree to the Easyfix Marketplace terms. Prohibited items (weapons, counterfeit goods, etc.) will be removed.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

// ─── Shared form styles ───────────────────────────────────────────────────────
const f = StyleSheet.create({
  section:         { backgroundColor: colors.white, borderRadius: 14, padding: 16, marginBottom: 14 },
  label:           { fontSize: 10, fontWeight: '700', color: colors.gray400, letterSpacing: 1, marginBottom: 10, marginTop: 14 },
  input:           { backgroundColor: colors.gray50, borderRadius: 10, borderWidth: 1, borderColor: colors.gray100, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: colors.black },
  inputDisabled:   { opacity: 0.4 },
  textarea:        { minHeight: 110, textAlignVertical: 'top' },
  charCount:       { fontSize: 10, color: colors.gray300, textAlign: 'right', marginTop: 4, marginBottom: 4 },
  chipRow:         { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  chip:            { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1.5, borderColor: colors.gray200, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10 },
  chipActive:      { borderColor: colors.black, backgroundColor: colors.black },
  chipEmoji:       { fontSize: 16 },
  chipText:        { fontSize: 13, fontWeight: '600', color: colors.gray600 },
  chipTextActive:  { color: colors.white },
  subChip:         { borderWidth: 1, borderColor: colors.gray200, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 },
  subChipActive:   { borderColor: colors.gold, backgroundColor: colors.gold + '20' },
  subChipText:     { fontSize: 12, color: colors.gray600, fontWeight: '500' },
  subChipTextActive:{ color: colors.gold, fontWeight: '700' },
  condChip:        { borderWidth: 1, borderColor: colors.gray200, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8 },
  condChipActive:  { borderColor: colors.black, backgroundColor: colors.black },
  condChipText:    { fontSize: 12, color: colors.gray600, fontWeight: '500' },
  condChipTextActive:{ color: colors.white, fontWeight: '700' },

  addPhoto:        { width: 90, height: 90, borderRadius: 12, borderWidth: 1.5, borderColor: colors.gray200, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', gap: 6 },
  addPhotoText:    { fontSize: 10, color: colors.gray400, fontWeight: '600' },
  photoThumb:      { width: 90, height: 90, borderRadius: 12, backgroundColor: colors.gray100, overflow: 'hidden' },
  photoThumbImg:   { width: '100%', height: '100%' },
  photoThumbOverlay:{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center' },
  removePhoto:     { position: 'absolute', top: 4, right: 4, zIndex: 1 },

  salaryRow:       { flexDirection: 'row', alignItems: 'flex-end', gap: 10 },
  salarySubLabel:  { fontSize: 10, color: colors.gray400, fontWeight: '600', marginBottom: 6 },
  salaryDash:      { fontSize: 18, color: colors.gray300, paddingBottom: 12 },
  priceToggles:    { flexDirection: 'row', gap: 20, marginTop: 12 },
  toggle:          { flexDirection: 'row', alignItems: 'center', gap: 8 },
  toggleBox:       { width: 20, height: 20, borderRadius: 4, borderWidth: 1.5, borderColor: colors.gray300, alignItems: 'center', justifyContent: 'center' },
  toggleBoxOn:     { backgroundColor: colors.black, borderColor: colors.black },
  toggleLabel:     { fontSize: 13, color: colors.gray600, fontWeight: '500' },

  urgentRow:       { flexDirection: 'row', alignItems: 'center', gap: 14 },
  urgentTitle:     { fontSize: 14, fontWeight: '600', color: colors.black },
  urgentSub:       { fontSize: 11, color: colors.gray400, marginTop: 2 },
  urgentSwitch:    { width: 44, height: 26, borderRadius: 13, backgroundColor: colors.gray200, padding: 2, justifyContent: 'center' },
  urgentSwitchOn:  { backgroundColor: colors.black },
  urgentThumb:     { width: 22, height: 22, borderRadius: 11, backgroundColor: colors.white },
  urgentThumbOn:   { alignSelf: 'flex-end' },
})

// ─── Screen styles ────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe:         { flex: 1, backgroundColor: colors.gray50 },
  header:       { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.black, paddingHorizontal: 16, paddingVertical: 14 },
  backBtn:      { padding: 2 },
  headerTitle:  { fontSize: 17, fontWeight: '700', color: colors.white },
  previewRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.white, borderRadius: 14, padding: 16, marginBottom: 14 },
  previewLabel: { fontSize: 11, fontWeight: '700', color: colors.gray400, letterSpacing: 0.8 },
  previewValue: { fontSize: 18, fontWeight: '800', color: colors.black },
  submitBtn:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: colors.gold, borderRadius: 14, padding: 18, marginBottom: 14 },
  submitBtnText:{ fontSize: 16, fontWeight: '700', color: colors.black },
  terms:        { fontSize: 11, color: colors.gray400, textAlign: 'center', lineHeight: 17, paddingHorizontal: 10 },
})
