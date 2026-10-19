import { useState } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Linking, LayoutAnimation, UIManager, Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { colors } from '../../constants/theme'
import { SUPPORT, supportEmailUrl, supportPhoneUrl, supportWhatsAppUrl } from '../../constants/support'

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true)
}

const FAQS = [
  {
    q: 'How do I book a service?',
    a: 'Tap the service you need, answer a few questions about the job, then choose a provider and pay. Your card is held and the provider is asked to accept — your booking is only confirmed once they do.',
  },
  {
    q: 'How does payment work?',
    a: 'Your card is held (not charged) when you book. The amount is only taken once your provider marks the job complete. If the booking is cancelled, or no provider accepts in time, the hold is released.',
  },
  {
    q: 'How does the workmanship warranty work?',
    a: 'Warranty length depends on your plan (30 days on Basic Home, 90 days on Premium Home and Estate / Business). Paid plans are coming soon. If the same problem comes back within your warranty period, contact us and we\'ll arrange for it to be put right. You can see your warranties under "Active warranties" in your profile.',
  },
  {
    q: 'Can I cancel a booking?',
    a: 'Yes — you can cancel from the booking screen until the work has started, and the payment held on your card is released.',
  },
  {
    q: 'How do I track my provider?',
    a: 'Once the provider accepts your booking you\'ll see its status update as they set off, start work and finish. You can also message them from the booking screen.',
  },
  {
    q: 'What if I\'m not happy with the work?',
    a: 'First, message the provider in the app — most issues are sorted quickly. If it isn\'t resolved, contact our support team and we\'ll help.',
  },
  {
    q: 'Is the provider verified?',
    a: 'Providers are reviewed and approved by our team before they appear in the app (ID and, for trades, a trade certificate). Providers you see here have been approved.',
  },
  {
    q: 'How do loyalty points work?',
    a: 'You earn 10 points for every R100 spent. Points can be redeemed for discounts on future bookings. 500 points = R50 off.',
  },
]

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
    setOpen(v => !v)
  }
  return (
    <TouchableOpacity style={s.faqItem} onPress={toggle} activeOpacity={0.85}>
      <View style={s.faqRow}>
        <Text style={s.faqQ}>{q}</Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={16} color={colors.gray400} />
      </View>
      {open && <Text style={s.faqA}>{a}</Text>}
    </TouchableOpacity>
  )
}

export default function HelpScreen() {
  const waUrl   = supportWhatsAppUrl('I need help with Easyfix')
  const callUrl = supportPhoneUrl()


  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity activeOpacity={0.8} onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.white} />
        </TouchableOpacity>
        <Text style={s.title}>Help & support</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>

        {/* Contact options */}
        <Text style={s.sectionLabel}>CONTACT US</Text>
        <View style={s.contactRow}>
          {waUrl && (
            <TouchableOpacity activeOpacity={0.8} style={[s.contactCard, { borderColor: '#25D366' }]} onPress={() => Linking.openURL(waUrl)}>
              <View style={[s.contactIcon, { backgroundColor: '#25D36615' }]}>
                <Ionicons name="logo-whatsapp" size={22} color="#25D366" />
              </View>
              <Text style={s.contactLabel}>WhatsApp</Text>
              <Text style={s.contactSub}>Fastest reply</Text>
            </TouchableOpacity>
          )}

          {callUrl && (
            <TouchableOpacity activeOpacity={0.8} style={[s.contactCard, { borderColor: colors.gold }]} onPress={() => Linking.openURL(callUrl)}>
              <View style={[s.contactIcon, { backgroundColor: colors.gold + '15' }]}>
                <Ionicons name="call-outline" size={22} color={colors.gold} />
              </View>
              <Text style={s.contactLabel}>Call us</Text>
              <Text style={s.contactSub}>{SUPPORT.phone}</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity activeOpacity={0.8} style={[s.contactCard, { borderColor: colors.gray200 }]} onPress={() => Linking.openURL(supportEmailUrl('Support request'))}>
            <View style={[s.contactIcon, { backgroundColor: colors.gray50 }]}>
              <Ionicons name="mail-outline" size={22} color={colors.gray400} />
            </View>
            <Text style={s.contactLabel}>Email</Text>
            <Text style={s.contactSub}>{SUPPORT.email}</Text>
          </TouchableOpacity>
        </View>

        {/* Operating hours */}
        {SUPPORT.hours && (
          <View style={s.hoursBox}>
          <Ionicons name="time-outline" size={16} color={colors.gray400} />
          <View style={{ flex: 1 }}>
            <Text style={s.hoursTitle}>Support hours</Text>
            <Text style={s.hoursSub}>{SUPPORT.hours}</Text>
          </View>
        </View>
        )}

        {/* FAQ */}
        <Text style={[s.sectionLabel, { marginTop: 24 }]}>FREQUENTLY ASKED QUESTIONS</Text>
        <View style={s.faqSection}>
          {FAQS.map((faq, i) => (
            <View key={i}>
              <FaqItem q={faq.q} a={faq.a} />
              {i < FAQS.length - 1 && <View style={s.divider} />}
            </View>
          ))}
        </View>

        {/* Footer */}
        <Text style={s.footer}>Easyfix (Pty) Ltd · Durban, KZN · v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe:         { flex: 1, backgroundColor: colors.gray50 },
  header:       { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.black, paddingHorizontal: 16, paddingVertical: 14 },
  backBtn:      { padding: 2 },
  title:        { flex: 1, fontSize: 18, fontWeight: '700', color: colors.white },

  sectionLabel: { fontSize: 10, fontWeight: '700', color: colors.gray400, letterSpacing: 1, marginBottom: 10 },

  contactRow:   { flexDirection: 'row', gap: 10, marginBottom: 12 },
  contactCard:  { flex: 1, backgroundColor: colors.white, borderRadius: 12, borderWidth: 1.5, padding: 12, alignItems: 'center', gap: 6 },
  contactIcon:  { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  contactLabel: { fontSize: 12, fontWeight: '700', color: colors.black },
  contactSub:   { fontSize: 10, color: colors.gray400, textAlign: 'center' },

  hoursBox:     { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: colors.white, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: colors.gray100 },
  hoursTitle:   { fontSize: 13, fontWeight: '600', color: colors.black, marginBottom: 3 },
  hoursSub:     { fontSize: 11, color: colors.gray400, lineHeight: 17 },

  faqSection:   { backgroundColor: colors.white, borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: colors.gray100 },
  faqItem:      { padding: 16 },
  faqRow:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  faqQ:         { flex: 1, fontSize: 13, fontWeight: '600', color: colors.black, lineHeight: 20 },
  faqA:         { fontSize: 13, color: colors.gray600, lineHeight: 20, marginTop: 10 },
  divider:      { height: 1, backgroundColor: colors.gray100, marginHorizontal: 16 },

  footer:       { fontSize: 11, color: colors.gray300, textAlign: 'center', marginTop: 32 },
})
