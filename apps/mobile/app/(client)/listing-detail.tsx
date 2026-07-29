import { useState, useEffect, useCallback } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, Alert, ActivityIndicator, FlatList, Dimensions, Modal, Linking,
} from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { router, useLocalSearchParams } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { colors } from '../../constants/theme'
import { api, Listing } from '../../lib/api'

const { width: SW } = Dimensions.get('window')

// Re-use the mock from market.tsx for offline dev
const MOCK_MAP: Record<string, Listing> = {
  m1: { id: 'm1', sellerId: 'u1', sellerName: 'Priya N.', sellerPhone: '0821234567', sellerAvatar: null, category: 'goods', subcategory: 'furniture', title: 'Queen bed + mattress', description: '3-year-old queen bed with Sealy mattress. Moving out, must sell. Collection only.\n\nDimensions: 160cm × 200cm\nFrame: Solid pine\nMattress: Sealy Posturepedic, medium firm', price: 3500, priceLabel: 'R 3 500', condition: 'good', images: [], city: 'Durban', suburb: 'Glenwood', views: 142, saved: false, urgent: true, createdAt: new Date(Date.now() - 2 * 86400000).toISOString() },
  m2: { id: 'm2', sellerId: 'u2', sellerName: 'James K.', sellerPhone: '0831234567', sellerAvatar: null, category: 'goods', subcategory: 'electronics', title: 'Samsung 55" Smart TV', description: 'Samsung 4K UHD smart TV, 2022 model. Remote + stand included. Minor scratch on frame.\n\nModel: Samsung UA55AU7000\nResolution: 4K UHD\nYear: 2022', price: 7500, priceLabel: 'R 7 500', condition: 'good', images: [], city: 'Durban', suburb: 'Musgrave', views: 89, saved: false, urgent: false, createdAt: new Date(Date.now() - 86400000).toISOString() },
  m3: { id: 'm3', sellerId: 'u3', sellerName: 'Sipho M.', sellerPhone: '0791234567', sellerAvatar: null, category: 'property', subcategory: 'room_to_rent', title: 'Furnished room — Berea', description: 'Private furnished room in secure complex. Wifi, water & lights included. Available immediately.\n\n• Queen bed, wardrobe, desk\n• Shared kitchen and bathroom\n• Free wifi\n• Street parking', price: 4200, priceLabel: 'R 4 200 / mo', condition: null, images: [], city: 'Durban', suburb: 'Berea', views: 233, saved: false, urgent: false, createdAt: new Date(Date.now() - 3 * 86400000).toISOString() },
  m4: { id: 'm4', sellerId: 'u4', sellerName: 'Fatima R.', sellerPhone: '0611234567', sellerAvatar: null, category: 'jobs', subcategory: 'domestic', title: 'Domestic worker needed — Umhlanga', description: '2× per week, 8am–4pm. Own transport preferred. R2 500/mo + transport allowance.\n\nDuties:\n• General cleaning\n• Laundry + ironing\n• Light cooking\n\nRef checks required.', price: 2500, priceLabel: 'R 2 500 / mo', condition: null, images: [], city: 'Durban', suburb: 'Umhlanga', views: 58, saved: false, urgent: false, createdAt: new Date(Date.now() - 5 * 86400000).toISOString() },
}

const CONDITION_LABEL: Record<string, string> = {
  new: '✨ Brand new', like_new: '💎 Like new', good: '👍 Good', fair: '⚠️ Fair', for_parts: '🔩 For parts',
}

function timeAgo(iso: string) {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
  if (d === 0) return 'Today'
  if (d === 1) return 'Yesterday'
  return `${d} days ago`
}

