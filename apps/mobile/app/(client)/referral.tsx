import { useEffect, useState } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Share, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { colors } from '../../constants/theme'
import { api } from '../../lib/api'

const STEPS = [
  { icon: 'share-social-outline',     title: 'Share your code', sub: 'Send your unique code to friends and family' },
  { icon: 'person-add-outline',       title: 'They sign up',    sub: 'Your friend registers using your referral code' },
  { icon: 'gift-outline',             title: 'You both win',    sub: 'You earn 200 points once their first job is completed' },
]

export default function ReferralScreen() {
  const [code,          setCode]          = useState<string | null>(null)
  const [referredCount, setReferredCount] = useState(0)
  const [rewardedCount, setRewardedCount] = useState(0)
  const [loading,        setLoading]      = useState(true)

  useEffect(() => {
    api.auth.getReferral()
      .then(r => { setCode(r.code); setReferredCount(r.referredCount); setRewardedCount(r.rewardedCount) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleShare = () => {
    if (!code) return
    Share.share({
      message: `Join Easyfix and get trusted home service providers in Durban! Use my referral code ${code} when you sign up. 🏠🔧`,
    })
  }

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.white} />
        </TouchableOpacity>
        <Text style={s.title}>Refer a friend</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        {loading ? (
          <View style={s.center}><ActivityIndicator color={colors.gold} /></View>
        ) : (
          <>
            <View style={s.codeCard}>
              <Text style={s.codeLabel}>YOUR REFERRAL CODE</Text>
              <Text style={s.codeVal}>{code ?? '—'}</Text>
              <TouchableOpacity style={s.shareBtn} onPress={handleShare}>
                <Ionicons name="share-social-outline" size={16} color={colors.black} />
                <Text style={s.shareBtnText}>Share with friends</Text>
              </TouchableOpacity>
            </View>

            <View style={s.statsRow}>
              <View style={s.statBox}>
                <Text style={s.statVal}>{referredCount}</Text>
                <Text style={s.statLabel}>Friends joined</Text>
              </View>
              <View style={s.statDivider} />
              <View style={s.statBox}>
                <Text style={s.statVal}>{rewardedCount * 200}</Text>
                <Text style={s.statLabel}>Points earned</Text>
              </View>
            </View>

            <Text style={s.sectionLabel}>HOW IT WORKS</Text>
            <View style={s.stepsCard}>
              {STEPS.map((step, i) => (
                <View key={i} style={[s.stepRow, i < STEPS.length - 1 && s.stepRowBorder]}>
                  <View style={s.stepIcon}>
                    <Ionicons name={step.icon as any} size={18} color={colors.gold} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.stepTitle}>{step.title}</Text>
                    <Text style={s.stepSub}>{step.sub}</Text>
                  </View>
                </View>
              ))}
            </View>

            <TouchableOpacity style={s.loyaltyLink} onPress={() => router.push('/(client)/loyalty')}>
              <Ionicons name="star-outline" size={16} color={colors.gray600} />
              <Text style={s.loyaltyLinkText}>View your loyalty points & rewards</Text>
              <Ionicons name="chevron-forward" size={14} color={colors.gray300} />
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe:          { flex: 1, backgroundColor: colors.gray50 },
  center:        { paddingTop: 80, alignItems: 'center' },
  header:        { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.black, paddingHorizontal: 16, paddingVertical: 14 },
  backBtn:       { padding: 2 },
  title:         { flex: 1, fontSize: 18, fontWeight: '700', color: colors.white },

  codeCard:      { backgroundColor: colors.black, borderRadius: 16, padding: 22, alignItems: 'center', marginBottom: 16 },
  codeLabel:     { fontSize: 10, color: colors.gray400, fontWeight: '700', letterSpacing: 1.2, marginBottom: 8 },
  codeVal:       { fontSize: 34, fontWeight: '700', color: colors.gold, letterSpacing: 3, marginBottom: 18 },
  shareBtn:      { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.gold, borderRadius: 10, paddingHorizontal: 18, paddingVertical: 12 },
  shareBtnText:  { fontSize: 13, fontWeight: '700', color: colors.black },

  statsRow:      { flexDirection: 'row', backgroundColor: colors.white, borderRadius: 14, paddingVertical: 16, marginBottom: 20, borderWidth: 1, borderColor: colors.gray100 },
  statBox:       { flex: 1, alignItems: 'center' },
  statVal:       { fontSize: 22, fontWeight: '700', color: colors.black },
  statLabel:     { fontSize: 11, color: colors.gray400, marginTop: 4 },
  statDivider:   { width: 1, backgroundColor: colors.gray100 },

  sectionLabel:  { fontSize: 10, fontWeight: '700', color: colors.gray400, letterSpacing: 1, marginBottom: 10 },
  stepsCard:     { backgroundColor: colors.white, borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: colors.gray100, marginBottom: 16 },
  stepRow:       { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
  stepRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.gray100 },
  stepIcon:      { width: 38, height: 38, borderRadius: 10, backgroundColor: colors.gold + '15', alignItems: 'center', justifyContent: 'center' },
  stepTitle:     { fontSize: 13, fontWeight: '700', color: colors.black },
  stepSub:       { fontSize: 11, color: colors.gray400, marginTop: 2 },

  loyaltyLink:   { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.white, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: colors.gray100 },
  loyaltyLinkText: { flex: 1, fontSize: 13, color: colors.gray600, fontWeight: '600' },
})
