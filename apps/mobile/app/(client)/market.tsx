import { useState, useEffect, useCallback, useRef } from 'react'
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, ScrollView, Image, RefreshControl, Keyboard,
  Dimensions, ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { colors } from '../../constants/theme'
import { api, Listing, ListingCategory } from '../../lib/api'

const { width: SW } = Dimensions.get('window')
const CARD_W = (SW - 48) / 2

// ─── Category config ─────────────────────────────────────────────────────────
type Cat = { id: ListingCategory | 'all'; label: string; emoji: string }
const CATS: Cat[] = [
  { id: 'all',      label: 'All',      emoji: '🛒' },
  { id: 'goods',    label: 'Goods',    emoji: '📦' },
  { id: 'property', label: 'Property', emoji: '🏠' },
  { id: 'jobs',     label: 'Jobs',     emoji: '💼' },
]

// ─── Subcategory quick-filters ────────────────────────────────────────────────
const SUB_LABELS: Record<string, { label: string; emoji: string }[]> = {
  goods:    [
    { label: 'Furniture',   emoji: '🛋️' },
    { label: 'Electronics', emoji: '📱' },
    { label: 'Appliances',  emoji: '🧺' },
    { label: 'Tools',       emoji: '🔧' },
    { label: 'Clothing',    emoji: '👗' },
    { label: 'Vehicles',    emoji: '🚗' },
    { label: 'Garden',      emoji: '🌿' },
  ],
  property: [
    { label: 'Room to rent',     emoji: '🛏️' },
    { label: 'House to rent',    emoji: '🏡' },
    { label: 'Flat to rent',     emoji: '🏢' },
    { label: 'For sale',         emoji: '🏷️' },
  ],
  jobs: [
    { label: 'Full-time',   emoji: '💼' },
    { label: 'Part-time',   emoji: '🕐' },
    { label: 'Contract',    emoji: '📝' },
    { label: 'Freelance',   emoji: '💻' },
    { label: 'Domestic',    emoji: '🏠' },
  ],
}

