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
    q: 'How do I get new job leads?',
    a: 'Jobs matching your skills and service area appear in the Jobs tab. Make sure your skills, service area, and availability are up to date on your profile to receive relevant leads.',
  },
  {
    q: 'How does payment work?',
    a: 'The customer\'s card is held when they book. When you mark the job complete, the payment is taken and the amount (minus our commission) is added to your earnings balance. You can then request a payout.',
  },
  {
    q: 'How do I get paid out?',
    a: 'Save your bank details under "Bank account" in your profile, then tap "Request a payout". Our team pays it to your bank account, and your balance goes down once it has been paid.',
  },
  {
    q: 'What is the commission rate?',
    a: 'Commission depends on your plan — a higher plan means a lower commission. See "Provider plan" in your profile for the exact rate on each plan.',
  },
  {
    q: 'How do I improve my rating?',
    a: 'Arrive on time, communicate clearly, and do quality work. After each completed job the customer is asked to leave a review, and higher-rated providers are listed first.',
  },
  {
    q: 'What does KYC verification involve?',
    a: 'You upload a copy of your ID and, for trades, your trade certificate. Our team reviews them and approves your profile before you can receive jobs.',
  },
  {
    q: 'Can I set my own prices?',
    a: 'No — the price of each job is set by Easyfix from the customer\'s answers, so the customer pays what they were quoted. If the work turns out to be very different, talk to our support team.',
  },
  {
    q: 'What is the emergency callout feature?',
    a: 'If you have emergency availability switched on, customers with an emergency can request you. You\'ll be alerted, and you must accept within 15 minutes or the request is cancelled. Emergency call-outs are a flat R850.',
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
  const waUrl   = supportWhatsAppUrl("I'm an Easyfix provider and need help")
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

          <TouchableOpacity activeOpacity={0.8} style={[s.contactCard, { borderColor: colors.gray200 }]} onPress={() => Linking.openURL(supportEmailUrl('Provider support'))}>
            <View style={[s.contactIcon, { backgroundColor: colors.gray50 }]}>
              <Ionicons name="mail-outline" size={22} color={colors.gray400} />
            </View>
            <Text style={s.contactLabel}>Email</Text>
            <Text style={s.contactSub}>{SUPPORT.email}</Text>
          </TouchableOpacity>
        </View>

        {SUPPORT.hours && (
          <View style={s.hoursBox}>
          <Ionicons name="time-outline" size={16} color={colors.gray400} />
          <View style={{ flex: 1 }}>
            <Text style={s.hoursTitle}>Support hours</Text>
            <Text style={s.hoursSub}>{SUPPORT.hours}</Text>
          </View>
        </View>
        )}

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
