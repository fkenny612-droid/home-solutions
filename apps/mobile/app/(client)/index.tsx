/**
 * Client Home Screen
 * Designed with vendor ad slots — banner carousel, featured provider card,
 * mid-page promo strip and bottom spotlight are all sellable ad spaces.
 */
import { useState, useRef, useEffect } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Dimensions, FlatList, Image, NativeSyntheticEvent, NativeScrollEvent,
} from 'react-native'
import { router } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { colors } from '../../constants/theme'
import { useAuth } from '../../context/auth'
import { SERVICES } from '../../lib/serviceConfig'

const { width: SW } = Dimensions.get('window')

// ─── AD DATA (swap with real vendor content) ────────────────────────────────

const HERO_BANNERS = [
  {
    id: '1',
    bg:       '#0F1923',
    tag:      '🔥 Limited offer',
    headline: '20% off your\nfirst booking',
    sub:      'Use code WELCOME20 at checkout',
    cta:      'Book now',
    accent:   colors.gold,
    // adSlot: true — replace with vendor image/content
  },
  {
    id: '2',
    bg:       '#1A3A2A',
    tag:      '☀️ Sponsored',
    headline: 'Solar panels\nfrom R8,000',
    sub:      'GreenHome Solutions · Durban & surrounds',
    cta:      'Get a quote',
    accent:   '#4ADE80',
  },
  {
    id: '3',
    bg:       '#1A1A3A',
    tag:      '🛡️ Premium plan',
    headline: 'Unlimited\ncallouts for R299/mo',
    sub:      '90-day warranty on every job',
    cta:      'Upgrade now',
    accent:   colors.gold,
  },
]

const FEATURED_PROVIDER = {
  name:     'Raj Pillay Plumbing',
  tag:      '⭐ Featured provider',
  rating:   4.9,
  reviews:  214,
  skills:   'Plumbing · Geyser specialist',
  area:     'Durban, Umhlanga, Glenwood',
  badge:    'Certified · Insured · 8yrs exp',
  initials: 'RP',
  color:    '#DCF0E8',
  textColor:'#1A6842',
  // adSlot: true — vendor pays to feature here
}

const MID_PROMO = {
  bg:       colors.gold,
  headline: '🏠  Refer a friend, earn R100',
  sub:      'Share your code and both get rewarded',
  cta:      'Share now',
  // adSlot: true — swap with vendor promo
}

const TRUST_STATS = [
  { emoji: '✅', value: '1,200+', label: 'Vetted providers' },
  { emoji: '🛡️', value: '90-day', label: 'Warranty' },
  { emoji: '💳', value: 'Peach',  label: 'Secure payments' },
  { emoji: '⚡', value: '<15min', label: 'Emergency ETA' },
]

const HOW_IT_WORKS = [
  { step: '1', title: 'Choose a service',  sub: 'Pick from 19 categories',      emoji: '📋' },
  { step: '2', title: 'Get a quote',       sub: 'Matched providers, live prices', emoji: '💰' },
  { step: '3', title: 'Track & pay',       sub: 'Live tracking, pay on complete', emoji: '📍' },
]

const RECENT = [
  { emoji: '⚡', bg: '#FEF3C7', name: 'Electrical — DB board', date: '15 May · Kevin M. · ★★★★★', amt: 'R 850' },
  { emoji: '💧', bg: '#DBEAFE', name: 'Plumbing — Geyser',    date: '2 May · Raj P. · ★★★★☆',  amt: 'R 2 200' },
]

