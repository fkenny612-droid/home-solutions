/**
 * Role selector — picks Client or Provider journey
 */
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native'
import { router } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { colors } from '../constants/theme'

export default function RoleSelector() {
  return (
    <SafeAreaView style={s.safe}>
      <View style={s.container}>
        {/* Logo */}
        <View style={s.logoRow}>
          <View style={s.logoIcon}>
            <Text style={s.logoEmoji}>🏠</Text>
          </View>
          <Text style={s.logoText}>Home Solutions</Text>
        </View>

        <Text style={s.eyebrow}>Durban · KZN · South Africa</Text>
        <Text style={s.headline}>Home services,{'\n'}<Text style={s.headlineGold}>on demand</Text></Text>
        <Text style={s.sub}>Vetted tradespeople. Live tracking.{'\n'}90-day warranty. Peach Payments.</Text>

        {/* Buttons */}
        <View style={s.btnGroup}>
          <TouchableOpacity style={s.btnGold} onPress={() => router.push('/(client)')}>
            <Text style={s.btnGoldText}>I need a service</Text>
            <Text style={s.btnSub}>Client app</Text>
          </TouchableOpacity>

          <TouchableOpacity style={s.btnOutline} onPress={() => router.push('/(provider)')}>
            <Text style={s.btnOutlineText}>I'm a tradesperson</Text>
            <Text style={s.btnOutlineSub}>Provider app</Text>
          </TouchableOpacity>
        </View>

        <Text style={s.footer}>Serving Durban, Umhlanga, Ballito & surrounds</Text>
      </View>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe:         { flex: 1, backgroundColor: colors.black },
  container:    { flex: 1, paddingHorizontal: 28, paddingTop: 40, paddingBottom: 32 },
  logoRow:      { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 40 },
  logoIcon:     { width: 36, height: 36, borderRadius: 9, backgroundColor: colors.gold, alignItems: 'center', justifyContent: 'center' },
  logoEmoji:    { fontSize: 18 },
  logoText:     { fontSize: 18, fontWeight: '600', color: '#fff' },
  eyebrow:      { fontSize: 11, color: colors.gold, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12 },
  headline:     { fontSize: 42, fontWeight: '300', color: '#fff', lineHeight: 50, marginBottom: 14 },
  headlineGold: { color: colors.gold },
  sub:          { fontSize: 15, color: 'rgba(255,255,255,0.5)', lineHeight: 24, marginBottom: 48 },
  btnGroup:     { gap: 12 },
  btnGold:      { backgroundColor: colors.gold, borderRadius: 14, padding: 18, alignItems: 'center' },
  btnGoldText:  { fontSize: 16, fontWeight: '600', color: colors.navy },
  btnSub:       { fontSize: 11, color: colors.navy, opacity: 0.7, marginTop: 2 },
  btnOutline:   { borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', borderRadius: 14, padding: 18, alignItems: 'center' },
  btnOutlineText: { fontSize: 16, fontWeight: '600', color: '#fff' },
  btnOutlineSub: { fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2 },
  footer:       { textAlign: 'center', fontSize: 11, color: 'rgba(255,255,255,0.2)', marginTop: 'auto', paddingTop: 24 },
})