// ─── Mock listings for offline dev ───────────────────────────────────────────
const MOCK: Listing[] = [
  {
    id: 'm1', sellerId: 'u1', sellerName: 'Priya N.', sellerPhone: '0821234567', sellerAvatar: null,
    category: 'goods', subcategory: 'furniture', title: 'Queen bed + mattress',
    description: '3-year-old queen bed with Sealy mattress. Moving out, must sell. Collection only.',
    price: 3500, priceLabel: 'R 3 500', condition: 'good',
    images: [], city: 'Durban', suburb: 'Glenwood', views: 142, saved: false, urgent: true,
    createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
  },
  {
    id: 'm2', sellerId: 'u2', sellerName: 'James K.', sellerPhone: '0831234567', sellerAvatar: null,
    category: 'goods', subcategory: 'electronics', title: 'Samsung 55" Smart TV',
    description: 'Samsung 4K UHD smart TV, 2022 model. Remote + stand included. Minor scratch on frame.',
    price: 7500, priceLabel: 'R 7 500', condition: 'good',
    images: [], city: 'Durban', suburb: 'Musgrave', views: 89, saved: false, urgent: false,
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 'm3', sellerId: 'u3', sellerName: 'Sipho M.', sellerPhone: '0791234567', sellerAvatar: null,
    category: 'property', subcategory: 'room_to_rent', title: 'Furnished room — Berea',
    description: 'Private furnished room in secure complex. Wifi, water & lights included. Available immediately.',
    price: 4200, priceLabel: 'R 4 200 / mo', condition: null,
    images: [], city: 'Durban', suburb: 'Berea', views: 233, saved: false, urgent: false,
    createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
  },
  {
    id: 'm4', sellerId: 'u4', sellerName: 'Fatima R.', sellerPhone: '0611234567', sellerAvatar: null,
    category: 'jobs', subcategory: 'domestic', title: 'Domestic worker needed — Umhlanga',
    description: '2× per week, 8am–4pm. Own transport preferred. R2 500/mo + transport allowance.',
    price: 2500, priceLabel: 'R 2 500 / mo', condition: null,
    images: [], city: 'Durban', suburb: 'Umhlanga', views: 58, saved: false, urgent: false,
    createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
  },
  {
    id: 'm5', sellerId: 'u5', sellerName: 'Kevin L.', sellerPhone: '0741234567', sellerAvatar: null,
    category: 'goods', subcategory: 'appliances', title: 'Bosch washing machine',
    description: '7kg front loader, fully working. 5 years old but immaculate. Reason for sale: upgrade.',
    price: 4800, priceLabel: 'R 4 800', condition: 'good',
    images: [], city: 'Durban', suburb: 'Westville', views: 71, saved: false, urgent: false,
    createdAt: new Date(Date.now() - 4 * 86400000).toISOString(),
  },
  {
    id: 'm6', sellerId: 'u6', sellerName: 'Anele T.', sellerPhone: '0651234567', sellerAvatar: null,
    category: 'property', subcategory: 'flat_to_rent', title: '1-bed flat — Point Waterfront',
    description: 'Modern 1-bedroom, sea views, secure parking, 24-hr security. Available 1 Aug.',
    price: 9500, priceLabel: 'R 9 500 / mo', condition: null,
    images: [], city: 'Durban', suburb: 'Point', views: 307, saved: false, urgent: false,
    createdAt: new Date(Date.now() - 6 * 86400000).toISOString(),
  },
  {
    id: 'm7', sellerId: 'u7', sellerName: 'Raj P.', sellerPhone: '0721234567', sellerAvatar: null,
    category: 'jobs', subcategory: 'full_time', title: 'Junior plumber — Easyfix partner',
    description: 'Looking for qualified plumber (trade cert preferred). R18k–R22k depending on experience. Start ASAP.',
    price: 18000, priceLabel: 'R 18k–22k', condition: null,
    images: [], city: 'Durban', suburb: 'Pinetown', views: 194, saved: false, urgent: true,
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 'm8', sellerId: 'u8', sellerName: 'Tanya V.', sellerPhone: '0811234567', sellerAvatar: null,
    category: 'goods', subcategory: 'clothing', title: '5× women\'s suits — size 12',
    description: 'Corporate suits, barely worn. Mix of black, grey and navy. Bundle price or sell separately.',
    price: 1200, priceLabel: 'R 1 200 bundle', condition: 'like_new',
    images: [], city: 'Durban', suburb: 'La Lucia', views: 44, saved: false, urgent: false,
    createdAt: new Date(Date.now() - 7 * 86400000).toISOString(),
  },
]

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const d = Math.floor(diff / 86400000)
  if (d === 0) return 'Today'
  if (d === 1) return 'Yesterday'
  return `${d}d ago`
}

function ListingCard({ item, onPress }: { item: Listing; onPress: () => void }) {
  const hasImg = item.images.length > 0
  return (
    <TouchableOpacity style={cs.card} onPress={onPress} activeOpacity={0.85}>
      <View style={cs.cardImg}>
        {hasImg
          ? <Image source={{ uri: item.images[0] }} style={cs.cardImgFill} resizeMode="cover" />
          : <View style={cs.cardImgPlaceholder}>
              <Text style={cs.cardImgEmoji}>
                {item.category === 'property' ? '🏠' : item.category === 'jobs' ? '💼' : '📦'}
              </Text>
            </View>
        }
        {item.urgent && (
          <View style={cs.urgentBadge}><Text style={cs.urgentText}>URGENT</Text></View>
        )}
      </View>
      <View style={cs.cardBody}>
        <Text style={cs.cardTitle} numberOfLines={2}>{item.title}</Text>
        <Text style={cs.cardPrice}>{item.priceLabel}</Text>
        <View style={cs.cardMeta}>
          <Ionicons name="location-outline" size={10} color={colors.gray400} />
          <Text style={cs.cardMetaText}>{item.suburb}</Text>
          <Text style={cs.cardDot}>·</Text>
          <Text style={cs.cardMetaText}>{timeAgo(item.createdAt)}</Text>
        </View>
      </View>
    </TouchableOpacity>
  )
}

