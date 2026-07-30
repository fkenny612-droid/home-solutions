import { useState, useRef, useEffect, useCallback } from 'react'
import { useFocusEffect } from 'expo-router'
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Dimensions, FlatList, NativeSyntheticEvent, NativeScrollEvent,
  TextInput, Keyboard, Platform, Modal, Share, Linking,
} from 'react-native'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { colors } from '../../constants/theme'
import { useAuth } from '../../context/auth'
import { SERVICES, SERVICE_CATEGORIES, EASY_HIRE_IDS, EASY_FIX_IDS } from '../../lib/serviceConfig'
import { api } from '../../lib/api'
import SliderButton from '../../components/SliderButton'
import { LogoImage } from '../../components/Logo'

const { width: SW } = Dimensions.get('window')

// ─── Quick-book shortcuts (top icon row like Uber ride types) ───────────────
const FIX_SHORTCUTS = ['plumbing', 'electrical', 'cleaning', 'handyman', 'painting', 'landscaping', 'solar', 'security']

// ─── Equipment hire category tiles ──────────────────────────────────────────
const HIRE_TILES = [
  { label: 'Events',    emoji: '⛺', ids: ['tent_hire','chair_table_hire','decor_hire','sound_pa_hire','jumping_castle_hire','catering_equipment_hire','cold_room_hire','mobile_toilet_hire'] },
  { label: 'Plant',     emoji: '⚡', ids: ['generator_hire','water_bowser_hire'] },
  { label: 'Transport', emoji: '🛻', ids: ['van_hire','bakkie_hire','furniture_removal','last_mile_delivery','livestock_transport'] },
  { label: 'Security',  emoji: '💂', ids: ['security_guard_hire'] },
]

// ─── Promos carousel ─────────────────────────────────────────────────────────
const PROMOS = [
  { id: '1', tag: 'LIMITED OFFER',  headline: '20% off\nyour first fix',    sub: 'Code WELCOME20',          gold: true  },
  { id: '2', tag: 'SPONSORED',      headline: 'Solar panels\nfrom R8,000',  sub: 'GreenHome · Nationwide', gold: false },
  { id: '3', tag: 'EASY-HIRE',      headline: 'Tent hire\nfrom R1,500',     sub: 'Events sorted in minutes', gold: false },
]

const SERVICE_EMOJI: Record<string, string> = {
  plumbing: '💧', electrical: '⚡', cleaning: '🧹', hvac: '❄️', gas: '🔥', handyman: '🔧',
  tiling: '🪟', painting: '🎨', landscaping: '🌿', pool: '🏊', pest_control: '🐜',
  locksmith: '🔑', carpentry: '🪚', solar: '☀️', security: '📷', paving: '🛤️',
}

