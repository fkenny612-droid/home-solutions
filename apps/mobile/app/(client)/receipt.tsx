import { useEffect, useState } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Share } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router, useLocalSearchParams } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { colors } from '../../constants/theme'
import { api, Booking } from '../../lib/api'

function formatService(s: string) {
  return s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-ZA', { dateStyle: 'medium', timeStyle: 'short' })
}

export default function ReceiptScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const [booking, setBooking] = useState<Booking | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    api.bookings.get(id).then(setBooking).catch(() => {}).finally(() => setLoading(false))
  }, [id])

  if (loading) return (
    <SafeAreaView style={s.safe}>
      <View style={s.center}><ActivityIndicator color={colors.gold} /></View>
    </SafeAreaView>
  )

  if (!booking) return (
    <SafeAreaView style={s.safe}>
      <View style={s.center}><Text style={s.errorText}>Receipt not found</Text></View>
    </SafeAreaView>
  )

  const amount = booking.finalAmount ?? booking.quotedAmount
  const label  = formatService(booking.serviceType)

  const handleShare = () => {
    Share.share({
      message:
        `Easyfix — Payment Receipt\n\n` +
        `Service: ${label}\n` +
        `Reference: #${booking.id.slice(-8).toUpperCase()}\n` +
        `Date: ${formatDateTime(booking.createdAt)}\n` +
        `Address: ${booking.address}\n` +
        `Amount paid: R ${amount.toLocaleString('en-ZA')}\n` +
        (booking.transactionId ? `Transaction ID: ${booking.transactionId}\n` : '') +
        (booking.warrantyExpiresAt ? `Warranty until: ${new Date(booking.warrantyExpiresAt).toLocaleDateString('en-ZA')}\n` : ''),
    })
  }

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity activeOpacity={0.8} onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.white} />
        </TouchableOpacity>
        <Text style={s.title}>Receipt</Text>
        <TouchableOpacity activeOpacity={0.8} onPress={handleShare} style={s.shareBtn}>
          <Ionicons name="share-outline" size={20} color={colors.white} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <View style={s.receiptCard}>
          <View style={s.successWrap}>
            <View style={s.successIcon}>
              <Ionicons name="checkmark" size={28} color={colors.white} />
            </View>
            <Text style={s.paidLabel}>PAYMENT SUCCESSFUL</Text>
            <Text style={s.amount}>R {amount.toLocaleString('en-ZA')}</Text>
            <Text style={s.dateSub}>{formatDateTime(booking.createdAt)}</Text>
          </View>

          <View style={s.divider} />

          <View style={s.row}>
            <Text style={s.rowLabel}>Service</Text>
            <Text style={s.rowValue}>{label}</Text>
          </View>
          <View style={s.row}>
            <Text style={s.rowLabel}>Reference</Text>
            <Text style={s.rowValue}>#{booking.id.slice(-8).toUpperCase()}</Text>
          </View>
          <View style={s.row}>
            <Text style={s.rowLabel}>Address</Text>
            <Text style={[s.rowValue, { flex: 1, textAlign: 'right' }]}>{booking.address}</Text>
          </View>
          {booking.providerId && (
            <View style={s.row}>
              <Text style={s.rowLabel}>Provider</Text>
              <Text style={s.rowValue}>#{booking.providerId.slice(-6).toUpperCase()}</Text>
            </View>
          )}
          {booking.transactionId && (
            <View style={s.row}>
              <Text style={s.rowLabel}>Transaction ID</Text>
              <Text style={s.rowValue}>{booking.transactionId}</Text>
            </View>
          )}

          <View style={s.divider} />

          <View style={s.row}>
            <Text style={s.rowLabel}>Quoted amount</Text>
            <Text style={s.rowValue}>R {booking.quotedAmount.toLocaleString('en-ZA')}</Text>
          </View>
          {booking.finalAmount != null && booking.finalAmount !== booking.quotedAmount && (
            <View style={s.row}>
              <Text style={s.rowLabel}>Final amount</Text>
              <Text style={s.rowValue}>R {booking.finalAmount.toLocaleString('en-ZA')}</Text>
            </View>
          )}
          <View style={s.row}>
            <Text style={[s.rowLabel, { fontWeight: '700', color: colors.black }]}>Total paid</Text>
            <Text style={[s.rowValue, { fontWeight: '700', fontSize: 15 }]}>R {amount.toLocaleString('en-ZA')}</Text>
          </View>

          {booking.warrantyExpiresAt && (
            <>
              <View style={s.divider} />
              <View style={s.warrantyBox}>
                <Ionicons name="shield-checkmark-outline" size={16} color={colors.green} />
                <Text style={s.warrantyText}>
                  90-day workmanship warranty active until {new Date(booking.warrantyExpiresAt).toLocaleDateString('en-ZA')}
                </Text>
              </View>
            </>
          )}
        </View>

        <Text style={s.footer}>Easyfix (Pty) Ltd · Durban, KZN{'\n'}Payments processed by Peach Payments</Text>

        <TouchableOpacity activeOpacity={0.8} style={s.shareCta} onPress={handleShare}>
          <Ionicons name="share-outline" size={16} color={colors.gold} />
          <Text style={s.shareCtaText}>Share receipt</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe:          { flex: 1, backgroundColor: colors.gray50 },
  center:        { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText:     { fontSize: 15, color: colors.gray400 },
  header:        { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.black, paddingHorizontal: 16, paddingVertical: 14 },
  backBtn:       { padding: 2 },
  title:         { flex: 1, fontSize: 18, fontWeight: '700', color: colors.white },
  shareBtn:      { padding: 2 },

  receiptCard:   { backgroundColor: colors.white, borderRadius: 16, padding: 20, marginBottom: 16 },
  successWrap:   { alignItems: 'center', marginBottom: 4 },
  successIcon:   { width: 52, height: 52, borderRadius: 26, backgroundColor: colors.green, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  paidLabel:     { fontSize: 10, fontWeight: '700', color: colors.green, letterSpacing: 1, marginBottom: 6 },
  amount:        { fontSize: 32, fontWeight: '700', color: colors.black, letterSpacing: -0.5 },
  dateSub:       { fontSize: 12, color: colors.gray400, marginTop: 4 },

  divider:       { height: 1, backgroundColor: colors.gray100, marginVertical: 16 },

  row:           { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12, gap: 12 },
  rowLabel:      { fontSize: 12, color: colors.gray400 },
  rowValue:      { fontSize: 13, color: colors.black, fontWeight: '500' },

  warrantyBox:   { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: colors.greenBg, borderRadius: 10, padding: 12 },
  warrantyText:  { flex: 1, fontSize: 12, color: colors.gray600, lineHeight: 17 },

  footer:        { fontSize: 11, color: colors.gray300, textAlign: 'center', lineHeight: 16, marginBottom: 20 },

  shareCta:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1.5, borderColor: colors.gold + '50', borderRadius: 12, padding: 13 },
  shareCtaText:  { fontSize: 13, fontWeight: '600', color: colors.gold },
})
