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
    q: 'How do I get new job leads?',
    a: 'Jobs matching your skills and service area appear in the Jobs tab. Make sure your skills, service area, and availability are up to date on your profile to receive relevant leads.',
  },
  {
    q: 'How does payment work?',
    a: 'The client\'s card is held when they book. Once the job is done and the client releases payment, the amount (minus our commission) is added to your available balance. You can withdraw at any time.',
  },
  {
    q: 'When are withdrawals paid out?',
    a: 'Withdrawal requests are processed within 1–2 business days to your registered bank account. Ensure your bank details are saved and correct under "Bank account" in your profile.',
  },
  {
    q: 'What is the commission rate?',
    a: 'Commission varies by your plan: Free plan — 15%, Pro plan — 10%, Elite plan — 7%. You can upgrade your plan from the "Provider plan" section in your profile.',
  },
  {
    q: 'How do I improve my rating?',
    a: 'Arrive on time, communicate clearly, and do quality work. After each completed job, clients are prompted to leave a review. Consistently high ratings unlock priority listing in search results.',
  },
  {
    q: 'What does KYC verification involve?',
    a: 'You need to upload a copy of your ID, your trade certificate or proof of skill, and a bank confirmation letter. Verification usually takes 1–2 business days.',
  },
  {
    q: 'Can I set my own prices?',
    a: 'Yes — when accepting a job you can update the quoted amount if the scope differs from the initial request. Discuss any changes with the client before starting work.',
  },
  {
    q: 'What is the emergency callout feature?',
    a: 'If you have emergency availability enabled, you\'ll receive emergency job alerts at any time. These are billed at a higher rate with a reduced commission as an incentive.',
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

export default function ProviderHelpScreen() {
  const openWhatsApp = () => Linking.openURL('https://wa.me/27810000000?text=Hi%2C%20I%27m%20a%20provider%20and%20need%20help')
  const openEmail    = () => Linking.openURL('mailto:providers@homesolutions.co.za?subject=Provider%20support')
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
            <Text style={s.contactSub}>Provider line</Text>
          </TouchableOpacity>
        </View>

        <View style={s.hoursBox}>
          <Ionicons name="time-outline" size={16} color={colors.gray400} />
          <View style={{ flex: 1 }}>
            <Text style={s.hoursTitle}>Support hours</Text>
            <Text style={s.hoursSub}>Mon – Fri: 07:00 – 20:00 · Sat: 08:00 – 17:00 · Sun: Emergency only</Text>
          </View>
        </View>

        <Text style={[s.sectionLabel, { marginTop: 24 }]}>FREQUENTLY ASKED QUESTIONS</Text>
        <View style={s.faqSection}>
          {FAQS.map((faq, i) => (
            <View key={i}>
              <FaqItem q={faq.q} a={faq.a} />
              {i < FAQS.length - 1 && <View style={s.divider} />}
            </View>
          ))}
        </View>

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