function fmtService(s: string) {
  return s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

// Flat search index across all services
const SEARCH_INDEX = SERVICE_CATEGORIES.flatMap(cat =>
  cat.services.map(svc => ({ ...svc, category: cat.label }))
)

function searchServices(q: string) {
  const qn = q.toLowerCase().trim()
  if (!qn) return []
  return SEARCH_INDEX.filter(s =>
    s.label.toLowerCase().includes(qn) ||
    s.category.toLowerCase().includes(qn) ||
    s.id.toLowerCase().replace(/_/g, ' ').includes(qn)
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ClientHome() {
  const { user } = useAuth()
  const insets = useSafeAreaInsets()
  const [promoIdx,     setPromoIdx]     = useState(0)
  const [searchQuery,  setSearchQuery]  = useState('')
  const [searchActive, setSearchActive] = useState(false)
  const [unreadCount,  setUnreadCount]  = useState(0)
  const [filterOpen,   setFilterOpen]   = useState(false)
  const [minRating,    setMinRating]    = useState(0)
  const [maxPrice,     setMaxPrice]     = useState(0) // 0 = any
  const [recentJobs,   setRecentJobs]   = useState<{ emoji: string; name: string; meta: string; amt: string; serviceType: string }[]>([])
  const [serviceList,  setServiceList]  = useState<null | 'fix' | 'hire'>(null)
  const [sliderKey,    setSliderKey]    = useState(0)

  useFocusEffect(useCallback(() => {
    setSliderKey(k => k + 1)
  }, []))

  useEffect(() => {
    api.notifications.unreadCount().then(r => setUnreadCount(r.count)).catch(() => {})
    const id = setInterval(() => {
      api.notifications.unreadCount().then(r => setUnreadCount(r.count)).catch(() => {})
    }, 30000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    api.bookings.list('completed').then(bookings => {
      const last3 = bookings.slice(0, 3)
      setRecentJobs(last3.map(b => ({
        emoji:       SERVICE_EMOJI[b.serviceType] ?? '🔧',
        name:        fmtService(b.serviceType) + (b.address ? ` — ${b.address.split(',')[0]}` : ''),
        meta:        new Date(b.createdAt).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' }) +
                     (b.providerName ? ` · ${b.providerName}` : ''),
        amt:         `R ${(b.finalAmount ?? b.quotedAmount).toLocaleString('en-ZA', { maximumFractionDigits: 0 })}`,
        serviceType: b.serviceType,
      })))
    }).catch(() => {})
  }, [])
  const promoRef  = useRef<FlatList>(null)
  const searchRef = useRef<TextInput>(null)

  const displayName   = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'there'
  const fixServices   = SERVICES.filter(s => FIX_SHORTCUTS.includes(s.id))
  const activeFilters = (minRating > 0 ? 1 : 0) + (maxPrice > 0 ? 1 : 0)
  const searchResults = searchServices(searchQuery)

  const openSearch = useCallback(() => {
    setSearchActive(true)
    setTimeout(() => searchRef.current?.focus(), 50)
  }, [])

  const closeSearch = useCallback(() => {
    setSearchQuery('')
    setSearchActive(false)
    Keyboard.dismiss()
  }, [])

  const pickResult = useCallback((id: string) => {
    closeSearch()
    router.push({ pathname: '/(client)/book', params: { serviceType: id } })
  }, [closeSearch])

  // Auto-scroll promos
  useEffect(() => {
    if (searchActive) return
    const id = setInterval(() => {
      const next = (promoIdx + 1) % PROMOS.length
      promoRef.current?.scrollToOffset({ offset: next * (SW - 20), animated: true })
      setPromoIdx(next)
    }, 4500)
    return () => clearInterval(id)
  }, [promoIdx, searchActive])

  const onPromoScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    setPromoIdx(Math.round(e.nativeEvent.contentOffset.x / (SW - 20)))
  }

  return (
    <SafeAreaView style={s.safe}>

      {/* ── Header ── */}
      <View style={s.header}>
        <View style={s.headerTop}>
          <View>
            <LogoImage height={30} tint="white" />
            <Text style={s.greeting}>{greeting()}, {displayName.split(' ')[0]}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={s.premiumPill}>
              <Text style={s.premiumText}>PREMIUM</Text>
            </View>
            <TouchableOpacity activeOpacity={0.8} onPress={() => router.push('/(client)/notifications')} style={s.bellBtn}>
              <Ionicons name="notifications-outline" size={22} color={colors.white} />
              {unreadCount > 0 && (
                <View style={s.bellBadge}>
                  <Text style={s.bellBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Uber-style address / search bar */}
        <TouchableOpacity style={s.searchBar} onPress={openSearch} activeOpacity={0.85}>
          <View style={s.searchBarIcon}>
            <Text style={{ fontSize: 10 }}>📍</Text>
          </View>
          <Text style={s.searchBarText}>What service do you need?</Text>
          <View style={s.searchBarRight}>
            <Text style={s.searchBarArrow}>→</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* ── Search overlay ── */}
      <Modal visible={searchActive} animationType="slide" onRequestClose={closeSearch}>
        <View style={{ flex: 1, backgroundColor: colors.white, paddingTop: insets.top }}>
            <View style={s.searchOverlayHeader}>
              <View style={s.searchOverlayBar}>
                <Text style={s.searchOverlayPin}>📍</Text>
                <TextInput
                  ref={searchRef}
                  style={s.searchOverlayInput}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="Search services…"
                  placeholderTextColor={colors.gray400}
                  returnKeyType="search"
                  autoCorrect={false}
                  autoCapitalize="none"
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity activeOpacity={0.8} onPress={() => setSearchQuery('')}>
                    <Text style={s.searchClearText}>✕</Text>
                  </TouchableOpacity>
                )}
              </View>
              <TouchableOpacity activeOpacity={0.8} onPress={() => setFilterOpen(true)} style={s.filterBtn}>
                <Ionicons name="options-outline" size={18} color={activeFilters > 0 ? colors.gold : colors.gray600} />
                {activeFilters > 0 && <View style={s.filterDot} />}
              </TouchableOpacity>
              <TouchableOpacity activeOpacity={0.8} onPress={closeSearch} style={s.searchCancel}>
                <Text style={s.searchCancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>

            {searchQuery.length === 0 ? (
              <ScrollView keyboardShouldPersistTaps="handled">
                <View style={s.searchSuggestions}>
                  <Text style={s.searchSuggestLabel}>QUICK PICKS</Text>
                  <View style={s.chipsRow}>
                    {['Plumbing', 'Tent Hire', 'Generator', 'Electrical', 'Cleaning', 'Bakkie'].map(t => (
                      <TouchableOpacity activeOpacity={0.8} key={t} style={s.chip} onPress={() => setSearchQuery(t)}>
                        <Text style={s.chipText}>{t}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <Text style={[s.searchSuggestLabel, { marginTop: 20 }]}>BROWSE</Text>
                  {SERVICE_CATEGORIES.map(cat => (
                    <TouchableOpacity activeOpacity={0.8} key={cat.label} style={s.catRow} onPress={() => setSearchQuery(cat.label)}>
                      <Text style={s.catRowText}>{cat.label}</Text>
                      <Text style={s.catRowCount}>{cat.services.length} services</Text>
                      <Text style={s.catRowArrow}>›</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            ) : searchResults.length === 0 ? (
              <View style={s.noResults}>
                <Text style={s.noResultsTitle}>No services found</Text>
                <Text style={s.noResultsSub}>Try "plumbing", "tent hire" or "generator"</Text>
              </View>
            ) : (
              <FlatList
                data={searchResults}
                keyExtractor={item => item.id}
                keyboardShouldPersistTaps="handled"
                renderItem={({ item }) => (
                  <TouchableOpacity activeOpacity={0.8} style={s.resultRow} onPress={() => pickResult(item.id)}>
                    <View style={s.resultIcon}>
                      <Text style={{ fontSize: 18 }}>{item.emoji}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.resultLabel}>{item.label}</Text>
                      <Text style={s.resultMeta}>{(item as any).category} · {item.priceLabel}</Text>
                    </View>
                    <Text style={s.resultArrow}>›</Text>
                  </TouchableOpacity>
                )}
              />
            )}
        </View>
      </Modal>

      {/* ── Filter bottom sheet ── */}
      <Modal visible={filterOpen} transparent animationType="slide" onRequestClose={() => setFilterOpen(false)}>
        <TouchableOpacity style={s.filterOverlay} activeOpacity={1} onPress={() => setFilterOpen(false)} />
        <View style={[s.filterSheet, { paddingBottom: insets.bottom + 16 }]}>
          <View style={s.filterHandle} />
          <Text style={s.filterTitle}>Filter providers</Text>

          <Text style={s.filterLabel}>Minimum rating</Text>
          <View style={s.filterRow}>
            {[0, 3, 4, 4.5, 5].map(r => (
              <TouchableOpacity activeOpacity={0.8}
                key={r}
                style={[s.filterChip, minRating === r && s.filterChipActive]}
                onPress={() => setMinRating(r)}
              >
                <Text style={[s.filterChipText, minRating === r && s.filterChipTextActive]}>
                  {r === 0 ? 'Any' : `${r}★+`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[s.filterLabel, { marginTop: 16 }]}>Max quote (once-off)</Text>
          <View style={s.filterRow}>
            {[0, 500, 1000, 2500, 5000].map(p => (
              <TouchableOpacity activeOpacity={0.8}
                key={p}
                style={[s.filterChip, maxPrice === p && s.filterChipActive]}
                onPress={() => setMaxPrice(p)}
              >
                <Text style={[s.filterChipText, maxPrice === p && s.filterChipTextActive]}>
                  {p === 0 ? 'Any' : `R${(p / 1000).toFixed(p < 1000 ? 0 : 1)}k`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={s.filterActions}>
            <TouchableOpacity activeOpacity={0.8} style={s.filterReset} onPress={() => { setMinRating(0); setMaxPrice(0) }}>
              <Text style={s.filterResetText}>Reset</Text>
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={0.8} style={s.filterApply} onPress={() => setFilterOpen(false)}>
              <Text style={s.filterApplyText}>Apply{activeFilters > 0 ? ` (${activeFilters})` : ''}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Service list modal (Easyfix / Easy-Hire full list) ── */}
      <Modal visible={serviceList !== null} animationType="slide" onRequestClose={() => setServiceList(null)}>
        <View style={{ flex: 1, backgroundColor: colors.white, paddingTop: insets.top }}>
          <View style={s.slHeader}>
            <TouchableOpacity activeOpacity={0.8} onPress={() => setServiceList(null)} style={s.slBack}>
              <Ionicons name="arrow-back" size={22} color={colors.black} />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={s.slTitle}>{serviceList === 'fix' ? 'Easyfix' : 'Easy-Hire'}</Text>
              <Text style={s.slSub}>{serviceList === 'fix' ? 'Home repair & maintenance' : 'Equipment · Events · Transport'}</Text>
            </View>
            {serviceList === 'fix' ? (
              <View style={[s.slBadge, { backgroundColor: colors.brand + '18', borderColor: colors.brand + '40' }]}>
                <Text style={[s.slBadgeText, { color: colors.brand }]}>HOME SERVICES</Text>
              </View>
            ) : (
              <View style={[s.slBadge, { backgroundColor: colors.gold + '18', borderColor: colors.gold + '40' }]}>
                <Text style={[s.slBadgeText, { color: colors.gold }]}>HIRE</Text>
              </View>
            )}
          </View>

          <FlatList
            data={SERVICES.filter(svc =>
              serviceList === 'fix'
                ? EASY_FIX_IDS.includes(svc.id)
                : EASY_HIRE_IDS.includes(svc.id)
            )}
            keyExtractor={item => item.id}
            contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
            ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: colors.gray100, marginHorizontal: 16 }} />}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={s.slRow}
                activeOpacity={0.75}
                onPress={() => {
                  setServiceList(null)
                  router.push({ pathname: '/(client)/book', params: { serviceType: item.id } })
                }}
              >
                <View style={s.slRowIcon}>
                  <Text style={{ fontSize: 22 }}>{item.emoji}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.slRowLabel}>{item.label}</Text>
                  <Text style={s.slRowPrice}>{item.priceLabel}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.gray200} />
              </TouchableOpacity>
            )}
          />
        </View>
      </Modal>

      {/* ── Main scroll ── */}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>

        {/* ── Emergency slider ── */}
        <View style={s.emergencyWrap}>
          <SliderButton
            key={sliderKey}
            label="⚡  EMERGENCY CALLOUT"
            sublabel="Hold to dispatch — technician in <15 min"
            trackColor="#1A0000"
            thumbColor="#C0392B"
            onConfirm={() => router.push('/(client)/emergency' as any)}
          />
        </View>

        {/* ── Quick-book shortcuts (Uber ride-type row) ── */}
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <TouchableOpacity onPress={() => setServiceList('fix')} activeOpacity={0.7} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Text style={s.sectionTitle}>Easyfix</Text>
              <View style={s.brandTag}><Text style={s.brandTagText}>HOME SERVICES</Text></View>
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={0.8} onPress={() => setServiceList('fix')} style={{ marginLeft: 'auto' }}>
              <Text style={s.sectionLink}>See all →</Text>
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}>
            {fixServices.map(svc => (
              <TouchableOpacity
                key={svc.id}
                style={s.fixTile}
                onPress={() => router.push({ pathname: '/(client)/book', params: { serviceType: svc.id } })}
                activeOpacity={0.8}
              >
                <View style={s.fixTileIcon}>
                  <Text style={{ fontSize: 26 }}>{svc.emoji}</Text>
                </View>
                <Text style={s.fixTileLabel}>{svc.label}</Text>
                <Text style={s.fixTilePrice}>{svc.priceLabel}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* ── Equipment hire section ── */}
        <View style={s.hireSection}>
          <View style={s.hireSectionHeader}>
            <TouchableOpacity onPress={() => setServiceList('hire')} activeOpacity={0.7}>
              <Text style={s.hireSectionTitle}>Easy-Hire</Text>
              <Text style={s.hireSectionSub}>Equipment · Events · Transport · Security</Text>
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={0.8} onPress={() => setServiceList('hire')}>
              <Text style={s.hireSeAll}>See all →</Text>
            </TouchableOpacity>
          </View>

          {/* 2×2 grid of hire categories */}
          <View style={s.hireTileGrid}>
            {HIRE_TILES.map(tile => (
              <TouchableOpacity
                key={tile.label}
                style={s.hireTile}
                onPress={() => router.push({ pathname: '/(client)/book', params: { serviceType: tile.ids[0] } })}
                activeOpacity={0.8}
              >
                <Text style={s.hireTileEmoji}>{tile.emoji}</Text>
                <Text style={s.hireTileLabel}>{tile.label}</Text>
                <Text style={s.hireTileArrow}>→</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Hire promos row */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 10, paddingBottom: 4 }}>
            {SERVICES.filter(s => EASY_HIRE_IDS.includes(s.id)).slice(0, 8).map(svc => (
              <TouchableOpacity activeOpacity={0.8}
                key={svc.id}
                style={s.hireItemChip}
                onPress={() => router.push({ pathname: '/(client)/book', params: { serviceType: svc.id } })}
              >
                <Text style={{ fontSize: 16 }}>{svc.emoji}</Text>
                <Text style={s.hireItemLabel}>{svc.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* ── Promos carousel ── */}
        <View style={s.promoSection}>
          <FlatList
            ref={promoRef}
            data={PROMOS}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={onPromoScroll}
            scrollEventThrottle={16}
            keyExtractor={i => i.id}
            contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
            snapToInterval={SW - 20}
            decelerationRate="fast"
            renderItem={({ item }) => (
              <View style={[s.promoCard, { width: SW - 44 }, item.gold && s.promoCardGold]}>
                <Text style={[s.promoTag, item.gold && s.promoTagGold]}>{item.tag}</Text>
                <Text style={[s.promoHeadline, item.gold && s.promoHeadlineGold]}>{item.headline}</Text>
                <Text style={[s.promoSub, item.gold && s.promoSubGold]}>{item.sub}</Text>
                <View style={[s.promoCta, item.gold && s.promoCtaGold]}>
                  <Text style={[s.promoCtaText, item.gold && s.promoCtaTextGold]}>Learn more →</Text>
                </View>
              </View>
            )}
          />
          <View style={s.promoDots}>
            {PROMOS.map((_, i) => (
              <View key={i} style={[s.promoDot, i === promoIdx && s.promoDotActive]} />
            ))}
          </View>
        </View>

        {/* ── Why Easyfix ── */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Why Easyfix?</Text>
          <View style={s.whyGrid}>
            {[
              { emoji: '⚡', title: 'Fast dispatch',    sub: 'Technician confirmed in minutes' },
              { emoji: '🛡️', title: 'Vetted providers', sub: 'KYC-verified, rated & insured'  },
              { emoji: '💳', title: 'Pay on completion', sub: 'Funds held until job is done'   },
              { emoji: '📋', title: '90-day warranty',  sub: 'Parts & labour guaranteed'       },
            ].map(item => (
              <View key={item.title} style={s.whyCard}>
                <Text style={s.whyEmoji}>{item.emoji}</Text>
                <Text style={s.whyTitle}>{item.title}</Text>
                <Text style={s.whySub}>{item.sub}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── How it works ── */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>How it works</Text>
          <View style={s.howRow}>
            {[
              { n: '1', title: 'Pick a service', sub: 'Easyfix or Easy-Hire' },
              { n: '2', title: 'Get a quote',    sub: 'Instant pricing' },
              { n: '3', title: 'Track & pay',    sub: 'Pay on completion' },
            ].map((h, i) => (
              <View key={i} style={s.howCard}>
                <View style={s.howNum}><Text style={s.howNumText}>{h.n}</Text></View>
                <Text style={s.howTitle}>{h.title}</Text>
                <Text style={s.howSub}>{h.sub}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── Refer strip ── */}
        <TouchableOpacity
          style={s.referStrip}
          activeOpacity={0.85}
          onPress={() => Share.share({
            message: `Join me on Easyfix — the fastest way to find trusted home services in Durban! Use my code to get R100 off your first booking. Download: https://easy-fix.co.za`,
            title:   'Easyfix — refer a friend',
          })}
        >
          <View style={{ flex: 1 }}>
            <Text style={s.referTitle}>Refer a friend, earn R100</Text>
            <Text style={s.referSub}>Both of you get rewarded</Text>
          </View>
          <View style={s.referBtn}>
            <Text style={s.referBtnText}>Share →</Text>
          </View>
        </TouchableOpacity>

        {/* ── Recent jobs ── */}
        {recentJobs.length > 0 && (
          <View style={s.section}>
            <View style={s.sectionHeaderRow}>
              <Text style={s.sectionTitle}>Recent jobs</Text>
              <TouchableOpacity activeOpacity={0.8} onPress={() => router.push('/(client)/history' as any)}>
                <Text style={s.sectionLink}>View all →</Text>
              </TouchableOpacity>
            </View>
            {recentJobs.map((j, i) => (
              <TouchableOpacity
                key={i}
                style={s.recentRow}
                onPress={() => router.push({ pathname: '/(client)/book', params: { serviceType: j.serviceType } })}
                activeOpacity={0.75}
              >
                <View style={s.recentIcon}>
                  <Text style={{ fontSize: 18 }}>{j.emoji}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.recentName}>{j.name}</Text>
                  <Text style={s.recentMeta}>{j.meta}</Text>
                </View>
                <View style={s.recentRight}>
                  <Text style={s.recentAmt}>{j.amt}</Text>
                  <Text style={s.recentRebook}>Re-book →</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* ── Advertise ── */}
        <TouchableOpacity
          style={s.adStrip}
          activeOpacity={0.85}
          onPress={() => Linking.openURL('mailto:hello@easyfix.co.za')}
        >
          <Text style={s.adTag}>ADVERTISE WITH EASYFIX</Text>
          <Text style={s.adText}>Reach 100,000+ homeowners nationwide</Text>
          <Text style={s.adCta}>hello@easyfix.co.za →</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safe:                { flex: 1, backgroundColor: colors.gray50 },

  // Header
  header:              { backgroundColor: colors.black, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 16 },
  headerTop:           { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  brand:               { fontSize: 18, fontWeight: '800', color: colors.white, letterSpacing: -0.3 },
  greeting:            { fontSize: 11, color: colors.gray400, marginTop: 1 },
  premiumPill:         { backgroundColor: colors.gold + '20', borderWidth: 1, borderColor: colors.gold + '50', borderRadius: 6, paddingHorizontal: 9, paddingVertical: 4 },
  premiumText:         { fontSize: 9, color: colors.gold, fontWeight: '700', letterSpacing: 1 },
  bellBtn:             { position: 'relative', padding: 2 },
  bellBadge:           { position: 'absolute', top: -2, right: -2, backgroundColor: colors.gold, borderRadius: 8, minWidth: 16, height: 16, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
  bellBadgeText:       { fontSize: 9, color: colors.black, fontWeight: '800' },

  // Uber-style address bar
  searchBar:           { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white, borderRadius: 12, overflow: 'hidden' },
  searchBarIcon:       { width: 46, height: 46, backgroundColor: colors.gray50, alignItems: 'center', justifyContent: 'center' },
  searchBarText:       { flex: 1, fontSize: 14, color: colors.gray600, paddingHorizontal: 12, fontWeight: '500' },
  searchBarRight:      { width: 46, height: 46, backgroundColor: colors.gold, alignItems: 'center', justifyContent: 'center' },
  searchBarArrow:      { fontSize: 16, color: colors.black, fontWeight: '700' },

  // Search overlay
  searchOverlayHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, paddingTop: 8, borderBottomWidth: 1, borderBottomColor: colors.gray100 },
  searchOverlayBar:    { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.gray50, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 },
  searchOverlayPin:    { fontSize: 14 },
  searchOverlayInput:  { flex: 1, fontSize: 15, color: colors.black, paddingVertical: Platform.OS === 'ios' ? 2 : 0 },
  searchClearText:     { fontSize: 14, color: colors.gray400, paddingHorizontal: 4 },
  searchCancel:        { paddingVertical: 8, paddingHorizontal: 4 },
  searchCancelText:    { fontSize: 14, color: colors.gold, fontWeight: '600' },
  searchSuggestions:   { padding: 16 },
  searchSuggestLabel:  { fontSize: 10, color: colors.gray400, fontWeight: '700', letterSpacing: 1.2, marginBottom: 10 },
  chipsRow:            { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip:                { backgroundColor: colors.gray50, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: colors.gray100 },
  chipText:            { fontSize: 13, color: colors.black, fontWeight: '500' },
  catRow:              { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.gray100 },
  catRowText:          { flex: 1, fontSize: 14, fontWeight: '500', color: colors.black },
  catRowCount:         { fontSize: 12, color: colors.gray400, marginRight: 8 },
  catRowArrow:         { fontSize: 20, color: colors.gray200 },
  noResults:           { flex: 1, alignItems: 'center', paddingTop: 80, gap: 8 },
  noResultsTitle:      { fontSize: 16, fontWeight: '600', color: colors.black },
  noResultsSub:        { fontSize: 13, color: colors.gray400 },
  resultRow:           { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.gray100 },
  resultIcon:          { width: 40, height: 40, borderRadius: 8, backgroundColor: colors.gray50, alignItems: 'center', justifyContent: 'center' },
  resultLabel:         { fontSize: 14, fontWeight: '600', color: colors.black },
  resultMeta:          { fontSize: 11, color: colors.gray400, marginTop: 2 },
  resultArrow:         { fontSize: 20, color: colors.gray200 },

  // Emergency slider
  emergencyWrap:       { paddingHorizontal: 16, paddingVertical: 10, backgroundColor: colors.black },

  // Sections
  section:             { paddingHorizontal: 16, marginTop: 24 },
  sectionHeader:       { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14, paddingHorizontal: 16, justifyContent: 'space-between' },
  sectionHeaderRow:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle:        { fontSize: 17, fontWeight: '700', color: colors.black, letterSpacing: -0.2 },
  sectionLink:         { fontSize: 13, color: colors.gold, fontWeight: '600' },
  brandTag:            { backgroundColor: colors.gold + '18', borderRadius: 5, paddingHorizontal: 8, paddingVertical: 3 },
  brandTagText:        { fontSize: 9, color: colors.gold, fontWeight: '700', letterSpacing: 0.8 },

  // Quick-book shortcuts (Uber tile row)
  fixTile:             { width: 86, alignItems: 'center' },
  fixTileIcon:         { width: 68, height: 68, borderRadius: 18, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  fixTileLabel:        { fontSize: 11, fontWeight: '600', color: colors.black, textAlign: 'center' },
  fixTilePrice:        { fontSize: 9, color: colors.gray400, marginTop: 2, textAlign: 'center' },

  // Equipment hire section
  hireSection:         { marginTop: 24, backgroundColor: colors.black, paddingTop: 18, paddingBottom: 18 },
  hireSectionHeader:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: 16, marginBottom: 16 },
  hireSectionTitle:    { fontSize: 19, fontWeight: '800', color: colors.white, letterSpacing: -0.3 },
  hireSectionSub:      { fontSize: 11, color: colors.gray400, marginTop: 2 },

  // Hire 2×2 grid
  hireTileGrid:        { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, gap: 8, marginBottom: 14 },
  hireTile:            { width: '47%', backgroundColor: colors.black2, borderRadius: 12, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10 },
  hireTileEmoji:       { fontSize: 22 },
  hireTileLabel:       { flex: 1, fontSize: 13, fontWeight: '600', color: colors.white },
  hireTileArrow:       { fontSize: 12, color: colors.gold, fontWeight: '700' },

  // Hire item chips (horizontal scroll)
  hireItemChip:        { backgroundColor: colors.black2, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 8 },
  hireItemLabel:       { fontSize: 12, color: colors.gray400, fontWeight: '500' },

  // Promos carousel
  promoSection:        { marginTop: 20 },
  promoCard:           { backgroundColor: colors.black2, borderRadius: 14, padding: 18, minHeight: 148, marginRight: 8 },
  promoCardGold:       { backgroundColor: colors.gold + 'CC' },
  promoTag:            { fontSize: 9, color: colors.gold, fontWeight: '700', letterSpacing: 1.2, marginBottom: 8 },
  promoTagGold:        { color: 'rgba(0,0,0,0.6)' },
  promoHeadline:       { fontSize: 22, fontWeight: '700', color: colors.white, lineHeight: 28, letterSpacing: -0.4, marginBottom: 6 },
  promoHeadlineGold:   { color: colors.black },
  promoSub:            { fontSize: 12, color: colors.gray400, marginBottom: 16 },
  promoSubGold:        { color: 'rgba(0,0,0,0.55)' },
  promoCta:            { alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  promoCtaGold:        { backgroundColor: colors.black },
  promoCtaText:        { fontSize: 12, fontWeight: '600', color: colors.white },
  promoCtaTextGold:    { color: colors.white },
  promoDots:           { flexDirection: 'row', justifyContent: 'center', gap: 5, marginTop: 12 },
  promoDot:            { width: 4, height: 4, borderRadius: 2, backgroundColor: colors.gray200 },
  promoDotActive:      { backgroundColor: colors.gold, width: 14 },

  // Why Easyfix grid
  whyGrid:             { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  whyCard:             { width: '47%', backgroundColor: colors.white, borderRadius: 14, padding: 14 },
  whyEmoji:            { fontSize: 22, marginBottom: 8 },
  whyTitle:            { fontSize: 13, fontWeight: '700', color: colors.black, marginBottom: 3 },
  whySub:              { fontSize: 11, color: colors.gray400, lineHeight: 15 },

  // How it works
  howRow:              { flexDirection: 'row', gap: 8 },
  howCard:             { flex: 1, backgroundColor: colors.white, borderRadius: 12, padding: 14 },
  howNum:              { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.gold, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  howNumText:          { fontSize: 11, fontWeight: '700', color: colors.black },
  howTitle:            { fontSize: 12, fontWeight: '600', color: colors.black, marginBottom: 3 },
  howSub:              { fontSize: 10, color: colors.gray400, lineHeight: 14 },

  // Refer strip
  referStrip:          { marginHorizontal: 16, marginTop: 20, backgroundColor: colors.gold, borderRadius: 14, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  referTitle:          { fontSize: 14, fontWeight: '700', color: colors.black },
  referSub:            { fontSize: 11, color: 'rgba(0,0,0,0.55)', marginTop: 2 },
  referBtn:            { backgroundColor: colors.black, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  referBtnText:        { fontSize: 12, fontWeight: '600', color: colors.white },

  // Recent jobs
  recentRow:           { backgroundColor: colors.white, borderRadius: 12, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  recentIcon:          { width: 40, height: 40, borderRadius: 10, backgroundColor: colors.gray50, alignItems: 'center', justifyContent: 'center' },
  recentName:          { fontSize: 13, fontWeight: '600', color: colors.black },
  recentMeta:          { fontSize: 11, color: colors.gray400, marginTop: 2 },
  recentRight:         { alignItems: 'flex-end', gap: 4 },
  recentAmt:           { fontSize: 13, fontWeight: '700', color: colors.black },
  recentRebook:        { fontSize: 10, fontWeight: '600', color: colors.gold },

  // Ad strip
  adStrip:             { marginHorizontal: 16, marginTop: 24, backgroundColor: colors.black2, borderRadius: 14, padding: 18, alignItems: 'center', gap: 4 },
  adTag:               { fontSize: 9, color: colors.gold, fontWeight: '700', letterSpacing: 1.2 },
  adText:              { fontSize: 13, fontWeight: '500', color: colors.white, textAlign: 'center', marginTop: 2 },
  adCta:               { fontSize: 11, color: colors.gray400, marginTop: 4 },

  // Service list modal
  slHeader:      { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.gray100 },
  slBack:        { padding: 4 },
  slTitle:       { fontSize: 18, fontWeight: '700', color: colors.black, letterSpacing: -0.3 },
  slSub:         { fontSize: 11, color: colors.gray400, marginTop: 1 },
  slBadge:       { borderWidth: 1, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  slBadgeText:   { fontSize: 9, fontWeight: '700', letterSpacing: 0.8 },
  slRow:         { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingVertical: 15 },
  slRowIcon:     { width: 46, height: 46, borderRadius: 12, backgroundColor: colors.gray50, alignItems: 'center', justifyContent: 'center' },
  slRowLabel:    { fontSize: 15, fontWeight: '600', color: colors.black },
  slRowPrice:    { fontSize: 12, color: colors.gray400, marginTop: 2 },
  hireSeAll:     { fontSize: 12, color: colors.gold, fontWeight: '600' },

  // Filter
  filterBtn:           { padding: 8, position: 'relative' },
  filterDot:           { position: 'absolute', top: 6, right: 6, width: 7, height: 7, borderRadius: 4, backgroundColor: colors.gold },
  filterOverlay:       { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  filterSheet:         { backgroundColor: colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20 },
  filterHandle:        { width: 40, height: 4, backgroundColor: colors.gray200, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  filterTitle:         { fontSize: 17, fontWeight: '700', color: colors.black, marginBottom: 16 },
  filterLabel:         { fontSize: 11, fontWeight: '700', color: colors.gray400, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 10 },
  filterRow:           { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  filterChip:          { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20, backgroundColor: colors.gray50, borderWidth: 1, borderColor: colors.gray100 },
  filterChipActive:    { backgroundColor: colors.black, borderColor: colors.black },
  filterChipText:      { fontSize: 13, fontWeight: '500', color: colors.gray600 },
  filterChipTextActive:{ color: colors.white, fontWeight: '700' },
  filterActions:       { flexDirection: 'row', gap: 10, marginTop: 24 },
  filterReset:         { flex: 1, paddingVertical: 13, borderRadius: 12, backgroundColor: colors.gray50, alignItems: 'center', borderWidth: 1, borderColor: colors.gray100 },
  filterResetText:     { fontSize: 14, fontWeight: '600', color: colors.gray600 },
  filterApply:         { flex: 2, paddingVertical: 13, borderRadius: 12, backgroundColor: colors.gold, alignItems: 'center' },
  filterApplyText:     { fontSize: 14, fontWeight: '700', color: colors.black },
})