export default function MarketScreen() {
  const [activeCat,  setActiveCat]  = useState<ListingCategory | 'all'>('all')
  const [query,      setQuery]      = useState('')
  const [searching,  setSearching]  = useState(false)
  const [listings,   setListings]   = useState<Listing[]>(__DEV__ ? MOCK : [])
  const [loading,    setLoading]    = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [loadError,  setLoadError]  = useState(false)
  const searchRef = useRef<TextInput>(null)

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true)
    try {
      const data = await api.listings.list({
        category: activeCat === 'all' ? undefined : activeCat,
        q: query || undefined,
      })
      setListings(data)
      setLoadError(false)
    } catch {
      if (__DEV__) {
        // Dev convenience only — never show fabricated listings to real users in production
        setListings(MOCK.filter(m => activeCat === 'all' || m.category === activeCat))
      } else {
        setListings([])
        setLoadError(true)
      }
    } finally {
      setLoading(false); setRefreshing(false)
    }
  }, [activeCat, query])

  useEffect(() => { load() }, [activeCat])

  const handleSearch = () => { Keyboard.dismiss(); load() }

  const filtered = listings.filter(l =>
    activeCat === 'all' || l.category === activeCat
  ).filter(l =>
    !query || l.title.toLowerCase().includes(query.toLowerCase()) ||
    l.suburb.toLowerCase().includes(query.toLowerCase())
  )

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <View style={s.headerTop}>
          <View>
            <Text style={s.brand}>Marketplace</Text>
            <Text style={s.sub}>Durban & surrounds</Text>
          </View>
          <TouchableOpacity activeOpacity={0.8}
            style={s.postBtn}
            onPress={() => router.push('/(client)/post-listing' as any)}
          >
            <Ionicons name="add" size={18} color={colors.black} />
            <Text style={s.postBtnText}>Post</Text>
          </TouchableOpacity>
        </View>

        {/* Search bar */}
        <View style={s.searchRow}>
          <View style={s.searchBox}>
            <Ionicons name="search-outline" size={16} color={colors.gray400} />
            <TextInput
              ref={searchRef}
              style={s.searchInput}
              placeholder="Search listings…"
              placeholderTextColor={colors.gray400}
              value={query}
              onChangeText={setQuery}
              onSubmitEditing={handleSearch}
              returnKeyType="search"
              autoCorrect={false}
              onFocus={() => setSearching(true)}
              onBlur={() => setSearching(false)}
            />
            {query.length > 0 && (
              <TouchableOpacity activeOpacity={0.8} onPress={() => { setQuery(''); }}>
                <Ionicons name="close-circle" size={16} color={colors.gray300} />
              </TouchableOpacity>
            )}
          </View>
          {searching && (
            <TouchableOpacity activeOpacity={0.8} onPress={() => { setQuery(''); setSearching(false); Keyboard.dismiss() }} style={s.cancelBtn}>
              <Text style={s.cancelText}>Cancel</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Category pills */}
      <View style={s.catsWrap}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.cats}>
          {CATS.map(c => (
            <TouchableOpacity activeOpacity={0.8}
              key={c.id}
              style={[s.catPill, activeCat === c.id && s.catPillActive]}
              onPress={() => setActiveCat(c.id as any)}
            >
              <Text style={s.catEmoji}>{c.emoji}</Text>
              <Text style={[s.catLabel, activeCat === c.id && s.catLabelActive]}>{c.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Sub-category quick filters (only when a category is selected) */}
      {activeCat !== 'all' && SUB_LABELS[activeCat] && (
        <View style={s.subCatsWrap}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.subCats}>
            {SUB_LABELS[activeCat].map(sc => (
              <TouchableOpacity activeOpacity={0.8} key={sc.label} style={s.subChip} onPress={() => setQuery(sc.label)}>
                <Text style={s.subChipEmoji}>{sc.emoji}</Text>
                <Text style={s.subChipText}>{sc.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Grid */}
      {loading ? (
        <View style={s.center}><ActivityIndicator color={colors.gold} /></View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={i => i.id}
          numColumns={2}
          columnWrapperStyle={s.row}
          contentContainerStyle={filtered.length === 0 ? s.emptyWrap : { padding: 16, paddingBottom: 32 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.gold} />}
          ListEmptyComponent={
            loadError ? (
              <View style={s.empty}>
                <Text style={s.emptyEmoji}>⚠️</Text>
                <Text style={s.emptyTitle}>Could not load listings</Text>
                <Text style={s.emptySub}>Check your connection and try again</Text>
                <TouchableOpacity activeOpacity={0.8} style={s.emptyBtn} onPress={() => load()}>
                  <Text style={s.emptyBtnText}>Retry →</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={s.empty}>
                <Text style={s.emptyEmoji}>🛒</Text>
                <Text style={s.emptyTitle}>No listings found</Text>
                <Text style={s.emptySub}>Be the first to post in this category</Text>
                <TouchableOpacity activeOpacity={0.8} style={s.emptyBtn} onPress={() => router.push('/(client)/post-listing' as any)}>
                  <Text style={s.emptyBtnText}>Post a listing →</Text>
                </TouchableOpacity>
              </View>
            )
          }
          renderItem={({ item }) => (
            <ListingCard
              item={item}
              onPress={() => router.push({ pathname: '/(client)/listing-detail' as any, params: { id: item.id } })}
            />
          )}
        />
      )}
    </SafeAreaView>
  )
}

// ─── Card styles ─────────────────────────────────────────────────────────────
const cs = StyleSheet.create({
  card:              { width: CARD_W, backgroundColor: colors.white, borderRadius: 14, marginBottom: 16, borderWidth: 1, borderColor: colors.gray100, overflow: 'hidden' },
  cardImg:           { width: '100%', height: 130, backgroundColor: colors.gray100 },
  cardImgFill:       { width: '100%', height: '100%' },
  cardImgPlaceholder:{ flex: 1, alignItems: 'center', justifyContent: 'center' },
  cardImgEmoji:      { fontSize: 36 },
  urgentBadge:       { position: 'absolute', top: 8, left: 8, backgroundColor: colors.red, borderRadius: 5, paddingHorizontal: 7, paddingVertical: 3 },
  urgentText:        { fontSize: 8, fontWeight: '800', color: colors.white, letterSpacing: 0.5 },
  cardBody:          { padding: 10 },
  cardTitle:         { fontSize: 12, fontWeight: '600', color: colors.black, lineHeight: 17, marginBottom: 5 },
  cardPrice:         { fontSize: 14, fontWeight: '700', color: colors.black, marginBottom: 5 },
  cardMeta:          { flexDirection: 'row', alignItems: 'center', gap: 3 },
  cardMetaText:      { fontSize: 10, color: colors.gray400 },
  cardDot:           { fontSize: 10, color: colors.gray200 },
})

// ─── Screen styles ────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe:          { flex: 1, backgroundColor: colors.gray50 },
  center:        { flex: 1, justifyContent: 'center', alignItems: 'center' },

  header:        { backgroundColor: colors.black, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 14 },
  headerTop:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  brand:         { fontSize: 18, fontWeight: '800', color: colors.white, letterSpacing: -0.3 },
  sub:           { fontSize: 11, color: colors.gray400, marginTop: 2 },
  postBtn:       { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.gold, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 9 },
  postBtnText:   { fontSize: 13, fontWeight: '700', color: colors.black },

  searchRow:     { flexDirection: 'row', alignItems: 'center', gap: 10 },
  searchBox:     { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11 },
  searchInput:   { flex: 1, fontSize: 14, color: colors.white },
  cancelBtn:     { paddingVertical: 8 },
  cancelText:    { fontSize: 14, color: colors.gold, fontWeight: '600' },

  catsWrap:      { backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.gray100 },
  cats:          { paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  catPill:       { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.gray50, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1.5, borderColor: colors.gray100 },
  catPillActive: { backgroundColor: colors.black, borderColor: colors.black },
  catEmoji:      { fontSize: 14 },
  catLabel:      { fontSize: 13, fontWeight: '600', color: colors.gray600 },
  catLabelActive:{ color: colors.white },

  subCatsWrap:   { backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.gray100 },
  subCats:       { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  subChip:       { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.gray50, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7, borderWidth: 1, borderColor: colors.gray100 },
  subChipEmoji:  { fontSize: 13 },
  subChipText:   { fontSize: 12, color: colors.gray600, fontWeight: '500' },

  row:           { justifyContent: 'space-between' },

  emptyWrap:     { flex: 1 },
  empty:         { flex: 1, alignItems: 'center', paddingTop: 80, gap: 8 },
  emptyEmoji:    { fontSize: 48, marginBottom: 8 },
  emptyTitle:    { fontSize: 16, fontWeight: '700', color: colors.black },
  emptySub:      { fontSize: 13, color: colors.gray400, textAlign: 'center', paddingHorizontal: 40 },
  emptyBtn:      { marginTop: 16, backgroundColor: colors.gold, borderRadius: 12, paddingHorizontal: 20, paddingVertical: 12 },
  emptyBtnText:  { fontSize: 14, fontWeight: '700', color: colors.black },
})
