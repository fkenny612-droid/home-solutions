/**
 * Provider KYC Onboarding
 * - Required docs: ID, company reg, bank letter
 * - Optional: trade certificate (unlocks plumbing, electrical, gas, etc.)
 * - Hire inventory: item picker (which variants + quantities) + photos (min 3)
 */
import { useState, useEffect, useCallback, useRef } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, Image,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import * as ImagePicker from 'expo-image-picker'
import * as DocumentPicker from 'expo-document-picker'
import { colors } from '../../constants/theme'
import { useAuth } from '../../context/auth'
import { uploadToCloudinary } from '../../lib/cloudinary'
import { api } from '../../lib/api'
import { SERVICES } from '../../lib/serviceConfig'

// ─── Types ────────────────────────────────────────────────────────────────────
type DocType = 'id' | 'company_reg' | 'bank_letter' | 'trade_cert'

interface DocStatus {
  uploaded:  boolean
  uploading: boolean
  fileName:  string | null
  fileUrl:   string | null
}

interface HirePhoto {
  uploading: boolean
  fileName:  string | null
  fileUrl:   string | null
  localUri?: string
}

// inventory[serviceId][optionValue] = { qty, available }
interface HireItem { qty: number; available: boolean }
type HireInventory = Record<string, Record<string, HireItem>>

// Parse either old number format or new object format
function parseItem(val: any): HireItem {
  if (typeof val === 'number') return { qty: val, available: true }
  return { qty: val?.qty ?? 1, available: val?.available !== false }
}

// ─── Hire service IDs ─────────────────────────────────────────────────────────
const HIRE_SERVICE_IDS = new Set([
  'tent_hire', 'chair_table_hire', 'decor_hire', 'sound_pa_hire',
  'jumping_castle_hire', 'catering_equipment_hire', 'cold_room_hire', 'mobile_toilet_hire',
  'generator_hire', 'water_bowser_hire',
  'van_hire', 'bakkie_hire', 'furniture_removal', 'last_mile_delivery', 'livestock_transport',
  'security_guard_hire',
])

const MIN_HIRE_PHOTOS = 3

// For each hire service, pull the first select question's options as item variants
function getHireItemOptions(serviceId: string): { label: string; value: string }[] {
  const svc = SERVICES.find(s => s.id === serviceId)
  if (!svc) return []
  const firstSelect = svc.questions.find(q => q.type === 'select' && q.key !== 'urgency')
  return firstSelect?.options?.map(o => ({ label: o.label, value: o.value })) ?? []
}

// ─── Required documents ───────────────────────────────────────────────────────
const DOCS: { key: DocType; label: string; sub: string; accept: 'image' | 'pdf'; optional?: boolean }[] = [
  { key: 'id',          label: 'SA ID / Passport',        sub: 'Photo of your ID document',               accept: 'image' },
  { key: 'company_reg', label: 'Company registration',     sub: 'CIPC certificate (PDF or photo)',         accept: 'pdf'   },
  { key: 'bank_letter', label: 'Bank confirmation letter', sub: 'Bank letterhead, within 3 months',        accept: 'pdf'   },
  { key: 'trade_cert',  label: 'Trade certificate',        sub: 'Optional · unlocks trade job categories', accept: 'pdf', optional: true },
]

// ─── Skills catalogue ─────────────────────────────────────────────────────────
type SkillCategory = { label: string; skills: { id: string; label: string; emoji: string }[] }

