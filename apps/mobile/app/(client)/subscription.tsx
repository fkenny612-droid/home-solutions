import { useEffect, useState } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { colors } from '../../constants/theme'
import { api, SubscriptionPlan, ActiveSubscription } from '../../lib/api'

const PLAN_HIGHLIGHT: Record<string, { tag: string; tagColor: string }> = {
  basic_home:   { tag: 'STARTER',   tagColor: colors.gray400 },
  premium_home: { tag: 'POPULAR',   tagColor: colors.gold },
  estate_biz:   { tag: 'BUSINESS',  tagColor: colors.black },
}

export default function ClientSubscription() {
  const [plans,  setPlans]  = useState<SubscriptionPlan[]>([])
  const [active, setActive] = useState<ActiveSubscription | null>(null)
  const [loading,  setLoading]  = useState(true)
  const [subscribing, setSubscribing] = useState<string | null>(null)

  useEffect(() => {
    Promise.allSettled([api.subscriptions.clientPlans(), api.subscriptions.my()])
      .then(([p, a]) => {
        if (p.status === 'fulfilled') setPlans(p.value)
        if (a.status === 'fulfilled') setActive(a.value)
      })
      .finally(() => setLoading(false))
  }, [])

  const handleSubscribe = async (plan: SubscriptionPlan) => {
    if (active?.planId === plan.id) return
    Alert.alert(
      `Subscribe to ${plan.name}`,
      plan.priceMonthly === 0
        ? 'Switch to the free plan?'
        : `R${plan.priceMonthly}/month — you'll be billed monthly. Cancel anytime.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            setSubscribing(plan.id)
            try {
              const sub = await api.subscriptions.subscribe(plan.id)
              setActive(sub)
              Alert.alert('Subscribed!', `Welcome to ${plan.name}.`)
            } catch {
              Alert.alert('Error', 'Could not subscribe. Please try again.')
            } finally {
              setSubscribing(null)
            }
          },
        },
      ]
    )
  }

  const handleCancel = () => {
    Alert.alert(
      'Cancel subscription',
      'Your benefits will continue until the end of the billing period.',
      [
        { text: 'Keep plan', style: 'cancel' },
        {
          text: 'Cancel plan', style: 'destructive',
          onPress: async () => {
            try {
              await api.subscriptions.cancel()
              setActive(null)
              Alert.alert('Cancelled', 'Your subscription has been cancelled.')
            } catch {
              Alert.alert('Error', 'Could not cancel. Please try again.')
            }
          },
        },
      ]
    )
  }

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.white} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Subscription</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={s.center}><ActivityIndicator color={colors.gold} /></View>
      ) : (
        <ScrollView contentContainerStyle={s.body}>
          {/* Active plan banner */}
          {active && (
            <View style={s.activeBanner}>
              <View>
                <Text style={s.activePlanLabel}>Current plan</Text>
                <Text style={s.activePlanName}>{active.plan?.name ?? active.planId}</Text>
              </View>
              <TouchableOpacity onPress={handleCancel}>
                <Text style={s.cancelLink}>Cancel</Text>
              </TouchableOpacity>
            </View>
          )}

          <Text style={s.sectionTitle}>Choose your plan</Text>

          {plans.map(plan => {
            const isCurrent = active?.planId === plan.id
            const hl = PLAN_HIGHLIGHT[plan.id]
            return (
              <View key={plan.id} style={[s.card, isCurrent && s.cardActive]}>
                <View style={s.cardTop}>
                  <View style={{ flex: 1 }}>
                    {hl && (
                      <View style={[s.tag, { backgroundColor: hl.tagColor + '20', borderColor: hl.tagColor + '60' }]}>
                        <Text style={[s.tagText, { color: hl.tagColor }]}>{hl.tag}</Text>
                      </View>
                    )}
                    <Text style={s.planName}>{plan.name}</Text>
                    <View style={s.priceRow}>
                      <Text style={s.price}>R{plan.priceMonthly}</Text>
                      <Text style={s.pricePer}>/month</Text>
                    </View>
                  </View>
                  {isCurrent && (
                    <View style={s.checkCircle}>
                      <Ionicons name="checkmark" size={16} color={colors.white} />
                    </View>
                  )}
                </View>

                <View style={s.divider} />

                <View style={s.features}>
                  {plan.features.map((f, i) => (
                    <View key={i} style={s.featureRow}>
                      <Ionicons name="checkmark-circle" size={16} color={colors.gold} />
                      <Text style={s.featureText}>{f}</Text>
                    </View>
                  ))}
                </View>

                <TouchableOpacity
                  style={[s.btn, isCurrent && s.btnActive]}
                  onPress={() => handleSubscribe(plan)}
                  disabled={isCurrent || subscribing === plan.id}
                  activeOpacity={0.8}
                >
                  {subscribing === plan.id
                    ? <ActivityIndicator color={isCurrent ? colors.gold : colors.white} size="small" />
                    : <Text style={[s.btnText, isCurrent && s.btnTextActive]}>
                        {isCurrent ? 'Current plan' : 'Select plan'}
                      </Text>
                  }
                </TouchableOpacity>
              </View>
            )
          })}

          <Text style={s.footnote}>Billed monthly. Cancel anytime. VAT inclusive.</Text>
          <View style={{ height: 32 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe:          { flex: 1, backgroundColor: colors.gray50 },
  center:        { flex: 1, alignItems: 'center', justifyContent: 'center' },

  header:        { backgroundColor: colors.black, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 14 },
  backBtn:       { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle:   { flex: 1, textAlign: 'center', fontSize: 16, fontWeight: '700', color: colors.white },

  body:          { padding: 16 },

  activeBanner:  { backgroundColor: colors.black, borderRadius: 14, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  activePlanLabel: { fontSize: 10, color: colors.gray400, fontWeight: '600', letterSpacing: 0.5, marginBottom: 2 },
  activePlanName: { fontSize: 16, fontWeight: '700', color: colors.white },
  cancelLink:    { fontSize: 12, color: colors.red, fontWeight: '600' },

  sectionTitle:  { fontSize: 13, fontWeight: '700', color: colors.gray400, letterSpacing: 0.5, marginBottom: 12 },

  card:          { backgroundColor: colors.white, borderRadius: 16, padding: 18, marginBottom: 14, borderWidth: 1.5, borderColor: colors.gray100 },
  cardActive:    { borderColor: colors.gold },

  cardTop:       { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14 },
  tag:           { alignSelf: 'flex-start', borderWidth: 1, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2, marginBottom: 6 },
  tagText:       { fontSize: 9, fontWeight: '700', letterSpacing: 0.8 },
  planName:      { fontSize: 18, fontWeight: '700', color: colors.black },
  priceRow:      { flexDirection: 'row', alignItems: 'baseline', gap: 2, marginTop: 4 },
  price:         { fontSize: 28, fontWeight: '800', color: colors.black, letterSpacing: -0.5 },
  pricePer:      { fontSize: 13, color: colors.gray400 },
  checkCircle:   { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.gold, alignItems: 'center', justifyContent: 'center' },

  divider:       { height: 1, backgroundColor: colors.gray100, marginBottom: 14 },

  features:      { gap: 8, marginBottom: 18 },
  featureRow:    { flexDirection: 'row', alignItems: 'center', gap: 8 },
  featureText:   { fontSize: 13, color: colors.gray600, flex: 1 },

  btn:           { backgroundColor: colors.black, borderRadius: 10, paddingVertical: 13, alignItems: 'center' },
  btnActive:     { backgroundColor: colors.gray50, borderWidth: 1, borderColor: colors.gold },
  btnText:       { fontSize: 14, fontWeight: '700', color: colors.white },
  btnTextActive: { color: colors.gold },

  footnote:      { fontSize: 11, color: colors.gray400, textAlign: 'center', marginTop: 8 },
})
