import { useEffect, useState, useCallback } from 'react'
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, Alert, Share,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { colors } from '../../constants/theme'
import { api, LoyaltyReward, LoyaltyRedemption } from '../../lib/api'

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function LoyaltyScreen() {
  const [points,      setPoints]      = useState(0)
  const [rewards,     setRewards]     = useState<LoyaltyReward[]>([])
  const [redemptions, setRedemptions] = useState<LoyaltyRedemption[]>([])
  const [loading,     setLoading]     = useState(true)
  const [refreshing,  setRefreshing]  = useState(false)
  const [redeemingId, setRedeemingId] = useState<string | null>(null)

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    try {
      const [bal, rew, red] = await Promise.all([
        api.loyalty.balance(),
        api.loyalty.rewards(),
        api.loyalty.redemptions(),
      ])
      setPoints(bal.points)
      setRewards(rew)
      setRedemptions(red)
    } catch {}
    finally { setLoading(false); setRefreshing(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const handleRedeem = (reward: LoyaltyReward) => {
    Alert.alert(
      `Redeem ${reward.label}?`,
      `This will use ${reward.pointsCost} points to generate a discount code worth R${reward.discountAmount}.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Redeem', onPress: async () => {
            setRedeemingId(reward.id)
            try {
              const redemption = await api.loyalty.redeem(reward.id)
              setPoints(p => p - reward.pointsCost)
              setRedemptions(prev => [redemption, ...prev])
              Alert.alert('Redeemed!', `Your code is ${redemption.code}. Use it at checkout on your next booking.`)
            } catch {
              Alert.alert('Error', 'Could not redeem this reward. Please try again.')
            } finally {
              setRedeemingId(null)
            }
          },
        },
      ]
    )
  }

  const shareCode = (code: string, discountAmount: number) => {
    Share.share({ message: `My Easyfix discount code: ${code} (R${discountAmount} off)` })
  }

  const activeRedemptions = redemptions.filter(r => !r.used)
  const usedRedemptions    = redemptions.filter(r => r.used)

  if (loading) return (
    <SafeAreaView style={s.safe}>
      <View style={s.center}><ActivityIndicator color={colors.gold} /></View>
    </SafeAreaView>
  )

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.white} />
        </TouchableOpacity>
        <Text style={s.title}>Loyalty rewards</Text>
      </View>

      <FlatList
        data={rewards}
        keyExtractor={r => r.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.gold} />}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        ListHeaderComponent={
          <>
            <View style={s.balanceCard}>
              <Text style={s.balanceLabel}>YOUR POINTS</Text>
              <Text style={s.balanceVal}>{points.toLocaleString('en-ZA')}</Text>
              <Text style={s.balanceSub}>Earn 10 points for every R100 spent</Text>
            </View>

            {activeRedemptions.length > 0 && (
              <View style={s.codesSection}>
                <Text style={s.sectionLabel}>YOUR ACTIVE CODES</Text>
                {activeRedemptions.map(r => (
                  <TouchableOpacity key={r.id} style={s.codeCard} onPress={() => shareCode(r.code, r.discountAmount)}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.codeText}>{r.code}</Text>
                      <Text style={s.codeSub}>R{r.discountAmount} off · redeemed {formatDate(r.createdAt)}</Text>
                    </View>
                    <Ionicons name="share-outline" size={16} color={colors.gray400} />
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <Text style={s.sectionLabel}>REDEEM POINTS</Text>
          </>
        }
        ListFooterComponent={
          usedRedemptions.length > 0 ? (
            <View style={{ marginTop: 8 }}>
              <Text style={s.sectionLabel}>USED CODES</Text>
              {usedRedemptions.map(r => (
                <View key={r.id} style={[s.codeCard, { opacity: 0.5 }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.codeText}>{r.code}</Text>
                    <Text style={s.codeSub}>R{r.discountAmount} off · used</Text>
                  </View>
                  <Ionicons name="checkmark-circle" size={16} color={colors.gray300} />
                </View>
              ))}
            </View>
          ) : null
        }
        renderItem={({ item }) => {
          const canAfford = points >= item.pointsCost
          return (
            <View style={[s.rewardCard, !canAfford && { opacity: 0.55 }]}>
              <View style={s.rewardIcon}>
                <Ionicons name="pricetag" size={20} color={colors.gold} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.rewardLabel}>{item.label}</Text>
                <Text style={s.rewardDesc}>{item.description}</Text>
                <Text style={s.rewardCost}>{item.pointsCost.toLocaleString('en-ZA')} pts</Text>
              </View>
              <TouchableOpacity
                style={[s.redeemBtn, !canAfford && s.redeemBtnDisabled]}
                onPress={() => handleRedeem(item)}
                disabled={!canAfford || redeemingId === item.id}
              >
                {redeemingId === item.id
                  ? <ActivityIndicator size="small" color={colors.black} />
                  : <Text style={s.redeemBtnText}>Redeem</Text>}
              </TouchableOpacity>
            </View>
          )
        }}
      />
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe:          { flex: 1, backgroundColor: colors.gray50 },
  center:        { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header:        { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.black, paddingHorizontal: 16, paddingVertical: 14 },
  backBtn:       { padding: 2 },
  title:         { flex: 1, fontSize: 18, fontWeight: '700', color: colors.white },

  balanceCard:   { backgroundColor: colors.black, borderRadius: 16, padding: 20, marginBottom: 20, alignItems: 'center' },
  balanceLabel:  { fontSize: 10, color: colors.gray400, fontWeight: '700', letterSpacing: 1.2, marginBottom: 6 },
  balanceVal:    { fontSize: 38, fontWeight: '700', color: colors.gold, letterSpacing: -1 },
  balanceSub:    { fontSize: 11, color: colors.gray400, marginTop: 6 },

  sectionLabel:  { fontSize: 10, fontWeight: '700', color: colors.gray400, letterSpacing: 1, marginBottom: 10 },

  codesSection:  { marginBottom: 20 },
  codeCard:      { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white, borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: colors.gold + '40' },
  codeText:      { fontSize: 15, fontWeight: '700', color: colors.black, letterSpacing: 1 },
  codeSub:       { fontSize: 11, color: colors.gray400, marginTop: 2 },

  rewardCard:    { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.white, borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: colors.gray100 },
  rewardIcon:    { width: 40, height: 40, borderRadius: 10, backgroundColor: colors.gold + '15', alignItems: 'center', justifyContent: 'center' },
  rewardLabel:   { fontSize: 14, fontWeight: '700', color: colors.black },
  rewardDesc:    { fontSize: 11, color: colors.gray400, marginTop: 2 },
  rewardCost:    { fontSize: 11, color: colors.gold, fontWeight: '700', marginTop: 6 },
  redeemBtn:     { backgroundColor: colors.gold, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 9, minWidth: 76, alignItems: 'center' },
  redeemBtnDisabled: { backgroundColor: colors.gray100 },
  redeemBtnText: { fontSize: 12, fontWeight: '700', color: colors.black },
})