const SKILL_CATEGORIES: SkillCategory[] = [
  {
    label: 'Home Services',
    skills: [
      { id: 'plumbing',       label: 'Plumbing',         emoji: '💧' },
      { id: 'electrical',     label: 'Electrical',       emoji: '⚡' },
      { id: 'cleaning',       label: 'Cleaning',         emoji: '🧹' },
      { id: 'hvac',           label: 'AC & HVAC',        emoji: '❄️' },
      { id: 'gas',            label: 'Gas',              emoji: '🔥' },
      { id: 'handyman',       label: 'Handyman',         emoji: '🔧' },
      { id: 'tiling',         label: 'Tiling',           emoji: '🪟' },
      { id: 'painting',       label: 'Painting',         emoji: '🎨' },
      { id: 'landscaping',    label: 'Landscaping',      emoji: '🌿' },
      { id: 'pool',           label: 'Pool',             emoji: '🏊' },
      { id: 'pest_control',   label: 'Pest Control',     emoji: '🐜' },
      { id: 'locksmith',      label: 'Locksmith',        emoji: '🔑' },
      { id: 'carpentry',      label: 'Carpentry',        emoji: '🪚' },
      { id: 'solar',          label: 'Solar',            emoji: '☀️' },
      { id: 'security',       label: 'Security Systems', emoji: '📷' },
      { id: 'paving',         label: 'Paving',           emoji: '🛤️' },
      { id: 'waterproofing',  label: 'Waterproofing',    emoji: '💦' },
      { id: 'roofing',        label: 'Roofing',          emoji: '🏠' },
      { id: 'gate_motor',     label: 'Gate & Garage',    emoji: '🚪' },
      { id: 'moving',         label: 'Moving',           emoji: '📦' },
      { id: 'bricklaying',    label: 'Bricklaying',      emoji: '🧱' },
      { id: 'borehole',       label: 'Borehole',         emoji: '🌊' },
      { id: 'septic_tank',    label: 'Septic Tank',      emoji: '🚽' },
      { id: 'dstv',           label: 'DSTV / Satellite', emoji: '📡' },
    ],
  },
  {
    label: 'Event Hire',
    skills: [
      { id: 'tent_hire',               label: 'Tent Hire',          emoji: '⛺' },
      { id: 'chair_table_hire',        label: 'Chairs & Tables',    emoji: '🪑' },
      { id: 'decor_hire',              label: 'Décor Hire',         emoji: '🌸' },
      { id: 'sound_pa_hire',           label: 'Sound / PA',         emoji: '🔊' },
      { id: 'jumping_castle_hire',     label: 'Jumping Castle',     emoji: '🏰' },
      { id: 'catering_equipment_hire', label: 'Catering Equipment', emoji: '🍳' },
      { id: 'cold_room_hire',          label: 'Cold Room',          emoji: '🧊' },
      { id: 'mobile_toilet_hire',      label: 'Mobile Toilets',     emoji: '🚻' },
    ],
  },
  {
    label: 'Plant & Equipment',
    skills: [
      { id: 'generator_hire',    label: 'Generator Hire', emoji: '⚡' },
      { id: 'water_bowser_hire', label: 'Water Bowser',   emoji: '🚰' },
    ],
  },
  {
    label: 'Transport & Logistics',
    skills: [
      { id: 'van_hire',           label: 'Van Hire',            emoji: '🚐' },
      { id: 'bakkie_hire',        label: 'Bakkie Hire',         emoji: '🛻' },
      { id: 'furniture_removal',  label: 'Furniture Removal',   emoji: '🛋️' },
      { id: 'last_mile_delivery', label: 'Last-Mile Delivery',  emoji: '📬' },
      { id: 'livestock_transport',label: 'Livestock Transport', emoji: '🐄' },
    ],
  },
  {
    label: 'Security',
    skills: [
      { id: 'security_guard_hire', label: 'Security Guard', emoji: '💂' },
    ],
  },
]

