import { useState } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Linking, LayoutAnimation, UIManager, Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { colors } from '../../constants/theme'

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true)
}

const FAQS = [
  {
    q: 'How do I book a service?',
    a: 'Tap the service you need on the home screen. You\'ll be shown available providers near you. Select one, confirm your address and payment, and your booking is created instantly.',
  },
  {
    q: 'How does payment work?',
    a: 'Your card is held (not charged) when you book. The amount is only captured once you confirm the job is complete. This protects you — you only pay when you\'re satisfied.',
  },
  {
    q: 'What is the 90-day warranty?',
    a: 'Every completed job includes a 90-day workmanship warranty. If the same problem recurs within 90 days, the provider will return at no additional charge. Report issues via the "Active warranties" screen.',
  },
  {
    q: 'Can I cancel a booking?',
    a: 'Yes — you can cancel from the Bookings tab before the provider arrives. Cancellations within 30 minutes of arrival may incur a call-out fee.',
  },
  {
    q: 'How do I track my provider?',
    a: 'Once the provider accepts your booking, you\'ll see real-time status updates in the Bookings tab. You can also message them directly from the booking detail screen.',
  },
  {
    q: 'What if I\'m not happy with the work?',
    a: 'First, contact the provider through the in-app chat — most issues are resolved quickly. If unresolved, tap "Report an issue" in the booking detail or contact our support team.',
  },
  {
    q: 'Is the provider verified?',
    a: 'Yes. All providers undergo KYC verification including ID, trade certifications, and proof of bank account before being listed. Verified status is shown on their profile.',
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
  const openWhatsApp = () => Linking.openURL('https://wa.me/27810000000?text=Hi%2C%20I%20need%20help%20with%20Home%20Solutions')
  const openEmail    = () => Linking.openURL('mailto:support@homesolutions.co.za?subject=Support%20request')
  const openCall     = () => Linking.openURL('tel:+27810000000')

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
          <TouchableOpacity activeOpacity={0.8} style={[s.contactCard, { borderColor: '#25D366' }]} onPress={openWhatsApp}>
            <View style={[s.contactIcon, { backgroundColor: '#25D36615' }]}>
              <Ionicons name="logo-whatsapp" size={22} color="#25D366" />
            </View>
            <Text style={s.contactLabel}>WhatsApp</Text>
            <Text style={s.contactSub}>Fastest reply</Text>
          </TouchableOpacity>

          <TouchableOpacity activeOpacity={0.8} style={[s.contactCard, { borderColor: colors.gold }]} onPress={openCall}>
            <View style={[s.contactIcon, { backgroundColor: colors.gold + '15' }]}>
              <Ionicons name="call-outline" size={22} color={colors.gold} />
            </View>
            <Text style={s.contactLabel}>Call us</Text>
            <Text style={s.contactSub}>081 000 0000</Text>
          </TouchableOpacity>

          <TouchableOpacity activeOpacity={0.8} style={[s.contactCard, { borderColor: colors.gray200 }]} onPress={openEmail}>
            <View style={[s.contactIcon, { backgroundColor: colors.gray50 }]}>
              <Ionicons name="mail-outline" size={22} color={colors.gray400} />
            </View>
            <Text style={s.contactLabel}>Email</Text>
            <Text style={s.contactSub}>1–2 business days</Text>
          </TouchableOpacity>
        </View>

        {/* Operating hours */}
        <View style={s.hoursBox}>
          <Ionicons name="time-outline" size={16} color={colors.gray400} />
          <View style={{ flex: 1 }}>
            <Text style={s.hoursTitle}>Support hours</Text>
            <Text style={s.hoursSub}>Mon – Fri: 07:00 – 20:00 · Sat: 08:00 – 17:00 · Sun: Emergency only</Text>
          </View>
        </View>

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