export default function ListingDetailScreen() {
  const { id }   = useLocalSearchParams<{ id: string }>()
  const insets   = useSafeAreaInsets()
  const [listing,  setListing]  = useState<Listing | null>(null)
  const [loading,  setLoading]  = useState(true)
  const [saved,    setSaved]    = useState(false)
  const [imgIdx,   setImgIdx]   = useState(0)
  const [lightbox, setLightbox] = useState(false)

  const load = useCallback(async () => {
    if (!id) return
    try {
      const l = await api.listings.get(id)
      setListing(l)
      setSaved(l.saved)
    } catch {
      // Fall back to mock
      const m = MOCK_MAP[id]
      if (m) { setListing(m); setSaved(m.saved) }
    } finally { setLoading(false) }
  }, [id])

  useEffect(() => { load() }, [load])

  const toggleSave = async () => {
    if (!listing) return
    setSaved(s => !s)
    try { await api.listings.save(listing.id) } catch { setSaved(s => !s) }
  }

  const handleCall = () => {
    if (!listing?.sellerPhone) return
    Linking.openURL(`tel:${listing.sellerPhone}`)
  }

  const handleWhatsApp = () => {
    if (!listing?.sellerPhone) return
    const phone = listing.sellerPhone.replace(/^0/, '27').replace(/\D/g, '')
    const msg   = encodeURIComponent(`Hi, I saw your listing on Easyfix Marketplace: "${listing.title}"`)
    Linking.openURL(`https://wa.me/${phone}?text=${msg}`)
  }

  if (loading) return (
    <SafeAreaView style={s.safe}>
      <View style={s.center}><ActivityIndicator color={colors.gold} /></View>
    </SafeAreaView>
  )

  if (!listing) return (
    <SafeAreaView style={s.safe}>
      <View style={s.center}><Text style={s.errorText}>Listing not found</Text></View>
    </SafeAreaView>
  )

  const hasImages = listing.images.length > 0

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      {/* Floating header */}
      <View style={[s.floatHeader, { top: insets.top + 8 }]}>
        <TouchableOpacity style={s.floatBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={colors.black} />
        </TouchableOpacity>
        <TouchableOpacity style={[s.floatBtn, saved && s.floatBtnSaved]} onPress={toggleSave}>
          <Ionicons name={saved ? 'heart' : 'heart-outline'} size={20} color={saved ? colors.red : colors.black} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Image carousel */}
        <View style={s.imgWrap}>
          {hasImages ? (
            <>
              <FlatList
                data={listing.images}
                horizontal pagingEnabled
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={e => setImgIdx(Math.round(e.nativeEvent.contentOffset.x / SW))}
                keyExtractor={(_, i) => String(i)}
                renderItem={({ item }) => (
                  <TouchableOpacity activeOpacity={0.9} onPress={() => setLightbox(true)}>
                    <Image source={{ uri: item }} style={{ width: SW, height: 280 }} resizeMode="cover" />
                  </TouchableOpacity>
                )}
              />
              {listing.images.length > 1 && (
                <View style={s.dots}>
                  {listing.images.map((_, i) => (
                    <View key={i} style={[s.dot, i === imgIdx && s.dotActive]} />
                  ))}
                </View>
              )}
              <View style={s.imgCount}>
                <Text style={s.imgCountText}>{imgIdx + 1} / {listing.images.length}</Text>
              </View>
            </>
          ) : (
            <View style={s.imgPlaceholder}>
              <Text style={s.imgPlaceholderEmoji}>
                {listing.category === 'property' ? '🏠' : listing.category === 'jobs' ? '💼' : '📦'}
              </Text>
              <Text style={s.imgPlaceholderText}>No photos added</Text>
            </View>
          )}
        </View>

        {/* Main info */}
        <View style={s.body}>
          {listing.urgent && (
            <View style={s.urgentRow}>
              <View style={s.urgentBadge}><Text style={s.urgentText}>URGENT</Text></View>
            </View>
          )}

          <View style={s.priceRow}>
            <Text style={s.price}>{listing.priceLabel}</Text>
            <View style={s.viewsRow}>
              <Ionicons name="eye-outline" size={12} color={colors.gray400} />
              <Text style={s.viewsText}>{listing.views} views</Text>
            </View>
          </View>

          <Text style={s.title}>{listing.title}</Text>

          <View style={s.metaRow}>
            <View style={s.metaChip}>
              <Ionicons name="location-outline" size={12} color={colors.gray600} />
              <Text style={s.metaChipText}>{listing.suburb}, {listing.city}</Text>
            </View>
            {listing.condition && (
              <View style={s.metaChip}>
                <Text style={s.metaChipText}>{CONDITION_LABEL[listing.condition]}</Text>
              </View>
            )}
            <View style={s.metaChip}>
              <Ionicons name="time-outline" size={12} color={colors.gray600} />
              <Text style={s.metaChipText}>{timeAgo(listing.createdAt)}</Text>
            </View>
          </View>

          {/* Description */}
          <View style={s.card}>
            <Text style={s.cardLabel}>DESCRIPTION</Text>
            <Text style={s.description}>{listing.description}</Text>
          </View>

          {/* Seller */}
          <View style={s.card}>
            <Text style={s.cardLabel}>SELLER</Text>
            <View style={s.sellerRow}>
              <View style={s.avatar}>
                {listing.sellerAvatar
                  ? <Image source={{ uri: listing.sellerAvatar }} style={s.avatarImg} />
                  : <Text style={s.avatarInitial}>{listing.sellerName[0]}</Text>
                }
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.sellerName}>{listing.sellerName}</Text>
                <Text style={s.sellerSub}>Member · Durban</Text>
              </View>
            </View>
          </View>

          {/* Safety tip */}
          <View style={s.safetyCard}>
            <Ionicons name="shield-checkmark-outline" size={16} color={colors.amber} />
            <Text style={s.safetyText}>
              Never pay in advance. Meet in a safe public place. Verify the item before payment.
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Sticky contact bar */}
      <View style={s.contactBar}>
        <TouchableOpacity style={s.waBtn} onPress={handleWhatsApp}>
          <Ionicons name="logo-whatsapp" size={20} color={colors.white} />
          <Text style={s.waBtnText}>WhatsApp</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.callBtn} onPress={handleCall}>
          <Ionicons name="call-outline" size={20} color={colors.white} />
          <Text style={s.callBtnText}>Call</Text>
        </TouchableOpacity>
      </View>

      {/* Lightbox */}
      <Modal visible={lightbox} transparent animationType="fade" onRequestClose={() => setLightbox(false)}>
        <View style={s.lightbox}>
          <TouchableOpacity style={s.lbClose} onPress={() => setLightbox(false)}>
            <Ionicons name="close" size={26} color={colors.white} />
          </TouchableOpacity>
          <Image source={{ uri: listing.images[imgIdx] }} style={s.lbImg} resizeMode="contain" />
        </View>
      </Modal>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe:                { flex: 1, backgroundColor: colors.white },
  center:              { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText:           { fontSize: 15, color: colors.gray400 },

  floatHeader:         { position: 'absolute', left: 0, right: 0, zIndex: 10, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16 },
  floatBtn:            { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.92)', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
  floatBtnSaved:       { backgroundColor: '#FEF2F2' },

  imgWrap:             { width: SW, height: 280, backgroundColor: colors.gray100 },
  imgPlaceholder:      { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  imgPlaceholderEmoji: { fontSize: 56 },
  imgPlaceholderText:  { fontSize: 13, color: colors.gray400 },
  dots:                { position: 'absolute', bottom: 12, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 5 },
  dot:                 { width: 5, height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.5)' },
  dotActive:           { backgroundColor: colors.white, width: 14 },
  imgCount:            { position: 'absolute', bottom: 12, right: 14, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  imgCountText:        { fontSize: 11, color: colors.white, fontWeight: '600' },

  body:                { padding: 16 },

  urgentRow:           { marginBottom: 10 },
  urgentBadge:         { alignSelf: 'flex-start', backgroundColor: colors.red, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 },
  urgentText:          { fontSize: 10, fontWeight: '800', color: colors.white, letterSpacing: 0.5 },

  priceRow:            { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  price:               { fontSize: 26, fontWeight: '800', color: colors.black, letterSpacing: -0.5 },
  viewsRow:            { flexDirection: 'row', alignItems: 'center', gap: 4 },
  viewsText:           { fontSize: 11, color: colors.gray400 },

  title:               { fontSize: 18, fontWeight: '700', color: colors.black, marginBottom: 12, lineHeight: 24 },

  metaRow:             { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  metaChip:            { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.gray100, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 6 },
  metaChipText:        { fontSize: 11, color: colors.gray600, fontWeight: '500' },

  card:                { backgroundColor: colors.gray50, borderRadius: 14, padding: 16, marginBottom: 16 },
  cardLabel:           { fontSize: 10, fontWeight: '700', color: colors.gray400, letterSpacing: 0.8, marginBottom: 12 },
  description:         { fontSize: 14, color: colors.black, lineHeight: 22 },

  sellerRow:           { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar:              { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.black, alignItems: 'center', justifyContent: 'center' },
  avatarImg:           { width: 44, height: 44, borderRadius: 22 },
  avatarInitial:       { fontSize: 16, fontWeight: '700', color: colors.gold },
  sellerName:          { fontSize: 14, fontWeight: '700', color: colors.black },
  sellerSub:           { fontSize: 11, color: colors.gray400, marginTop: 2 },

  safetyCard:          { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: colors.amberBg, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: colors.amber + '30' },
  safetyText:          { flex: 1, fontSize: 12, color: colors.amber, lineHeight: 18 },

  contactBar:          { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', gap: 10, padding: 16, paddingBottom: 32, backgroundColor: colors.white, borderTopWidth: 1, borderTopColor: colors.gray100 },
  waBtn:               { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#25D366', borderRadius: 14, paddingVertical: 14 },
  waBtnText:           { fontSize: 15, fontWeight: '700', color: colors.white },
  callBtn:             { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.black, borderRadius: 14, paddingVertical: 14 },
  callBtnText:         { fontSize: 15, fontWeight: '700', color: colors.white },

  lightbox:            { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', alignItems: 'center', justifyContent: 'center' },
  lbClose:             { position: 'absolute', top: 56, right: 20, padding: 8 },
  lbImg:               { width: '100%', height: '70%' },
})