// ─── Sub-component: inventory picker for one hire service ─────────────────────
function HireServiceInventory({
  serviceId,
  label,
  emoji,
  inventory,
  onQtyChange,
  onAvailChange,
}: {
  serviceId:     string
  label:         string
  emoji:         string
  inventory:     Record<string, HireItem>
  onQtyChange:   (serviceId: string, optionValue: string, qty: number) => void
  onAvailChange: (serviceId: string, optionValue: string, available: boolean) => void
}) {
  const options = getHireItemOptions(serviceId)
  if (options.length === 0) return null

  const totalQty       = Object.values(inventory).reduce((s, item) => s + item.qty, 0)
  const availableQty   = Object.values(inventory).filter(item => item.available).reduce((s, item) => s + item.qty, 0)
  const unavailableQty = totalQty - availableQty

  return (
    <View style={inv.card}>
      {/* Card header */}
      <View style={inv.cardHeader}>
        <Text style={inv.cardEmoji}>{emoji}</Text>
        <Text style={inv.cardTitle}>{label}</Text>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {availableQty > 0 && (
            <View style={inv.availBadge}>
              <Text style={inv.availBadgeText}>{availableQty} available</Text>
            </View>
          )}
          {unavailableQty > 0 && (
            <View style={inv.unavailBadge}>
              <Text style={inv.unavailBadgeText}>{unavailableQty} off</Text>
            </View>
          )}
        </View>
      </View>

      {options.map((opt, i) => {
        const item    = inventory[opt.value]
        const checked = !!item && item.qty > 0
        const qty     = item?.qty ?? 0
        const avail   = item?.available ?? true

        return (
          <View key={opt.value} style={[inv.row, i < options.length - 1 && inv.rowBorder, !avail && checked && inv.rowUnavail]}>
            {/* Checkbox — add / remove item */}
            <TouchableOpacity
              style={[inv.checkbox, checked && (avail ? inv.checkboxChecked : inv.checkboxUnavail)]}
              onPress={() => onQtyChange(serviceId, opt.value, checked ? 0 : 1)}
            >
              {checked && <Text style={inv.checkmark}>✓</Text>}
            </TouchableOpacity>

            {/* Label */}
            <View style={{ flex: 1 }}>
              <Text style={[inv.optLabel, checked && inv.optLabelChecked, checked && !avail && inv.optLabelUnavail]} numberOfLines={1}>
                {opt.label}
              </Text>
              {checked && !avail && (
                <Text style={inv.unavailHint}>Not available for bookings</Text>
              )}
            </View>

            {/* Quantity stepper — visible when checked */}
            {checked && (
              <View style={[inv.stepper, !avail && inv.stepperUnavail]}>
                <TouchableOpacity
                  style={[inv.stepBtn, qty <= 1 && inv.stepBtnDisabled]}
                  onPress={() => onQtyChange(serviceId, opt.value, Math.max(1, qty - 1))}
                  disabled={qty <= 1}
                >
                  <Text style={inv.stepBtnText}>−</Text>
                </TouchableOpacity>
                <Text style={inv.stepQty}>{qty}</Text>
                <TouchableOpacity
                  style={inv.stepBtn}
                  onPress={() => onQtyChange(serviceId, opt.value, qty + 1)}
                >
                  <Text style={inv.stepBtnText}>+</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Availability toggle — visible when checked */}
            {checked && (
              <TouchableOpacity
                style={[inv.toggle, !avail && inv.toggleOff]}
                onPress={() => onAvailChange(serviceId, opt.value, !avail)}
                activeOpacity={0.8}
              >
                <View style={[inv.toggleThumb, !avail && inv.toggleThumbOff]} />
              </TouchableOpacity>
            )}
          </View>
        )
      })}
    </View>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function ProviderOnboarding() {
  const { user } = useAuth()
  const [skills, setSkills] = useState<string[]>([])
  const [avail,  setAvail]  = useState({ monFri: true, sat: true, sun: false, emergency: true })
  const [docs,   setDocs]   = useState<Record<DocType, DocStatus>>({
    id:          { uploaded: false, uploading: false, fileName: null, fileUrl: null },
    company_reg: { uploaded: false, uploading: false, fileName: null, fileUrl: null },
    bank_letter: { uploaded: false, uploading: false, fileName: null, fileUrl: null },
    trade_cert:  { uploaded: false, uploading: false, fileName: null, fileUrl: null },
  })
  const [hireInventory, setHireInventory] = useState<HireInventory>({})
  const [hirePhotos,    setHirePhotos]    = useState<HirePhoto[]>([])
  const [savingInventory, setSavingInventory] = useState(false)

  // Debounce inventory save
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Load existing data
  useEffect(() => {
    if (!user) return
    api.providers.getDocuments(user.id).then((existing: any[]) => {
      const photoEntries: HirePhoto[] = []
      existing.forEach(doc => {
        if (doc.type === 'hire_photo') {
          photoEntries.push({ uploading: false, fileName: doc.fileName, fileUrl: doc.fileUrl })
        } else if (doc.type in docs) {
          setDocs(prev => ({
            ...prev,
            [doc.type]: { uploaded: true, uploading: false, fileName: doc.fileName, fileUrl: doc.fileUrl },
          }))
        }
      })
      if (photoEntries.length > 0) setHirePhotos(photoEntries)
    }).catch(() => {})

    api.providers.getHireInventory(user.id)
      .then((raw: any) => {
        if (!raw || Object.keys(raw).length === 0) return
        // Normalise: values may be plain numbers (old format) or {qty,available} objects
        const normalised: HireInventory = {}
        for (const svcId of Object.keys(raw)) {
          normalised[svcId] = {}
          for (const optVal of Object.keys(raw[svcId])) {
            normalised[svcId][optVal] = parseItem(raw[svcId][optVal])
          }
        }
        setHireInventory(normalised)
      })
      .catch(() => {})
  }, [user])

  const toggleSkill = (id: string) =>
    setSkills(p => p.includes(id) ? p.filter(s => s !== id) : [...p, id])

  const setUploading = (key: DocType, uploading: boolean) =>
    setDocs(prev => ({ ...prev, [key]: { ...prev[key], uploading } }))

  // ─── Debounced save helper ───────────────────────────────────────────────────
  const scheduleSave = useCallback((updated: HireInventory) => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    if (!user) return
    saveTimer.current = setTimeout(async () => {
      setSavingInventory(true)
      try { await api.providers.updateHireInventory(user.id, updated as any) }
      catch {}
      finally { setSavingInventory(false) }
    }, 800)
  }, [user])

  // ─── Qty change ──────────────────────────────────────────────────────────────
  const handleInventoryChange = useCallback((serviceId: string, optionValue: string, qty: number) => {
    setHireInventory(prev => {
      const existing = prev[serviceId]?.[optionValue]
      const updated: HireInventory = {
        ...prev,
        [serviceId]: {
          ...(prev[serviceId] ?? {}),
          [optionValue]: { qty, available: existing?.available ?? true },
        },
      }
      if (qty === 0) {
        delete updated[serviceId][optionValue]
        if (Object.keys(updated[serviceId]).length === 0) delete updated[serviceId]
      }
      scheduleSave(updated)
      return updated
    })
  }, [scheduleSave])

  // ─── Availability toggle ─────────────────────────────────────────────────────
  const handleAvailabilityChange = useCallback((serviceId: string, optionValue: string, available: boolean) => {
    setHireInventory(prev => {
      const existing = prev[serviceId]?.[optionValue]
      if (!existing) return prev
      const updated: HireInventory = {
        ...prev,
        [serviceId]: {
          ...(prev[serviceId] ?? {}),
          [optionValue]: { ...existing, available },
        },
      }
      scheduleSave(updated)
      return updated
    })
  }, [scheduleSave])

  // ─── Document upload ────────────────────────────────────────────────────────
  const pickAndUpload = async (docDef: typeof DOCS[0]) => {
    if (!user) return
    const { key, accept } = docDef
    try {
      setUploading(key, true)
      let uri: string, fileName: string, mimeType: string

      if (accept === 'image') {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync()
        if (!perm.granted) {
          Alert.alert('Permission needed', 'Allow photo access to upload your ID.')
          setUploading(key, false); return
        }
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          quality: 0.8, allowsEditing: true,
        })
        if (result.canceled) { setUploading(key, false); return }
        const asset = result.assets[0]
        uri = asset.uri; fileName = asset.fileName ?? `${key}_${Date.now()}.jpg`; mimeType = asset.mimeType ?? 'image/jpeg'
      } else {
        const result = await DocumentPicker.getDocumentAsync({
          type: ['application/pdf', 'image/*'], copyToCacheDirectory: true,
        })
        if (result.canceled) { setUploading(key, false); return }
        const asset = result.assets[0]
        uri = asset.uri; fileName = asset.name; mimeType = asset.mimeType ?? 'application/pdf'
      }

      const { url } = await uploadToCloudinary(uri, fileName, mimeType)
      await api.providers.saveDocument(user.id, key, fileName, url)
      setDocs(prev => ({ ...prev, [key]: { uploaded: true, uploading: false, fileName, fileUrl: url } }))
    } catch {
      Alert.alert('Upload failed', 'Please check your connection and try again.')
      setUploading(key, false)
    }
  }

  // ─── Hire photo upload ──────────────────────────────────────────────────────
  const addHirePhoto = async () => {
    if (!user) return
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Allow photo access to upload inventory photos.')
      return
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85, allowsEditing: true, aspect: [4, 3],
    })
    if (result.canceled) return

    const asset = result.assets[0]
    const idx = hirePhotos.length
    setHirePhotos(prev => [...prev, { uploading: true, fileName: null, fileUrl: null, localUri: asset.uri }])

    try {
      const fileName = asset.fileName ?? `hire_photo_${Date.now()}.jpg`
      const mimeType = asset.mimeType ?? 'image/jpeg'
      const { url } = await uploadToCloudinary(asset.uri, fileName, mimeType)
      await api.providers.saveDocument(user.id, 'hire_photo' as any, fileName, url)
      setHirePhotos(prev => prev.map((p, i) =>
        i === idx ? { uploading: false, fileName, fileUrl: url, localUri: asset.uri } : p
      ))
    } catch {
      Alert.alert('Upload failed', 'Please check your connection and try again.')
      setHirePhotos(prev => prev.filter((_, i) => i !== idx))
    }
  }

  const removeHirePhoto = (idx: number) => {
    Alert.alert('Remove photo', 'Remove this inventory photo?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => setHirePhotos(prev => prev.filter((_, i) => i !== idx)) },
    ])
  }

  // ─── Derived state ────────────────────────────────────────────────────────
  const isHireProvider   = skills.some(s => HIRE_SERVICE_IDS.has(s))
  const selectedHireSvcs = skills.filter(s => HIRE_SERVICE_IDS.has(s))
  const uploadedPhotos   = hirePhotos.filter(p => !p.uploading && p.fileUrl)
  const totalInventoryUnits = Object.values(hireInventory).reduce(
    (sum, items) => sum + Object.values(items).reduce((s, item) => s + item.qty, 0), 0
  )
  const requiredDocs     = DOCS.filter(d => !d.optional)
  const uploadedDocCount = requiredDocs.filter(d => docs[d.key].uploaded).length
  const allDocsUploaded  = uploadedDocCount === requiredDocs.length
  const hirePhotosOk     = !isHireProvider || uploadedPhotos.length >= MIN_HIRE_PHOTOS
  const hasTradeCert     = docs.trade_cert.uploaded
  const isComplete       = allDocsUploaded && hirePhotosOk

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <View style={s.progressDots}>
          {[0, 1, 2].map(i => (
            <View key={i} style={[s.dot, i < uploadedDocCount && s.dotDone, i === uploadedDocCount && s.dotActive]} />
          ))}
        </View>
        <Text style={s.step}>KYC Verification · {uploadedDocCount}/3 documents</Text>
        <Text style={s.title}>Verify your identity</Text>
        <Text style={s.sub}>Upload documents to start earning</Text>
      </View>

      <ScrollView style={s.body} showsVerticalScrollIndicator={false}>

        {/* ── Required documents ─────────────────────────────────────── */}
        <Text style={s.sectionLabel}>Required documents</Text>
        {DOCS.filter(d => !d.optional).map(doc => {
          const d = docs[doc.key]
          return (
            <TouchableOpacity
              key={doc.key}
              style={[s.uploadBox, d.uploaded && s.uploadDone]}
              onPress={() => pickAndUpload(doc)}
              disabled={d.uploading}
            >
              {d.uploading
                ? <ActivityIndicator color={colors.accent} style={{ width: 32 }} />
                : <Text style={s.uploadEmoji}>{d.uploaded ? '✅' : '📁'}</Text>}
              <View style={{ flex: 1 }}>
                <Text style={[s.uploadLabel, d.uploaded && s.uploadLabelDone]}>{doc.label}</Text>
                <Text style={[s.uploadSub, d.uploaded && s.uploadSubDone]}>
                  {d.uploading ? 'Uploading…' : d.uploaded ? `✓ ${d.fileName}` : doc.sub}
                </Text>
              </View>
              {!d.uploaded && !d.uploading && <Text style={s.uploadArrow}>›</Text>}
            </TouchableOpacity>
          )
        })}

        {/* ── Trade certificate (optional) ───────────────────────────── */}
        <Text style={[s.sectionLabel, { marginTop: 8 }]}>Optional documents</Text>
        {!hasTradeCert && (
          <View style={s.tradeBanner}>
            <Text style={s.tradeBannerText}>
              🔧 Without a trade certificate you qualify for <Text style={{ fontWeight: '700' }}>Handyman</Text>, <Text style={{ fontWeight: '700' }}>Cleaning</Text> and all <Text style={{ fontWeight: '700' }}>hire services</Text>.
              Upload your certificate to also unlock Plumbing, Electrical, Gas, HVAC and more.
            </Text>
          </View>
        )}
        {DOCS.filter(d => d.optional).map(doc => {
          const d = docs[doc.key]
          return (
            <TouchableOpacity
              key={doc.key}
              style={[s.uploadBox, s.uploadBoxOptional, d.uploaded && s.uploadDone]}
              onPress={() => pickAndUpload(doc)}
              disabled={d.uploading}
            >
              {d.uploading
                ? <ActivityIndicator color={colors.accent} style={{ width: 32 }} />
                : <Text style={s.uploadEmoji}>{d.uploaded ? '✅' : '📄'}</Text>}
              <View style={{ flex: 1 }}>
                <View style={s.optionalRow}>
                  <Text style={[s.uploadLabel, d.uploaded && s.uploadLabelDone]}>{doc.label}</Text>
                  <View style={s.optionalBadge}><Text style={s.optionalBadgeText}>Optional</Text></View>
                </View>
                <Text style={[s.uploadSub, d.uploaded && s.uploadSubDone]}>
                  {d.uploading ? 'Uploading…' : d.uploaded ? `✓ ${d.fileName}` : doc.sub}
                </Text>
              </View>
              {!d.uploaded && !d.uploading && <Text style={s.uploadArrow}>›</Text>}
            </TouchableOpacity>
          )
        })}

        {/* ── Skills ─────────────────────────────────────────────────── */}
        <Text style={[s.sectionLabel, { marginTop: 8 }]}>Your skills & services</Text>
        <Text style={s.skillsHint}>Select everything you offer — hire services are available without a trade certificate</Text>

        {SKILL_CATEGORIES.map(cat => (
          <View key={cat.label} style={{ marginBottom: 12 }}>
            <View style={s.catRow}>
              <Text style={s.catLabel}>{cat.label}</Text>
              {cat.skills.some(sk => HIRE_SERVICE_IDS.has(sk.id)) && (
                <View style={s.hireBadge}><Text style={s.hireBadgeText}>No cert needed</Text></View>
              )}
            </View>
            <View style={s.skillGrid}>
              {cat.skills.map(sk => {
                const sel    = skills.includes(sk.id)
                const isHire = HIRE_SERVICE_IDS.has(sk.id)
                return (
                  <TouchableOpacity
                    key={sk.id}
                    style={[s.skillChip, sel && s.skillChipSel, isHire && sel && s.skillChipHire]}
                    onPress={() => toggleSkill(sk.id)}
                  >
                    <Text style={{ fontSize: 15 }}>{sk.emoji}</Text>
                    <Text style={[s.skillLabel, sel && s.skillLabelSel]} numberOfLines={1}>{sk.label}</Text>
                  </TouchableOpacity>
                )
              })}
            </View>
          </View>
        ))}

        {/* ── Hire inventory — item picker ────────────────────────────── */}
        {isHireProvider && (
          <>
            <View style={s.inventoryHeaderRow}>
              <View>
                <Text style={s.sectionLabel}>Hire inventory</Text>
                <Text style={s.inventoryHint}>Tick each item type you own and set how many units you have</Text>
              </View>
              {savingInventory
                ? <ActivityIndicator size="small" color={colors.gold} />
                : totalInventoryUnits > 0
                  ? <Text style={s.inventorySaved}>✓ saved</Text>
                  : null}
            </View>

            {selectedHireSvcs.map(svcId => {
              const meta = SKILL_CATEGORIES
                .flatMap(c => c.skills)
                .find(sk => sk.id === svcId)
              if (!meta) return null
              return (
                <HireServiceInventory
                  key={svcId}
                  serviceId={svcId}
                  label={meta.label}
                  emoji={meta.emoji}
                  inventory={hireInventory[svcId] ?? {}}
                  onQtyChange={handleInventoryChange}
                  onAvailChange={handleAvailabilityChange}
                />
              )
            })}

            {/* ── Hire inventory photos ──────────────────────────────── */}
            <View style={s.photoHeaderRow}>
              <Text style={s.sectionLabel}>Inventory photos</Text>
              <View style={[s.hireBadge, { marginBottom: 10 }]}>
                <Text style={s.hireBadgeText}>Min {MIN_HIRE_PHOTOS} required</Text>
              </View>
            </View>
            <View style={s.hirePhotoBanner}>
              <Text style={s.hirePhotoBannerText}>
                📸 Upload at least <Text style={{ fontWeight: '700' }}>{MIN_HIRE_PHOTOS} clear photos</Text> of the items you have for hire.
                Clients see these when choosing a provider — good photos win more bookings.
              </Text>
            </View>

            <View style={s.photoGrid}>
              {hirePhotos.map((p, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={s.photoThumb}
                  onLongPress={() => !p.uploading && removeHirePhoto(idx)}
                  activeOpacity={0.85}
                >
                  {p.uploading ? (
                    <View style={s.photoThumbLoading}>
                      <ActivityIndicator color={colors.gold} />
                      <Text style={s.photoThumbLoadingText}>Uploading…</Text>
                    </View>
                  ) : (
                    <>
                      <Image source={{ uri: p.fileUrl ?? p.localUri ?? '' }} style={s.photoThumbImage} resizeMode="cover" />
                      <View style={s.photoThumbBadge}><Text style={s.photoThumbBadgeText}>✓</Text></View>
                    </>
                  )}
                </TouchableOpacity>
              ))}
              <TouchableOpacity style={s.photoAddBtn} onPress={addHirePhoto}>
                <Text style={s.photoAddIcon}>+</Text>
                <Text style={s.photoAddLabel}>Add photo</Text>
              </TouchableOpacity>
            </View>

            <Text style={s.photoHint}>
              {uploadedPhotos.length >= MIN_HIRE_PHOTOS
                ? `✅ ${uploadedPhotos.length} photo${uploadedPhotos.length !== 1 ? 's' : ''} uploaded — long-press to remove`
                : `${uploadedPhotos.length}/${MIN_HIRE_PHOTOS} photos — add ${MIN_HIRE_PHOTOS - uploadedPhotos.length} more to continue`}
            </Text>
          </>
        )}

        {/* ── Availability ────────────────────────────────────────────── */}
        <Text style={[s.sectionLabel, { marginTop: 8 }]}>Availability</Text>
        <View style={s.availCard}>
          {([
            { key: 'monFri',    label: 'Mon – Fri' },
            { key: 'sat',       label: 'Saturday' },
            { key: 'sun',       label: 'Sunday' },
            { key: 'emergency', label: 'Emergency callouts' },
          ] as { key: keyof typeof avail; label: string }[]).map((a, i) => (
            <View key={a.key} style={[s.availRow, i < 3 && s.availRowBorder]}>
              <Text style={s.availLabel}>{a.label}</Text>
              <TouchableOpacity
                style={[s.toggle, !avail[a.key] && s.toggleOff]}
                onPress={() => setAvail(p => ({ ...p, [a.key]: !p[a.key] }))}
              >
                <View style={[s.toggleThumb, !avail[a.key] && s.toggleThumbOff]} />
              </TouchableOpacity>
            </View>
          ))}
        </View>

        {/* ── Status banner ───────────────────────────────────────────── */}
        {isComplete ? (
          <View style={s.successBanner}>
            <Text style={s.successText}>✅ All documents submitted — under review within 24hrs</Text>
          </View>
        ) : (
          <View style={s.infoBanner}>
            <Text style={s.infoText}>
              {!allDocsUploaded
                ? `📋 Upload all 3 required documents to complete verification.`
                : `📸 Add ${MIN_HIRE_PHOTOS - uploadedPhotos.length} more hire inventory photo${MIN_HIRE_PHOTOS - uploadedPhotos.length !== 1 ? 's' : ''} to complete your profile.`}
            </Text>
          </View>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe:               { flex: 1, backgroundColor: colors.cream },
  header:             { backgroundColor: colors.navy, padding: 18, paddingBottom: 22 },
  step:               { fontSize: 9, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4, marginTop: 10 },
  title:              { fontSize: 20, fontWeight: '300', color: '#fff', marginBottom: 2 },
  sub:                { fontSize: 11, color: 'rgba(255,255,255,0.5)' },
  progressDots:       { flexDirection: 'row', gap: 5 },
  dot:                { flex: 1, height: 3, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.18)' },
  dotDone:            { backgroundColor: colors.accent },
  dotActive:          { backgroundColor: colors.gold },
  body:               { padding: 14 },
  sectionLabel:       { fontSize: 10, color: colors.textLight, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6, fontWeight: '500' },

  uploadBox:          { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1.5, borderColor: colors.creamMid, borderStyle: 'dashed', borderRadius: 12, padding: 14, marginBottom: 10, backgroundColor: '#fff' },
  uploadDone:         { borderColor: colors.accent, borderStyle: 'solid', backgroundColor: '#EAF5EE' },
  uploadEmoji:        { fontSize: 24, width: 32, textAlign: 'center' },
  uploadLabel:        { fontSize: 13, fontWeight: '600', color: colors.text },
  uploadLabelDone:    { color: '#1A5C38' },
  uploadSub:          { fontSize: 11, color: colors.textLight, marginTop: 2 },
  uploadSubDone:      { color: colors.accent },
  uploadArrow:        { fontSize: 18, color: colors.textLight },
  uploadBoxOptional:  { borderStyle: 'dashed', borderColor: colors.creamMid },
  optionalRow:        { flexDirection: 'row', alignItems: 'center', gap: 8 },
  optionalBadge:      { backgroundColor: colors.creamMid, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  optionalBadgeText:  { fontSize: 9, color: colors.textMuted, fontWeight: '600', textTransform: 'uppercase' },

  tradeBanner:        { backgroundColor: '#FFF3E0', borderRadius: 10, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: '#FFB74D40' },
  tradeBannerText:    { fontSize: 12, color: '#7C4A00', lineHeight: 18 },

  skillsHint:         { fontSize: 11, color: colors.textMuted, marginBottom: 12, marginTop: -2, lineHeight: 16 },
  catRow:             { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  catLabel:           { fontSize: 11, color: colors.textLight, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.8 },
  hireBadge:          { backgroundColor: '#FFF3CD', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2, borderWidth: 1, borderColor: '#F0C060' },
  hireBadgeText:      { fontSize: 9, color: '#92600A', fontWeight: '700', textTransform: 'uppercase' },
  skillGrid:          { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  skillChip:          { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: colors.creamMid, backgroundColor: '#fff', width: '47%' },
  skillChipSel:       { borderColor: colors.gold, backgroundColor: '#FFFBF0' },
  skillChipHire:      { borderColor: '#F0C060', backgroundColor: '#FFFBF0' },
  skillLabel:         { fontSize: 11, color: colors.textMuted, flex: 1 },
  skillLabelSel:      { color: colors.gold, fontWeight: '600' },

  inventoryHeaderRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginTop: 8, marginBottom: 4 },
  inventoryHint:      { fontSize: 11, color: colors.textMuted, marginBottom: 10, lineHeight: 16, marginTop: 2 },
  inventorySaved:     { fontSize: 11, color: colors.accent, fontWeight: '600', marginTop: 2 },

  photoHeaderRow:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  hirePhotoBanner:    { backgroundColor: '#FFF8EC', borderRadius: 10, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: '#F0C060' },
  hirePhotoBannerText:{ fontSize: 12, color: '#7C4A00', lineHeight: 18 },

  photoGrid:          { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  photoThumb:         { width: '30%', aspectRatio: 4 / 3, borderRadius: 10, overflow: 'hidden', backgroundColor: colors.creamMid },
  photoThumbImage:    { width: '100%', height: '100%' },
  photoThumbLoading:  { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4 },
  photoThumbLoadingText: { fontSize: 9, color: colors.textMuted },
  photoThumbBadge:    { position: 'absolute', top: 4, right: 4, backgroundColor: colors.accent, borderRadius: 10, width: 18, height: 18, alignItems: 'center', justifyContent: 'center' },
  photoThumbBadgeText:{ fontSize: 10, color: '#fff', fontWeight: '700' },
  photoAddBtn:        { width: '30%', aspectRatio: 4 / 3, borderRadius: 10, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.gold, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFBF0', gap: 2 },
  photoAddIcon:       { fontSize: 22, color: colors.gold, fontWeight: '300' },
  photoAddLabel:      { fontSize: 10, color: colors.gold, fontWeight: '600' },
  photoHint:          { fontSize: 11, color: colors.textMuted, marginBottom: 14, textAlign: 'center', lineHeight: 16 },

  availCard:          { backgroundColor: '#fff', borderRadius: 10, paddingHorizontal: 12, borderWidth: 1, borderColor: colors.creamMid, marginBottom: 14 },
  availRow:           { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12 },
  availRowBorder:     { borderBottomWidth: 1, borderBottomColor: colors.creamMid },
  availLabel:         { fontSize: 13, color: colors.text },
  toggle:             { width: 44, height: 26, borderRadius: 13, backgroundColor: colors.accent, padding: 3, justifyContent: 'center' },
  toggleOff:          { backgroundColor: colors.creamMid },
  toggleThumb:        { width: 20, height: 20, borderRadius: 10, backgroundColor: '#fff', alignSelf: 'flex-end' },
  toggleThumbOff:     { alignSelf: 'flex-start' },

  successBanner:      { backgroundColor: '#EAF5EE', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: colors.accent },
  successText:        { fontSize: 13, color: '#1A5C38', lineHeight: 20 },
  infoBanner:         { backgroundColor: '#FFF9EC', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: colors.gold + '40' },
  infoText:           { fontSize: 12, color: colors.textMuted, lineHeight: 18 },
})

// ─── Inventory card styles ────────────────────────────────────────────────────
const inv = StyleSheet.create({
  card:              { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: colors.creamMid, marginBottom: 10, overflow: 'hidden' },
  cardHeader:        { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 12, backgroundColor: '#FAFAFA', borderBottomWidth: 1, borderBottomColor: colors.creamMid },
  cardEmoji:         { fontSize: 18 },
  cardTitle:         { fontSize: 13, fontWeight: '600', color: colors.text, flex: 1 },
  availBadge:        { backgroundColor: '#D1FAE5', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  availBadgeText:    { fontSize: 11, color: '#065F46', fontWeight: '700' },
  unavailBadge:      { backgroundColor: '#FEE2E2', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  unavailBadgeText:  { fontSize: 11, color: '#991B1B', fontWeight: '700' },
  row:               { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 11 },
  rowBorder:         { borderBottomWidth: 1, borderBottomColor: colors.creamMid },
  rowUnavail:        { backgroundColor: '#FAFAFA' },
  checkbox:          { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: colors.creamMid, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  checkboxChecked:   { borderColor: colors.gold, backgroundColor: colors.gold },
  checkboxUnavail:   { borderColor: '#D1D5DB', backgroundColor: '#D1D5DB' },
  checkmark:         { fontSize: 13, color: '#fff', fontWeight: '700', lineHeight: 16 },
  optLabel:          { fontSize: 13, color: colors.textMuted },
  optLabelChecked:   { color: colors.text, fontWeight: '500' },
  optLabelUnavail:   { color: colors.textLight },
  unavailHint:       { fontSize: 10, color: '#EF4444', marginTop: 1 },
  stepper:           { flexDirection: 'row', alignItems: 'center', borderRadius: 8, borderWidth: 1, borderColor: colors.creamMid, overflow: 'hidden' },
  stepperUnavail:    { borderColor: '#E5E7EB', opacity: 0.55 },
  stepBtn:           { width: 30, height: 30, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FAFAFA' },
  stepBtnDisabled:   { opacity: 0.35 },
  stepBtnText:       { fontSize: 18, color: colors.text, fontWeight: '300', lineHeight: 22 },
  stepQty:           { width: 28, textAlign: 'center', fontSize: 13, fontWeight: '600', color: colors.text },
  // Availability toggle
  toggle:            { width: 40, height: 24, borderRadius: 12, backgroundColor: colors.accent, padding: 2, justifyContent: 'center', marginLeft: 4 },
  toggleOff:         { backgroundColor: '#D1D5DB' },
  toggleThumb:       { width: 20, height: 20, borderRadius: 10, backgroundColor: '#fff', alignSelf: 'flex-end' },
  toggleThumbOff:    { alignSelf: 'flex-start' },
})