// Top 6 popular services shown above the fold
const TOP_SERVICES = ['plumbing', 'electrical', 'cleaning', 'handyman', 'painting', 'landscaping']

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning,'
  if (h < 17) return 'Good afternoon,'
  return 'Good evening,'
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function ClientHome() {
  const { user } = useAuth()
  const [bannerIdx,    setBannerIdx]    = useState(0)
  const [showAllSvcs,  setShowAllSvcs]  = useState(false)
  const bannerRef = useRef<FlatList>(null)

  const displayName = user?.firstName ?? user?.phone ?? 'there'
  const topSvcs     = SERVICES.filter(s => TOP_SERVICES.includes(s.id))
  const visibleSvcs = showAllSvcs ? SERVICES : SERVICES.slice(0, 6)

  // Auto-scroll banner every 4s
  useEffect(() => {
    const id = setInterval(() => {
      const next = (bannerIdx + 1) % HERO_BANNERS.length
      bannerRef.current?.scrollToIndex({ index: next, animated: true })
      setBannerIdx(next)
    }, 4000)
    return () => clearInterval(id)
  }, [bannerIdx])

  const onBannerScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / (SW - 28))
    setBannerIdx(idx)
  }

  return (
    <SafeAreaView style={s.safe}>
      {/* ── Header ── */}
      <View style={s.header}>
        <View style={s.headerTop}>
          <View>
            <Text style={s.greeting}>{greeting()}</Text>
            <Text style={s.name}>{displayName}</Text>
          </View>
          <View style={s.badge}>
            <Text style={s.badgeText}>👑 Premium</Text>
          </View>
        </View>

        {/* Search bar */}
        <TouchableOpacity style={s.search} onPress={() => {}}>
          <Text style={s.searchIcon}>🔍</Text>
          <Text style={s.searchText}>What do you need today?</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>

        {/* ── Hero banner carousel (AD SPACE) ── */}
        <View style={s.bannerWrap}>
          <FlatList
            ref={bannerRef}
            data={HERO_BANNERS}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={onBannerScroll}
            scrollEventThrottle={16}
            keyExtractor={i => i.id}
            renderItem={({ item }) => (
              <View style={[s.banner, { backgroundColor: item.bg, width: SW - 28 }]}>
                <Text style={s.bannerTag}>{item.tag}</Text>
                <Text style={s.bannerHeadline}>{item.headline}</Text>
                <Text style={s.bannerSub}>{item.sub}</Text>
                <TouchableOpacity style={[s.bannerCta, { backgroundColor: item.accent }]}>
                  <Text style={[s.bannerCtaText, { color: item.accent === colors.gold ? colors.navy : '#fff' }]}>{item.cta}</Text>
                </TouchableOpacity>
              </View>
            )}
          />
          {/* Dots */}
          <View style={s.bannerDots}>
            {HERO_BANNERS.map((_, i) => (
              <View key={i} style={[s.bannerDot, i === bannerIdx && s.bannerDotActive]} />
            ))}
          </View>
        </View>

        {/* ── Emergency callout ── */}
        <TouchableOpacity
          style={s.emergency}
          onPress={() => router.push({ pathname: '/(client)/book', params: { serviceType: 'plumbing' } })}
        >
          <View style={s.emergIcon}><Text style={{ fontSize: 22 }}>🚨</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={s.emergTitle}>Emergency callout</Text>
            <Text style={s.emergSub}>Nearest technician in &lt;15 min · Available 24/7</Text>
          </View>
          <Text style={s.emergArrow}>›</Text>
        </TouchableOpacity>

        {/* ── Popular services ── */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Popular services</Text>
          <View style={s.svcGrid}>
            {topSvcs.map(svc => (
              <TouchableOpacity
                key={svc.id}
                style={s.svcCard}
                onPress={() => router.push({ pathname: '/(client)/book', params: { serviceType: svc.id } })}
              >
                <View style={[s.svcIconBg, { backgroundColor: svc.bg }]}>
                  <Text style={s.svcEmoji}>{svc.emoji}</Text>
                </View>
                <Text style={s.svcName}>{svc.label}</Text>
                <Text style={s.svcPrice}>{svc.priceLabel}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── All services ── */}
        <View style={s.section}>
          <View style={s.sectionRow}>
            <Text style={s.sectionTitle}>All services</Text>
            <TouchableOpacity onPress={() => setShowAllSvcs(v => !v)}>
              <Text style={s.sectionLink}>{showAllSvcs ? 'Show less' : 'View all 19 →'}</Text>
            </TouchableOpacity>
          </View>
          <View style={s.svcGrid}>
            {visibleSvcs.map(svc => (
              <TouchableOpacity
                key={svc.id}
                style={s.svcCard}
                onPress={() => router.push({ pathname: '/(client)/book', params: { serviceType: svc.id } })}
              >
                <View style={[s.svcIconBg, { backgroundColor: svc.bg }]}>
                  <Text style={s.svcEmoji}>{svc.emoji}</Text>
                </View>
                <Text style={s.svcName}>{svc.label}</Text>
                <Text style={s.svcPrice}>{svc.priceLabel}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── Featured provider (AD SPACE) ── */}
        <View style={s.section}>
          <Text style={s.adLabel}>Sponsored</Text>
          <View style={s.featuredCard}>
            <View style={s.featuredTop}>
              <View style={[s.featuredAvatar, { backgroundColor: FEATURED_PROVIDER.color }]}>
                <Text style={[s.featuredInitials, { color: FEATURED_PROVIDER.textColor }]}>{FEATURED_PROVIDER.initials}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.featuredTag}>{FEATURED_PROVIDER.tag}</Text>
                <Text style={s.featuredName}>{FEATURED_PROVIDER.name}</Text>
                <Text style={s.featuredSkills}>{FEATURED_PROVIDER.skills}</Text>
              </View>
              <View>
                <Text style={s.featuredRating}>★ {FEATURED_PROVIDER.rating}</Text>
                <Text style={s.featuredReviews}>{FEATURED_PROVIDER.reviews} reviews</Text>
              </View>
            </View>
            <View style={s.featuredMeta}>
              <Text style={s.featuredMetaText}>📍 {FEATURED_PROVIDER.area}</Text>
              <Text style={s.featuredMetaText}>🏅 {FEATURED_PROVIDER.badge}</Text>
            </View>
            <TouchableOpacity
              style={s.featuredBtn}
              onPress={() => router.push({ pathname: '/(client)/book', params: { serviceType: 'plumbing' } })}
            >
              <Text style={s.featuredBtnText}>Book Raj Pillay →</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── How it works ── */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>How it works</Text>
          <View style={s.howRow}>
            {HOW_IT_WORKS.map((h, i) => (
              <View key={i} style={s.howCard}>
                <Text style={s.howEmoji}>{h.emoji}</Text>
                <View style={s.howStep}><Text style={s.howStepText}>{h.step}</Text></View>
                <Text style={s.howTitle}>{h.title}</Text>
                <Text style={s.howSub}>{h.sub}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── Mid-page promo (AD SPACE) ── */}
        <TouchableOpacity style={[s.midPromo, { backgroundColor: MID_PROMO.bg }]}>
          <View style={{ flex: 1 }}>
            <Text style={s.midPromoHeadline}>{MID_PROMO.headline}</Text>
            <Text style={s.midPromoSub}>{MID_PROMO.sub}</Text>
          </View>
          <View style={s.midPromoCta}>
            <Text style={s.midPromoCtaText}>{MID_PROMO.cta} →</Text>
          </View>
        </TouchableOpacity>

        {/* ── Trust signals ── */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Why Home Solutions?</Text>
          <View style={s.trustGrid}>
            {TRUST_STATS.map((t, i) => (
              <View key={i} style={s.trustCard}>
                <Text style={s.trustEmoji}>{t.emoji}</Text>
                <Text style={s.trustValue}>{t.value}</Text>
                <Text style={s.trustLabel}>{t.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── Recent jobs ── */}
        {RECENT.length > 0 && (
          <View style={s.section}>
            <View style={s.sectionRow}>
              <Text style={s.sectionTitle}>Recent jobs</Text>
              <TouchableOpacity onPress={() => router.push('/(client)/history' as any)}>
                <Text style={s.sectionLink}>View all →</Text>
              </TouchableOpacity>
            </View>
            {RECENT.map((job, i) => (
              <View key={i} style={s.histItem}>
                <View style={[s.histIcon, { backgroundColor: job.bg }]}>
                  <Text style={{ fontSize: 16 }}>{job.emoji}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.histName}>{job.name}</Text>
                  <Text style={s.histDate}>{job.date}</Text>
                </View>
                <Text style={s.histAmt}>{job.amt}</Text>
              </View>
            ))}
          </View>
        )}

        {/* ── Bottom ad strip (AD SPACE) ── */}
        <View style={s.bottomAd}>
          <Text style={s.bottomAdTag}>📢 Advertise here</Text>
          <Text style={s.bottomAdText}>Reach 10,000+ homeowners in Durban & KZN</Text>
          <Text style={s.bottomAdCta}>Contact us → hello@homesolutions.co.za</Text>
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  )
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safe:              { flex: 1, backgroundColor: colors.cream },

  // Header
  header:            { backgroundColor: colors.navy, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 16 },
  headerTop:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  greeting:          { fontSize: 11, color: 'rgba(255,255,255,0.45)', marginBottom: 2 },
  name:              { fontSize: 20, fontWeight: '300', color: '#fff' },
  badge:             { backgroundColor: 'rgba(200,146,42,0.2)', borderColor: 'rgba(200,146,42,0.4)', borderWidth: 1, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText:         { fontSize: 11, color: colors.goldLight },
  search:            { backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11, flexDirection: 'row', alignItems: 'center', gap: 8 },
  searchIcon:        { fontSize: 14 },
  searchText:        { fontSize: 14, color: 'rgba(255,255,255,0.4)' },

  // Hero banner
  bannerWrap:        { marginHorizontal: 14, marginTop: 14, borderRadius: 14, overflow: 'hidden' },
  banner:            { borderRadius: 14, padding: 18, minHeight: 140 },
  bannerTag:         { fontSize: 11, color: 'rgba(255,255,255,0.55)', marginBottom: 6 },
  bannerHeadline:    { fontSize: 22, fontWeight: '300', color: '#fff', lineHeight: 28, marginBottom: 6 },
  bannerSub:         { fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 14 },
  bannerCta:         { alignSelf: 'flex-start', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  bannerCtaText:     { fontSize: 12, fontWeight: '600' },
  bannerDots:        { flexDirection: 'row', justifyContent: 'center', gap: 5, marginTop: 10, marginBottom: 2 },
  bannerDot:         { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.creamMid },
  bannerDotActive:   { backgroundColor: colors.gold, width: 18 },

  // Emergency
  emergency:         { marginHorizontal: 14, marginTop: 14, backgroundColor: colors.red, borderRadius: 12, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  emergIcon:         { width: 42, height: 42, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  emergTitle:        { fontSize: 13, fontWeight: '600', color: '#fff' },
  emergSub:          { fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  emergArrow:        { fontSize: 20, color: 'rgba(255,255,255,0.5)' },

  // Sections
  section:           { paddingHorizontal: 14, marginTop: 20 },
  sectionRow:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle:      { fontSize: 15, fontWeight: '600', color: colors.text },
  sectionLink:       { fontSize: 12, color: colors.gold, fontWeight: '500' },

  // Service grid
  svcGrid:           { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  svcCard:           { width: '31%', backgroundColor: '#fff', borderRadius: 10, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: colors.creamMid },
  svcIconBg:         { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  svcEmoji:          { fontSize: 20 },
  svcName:           { fontSize: 10, fontWeight: '500', color: colors.text, textAlign: 'center' },
  svcPrice:          { fontSize: 9, color: colors.textLight, marginTop: 2, textAlign: 'center' },

  // Featured provider
  adLabel:           { fontSize: 9, color: colors.textLight, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 },
  featuredCard:      { backgroundColor: '#fff', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: colors.creamMid },
  featuredTop:       { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  featuredAvatar:    { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  featuredInitials:  { fontSize: 16, fontWeight: '700' },
  featuredTag:       { fontSize: 10, color: colors.gold, fontWeight: '600', marginBottom: 2 },
  featuredName:      { fontSize: 14, fontWeight: '600', color: colors.text },
  featuredSkills:    { fontSize: 11, color: colors.textLight, marginTop: 1 },
  featuredRating:    { fontSize: 13, color: colors.gold, fontWeight: '600', textAlign: 'right' },
  featuredReviews:   { fontSize: 10, color: colors.textLight, textAlign: 'right' },
  featuredMeta:      { gap: 3, marginBottom: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.creamMid },
  featuredMetaText:  { fontSize: 11, color: colors.textMuted },
  featuredBtn:       { backgroundColor: colors.navy, borderRadius: 8, padding: 11, alignItems: 'center' },
  featuredBtnText:   { fontSize: 13, fontWeight: '600', color: '#fff' },

  // How it works
  howRow:            { flexDirection: 'row', gap: 8 },
  howCard:           { flex: 1, backgroundColor: '#fff', borderRadius: 10, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: colors.creamMid },
  howEmoji:          { fontSize: 22, marginBottom: 6 },
  howStep:           { width: 20, height: 20, borderRadius: 10, backgroundColor: colors.gold, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  howStepText:       { fontSize: 10, fontWeight: '700', color: colors.navy },
  howTitle:          { fontSize: 11, fontWeight: '600', color: colors.text, textAlign: 'center', marginBottom: 3 },
  howSub:            { fontSize: 9, color: colors.textLight, textAlign: 'center', lineHeight: 13 },

  // Mid promo
  midPromo:          { marginHorizontal: 14, marginTop: 20, borderRadius: 12, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  midPromoHeadline:  { fontSize: 14, fontWeight: '600', color: colors.navy },
  midPromoSub:       { fontSize: 11, color: colors.navy, opacity: 0.7, marginTop: 2 },
  midPromoCta:       { backgroundColor: colors.navy, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  midPromoCtaText:   { fontSize: 12, fontWeight: '600', color: '#fff' },

  // Trust signals
  trustGrid:         { flexDirection: 'row', gap: 8 },
  trustCard:         { flex: 1, backgroundColor: '#fff', borderRadius: 10, padding: 10, alignItems: 'center', borderWidth: 1, borderColor: colors.creamMid },
  trustEmoji:        { fontSize: 18, marginBottom: 4 },
  trustValue:        { fontSize: 13, fontWeight: '700', color: colors.navy },
  trustLabel:        { fontSize: 9, color: colors.textLight, textAlign: 'center', marginTop: 2 },

  // Recent jobs
  histItem:          { backgroundColor: '#fff', borderRadius: 10, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8, borderWidth: 1, borderColor: colors.creamMid },
  histIcon:          { width: 36, height: 36, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  histName:          { fontSize: 13, fontWeight: '500', color: colors.text },
  histDate:          { fontSize: 10, color: colors.textLight, marginTop: 2 },
  histAmt:           { fontSize: 13, fontWeight: '600', color: colors.accent },

  // Bottom ad
  bottomAd:          { marginHorizontal: 14, marginTop: 20, backgroundColor: colors.navy, borderRadius: 12, padding: 16, alignItems: 'center', gap: 4 },
  bottomAdTag:       { fontSize: 11, color: colors.gold, fontWeight: '600' },
  bottomAdText:      { fontSize: 13, fontWeight: '300', color: '#fff', textAlign: 'center' },
  bottomAdCta:       { fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 4 },
})
