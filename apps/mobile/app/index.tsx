import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { router } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { colors } from '../constants/theme'

export default function RoleSelector() {
  return (
    <SafeAreaView style={s.safe}>
      <View style={s.container}>

        {/* Logo */}
        <View style={s.logoRow}>
          <View style={s.logoMark}>
            <Text style={s.logoMarkText}>EF</Text>
          </View>
          <View>
            <Text style={s.logoName}>Easy-Fix</Text>
            <Text style={s.logoSub}>Powered by Easy-Hire</Text>
          </View>
        </View>

        <Text style={s.eyebrow}>Nationwide · South Africa</Text>
        <Text style={s.headline}>Home services,{'\n'}<Text style={s.headlineAccent}>on demand</Text></Text>
        <Text style={s.sub}>Vetted tradespeople. Live tracking.{'\n'}90-day warranty. Peach Payments.</Text>

        <View style={s.btnGroup}>
          <TouchableOpacity style={s.btnPrimary} onPress={() => router.push('/(client)')}>
            <Text style={s.btnPrimaryText}>I need a service</Text>
            <Text style={s.btnPrimaryMeta}>Easy-Fix · Easy-Hire</Text>
          </TouchableOpacity>

          <TouchableOpacity style={s.btnSecondary} onPress={() => router.push('/(provider)')}>
            <Text style={s.btnSecondaryText}>I'm a tradesperson</Text>
            <Text style={s.btnSecondaryMeta}>Provider app</Text>
          </TouchableOpacity>
        </View>

        <Text style={s.footer}>Serving Johannesburg, Cape Town, Durban & nationwide</Text>
      </View>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe:              { flex: 1, backgroundColor: colors.black },
  container:         { flex: 1, paddingHorizontal: 28, paddingTop: 40, paddingBottom: 32 },

  logoRow:           { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 48 },
  logoMark:          { width: 44, height: 44, borderRadius: 12, backgroundColor: colors.gold, alignItems: 'center', justifyContent: 'center' },
  logoMarkText:      { fontSize: 15, fontWeight: '800', color: colors.black, letterSpacing: 0.5 },
  logoName:          { fontSize: 20, fontWeight: '800', color: colors.white, letterSpacing: -0.3 },
  logoSub:           { fontSize: 10, color: colors.gray400, marginTop: 1 },

  eyebrow:           { fontSize: 10, color: colors.gold, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12, fontWeight: '600' },
  headline:          { fontSize: 44, fontWeight: '700', color: colors.white, lineHeight: 52, letterSpacing: -1, marginBottom: 14 },
  headlineAccent:    { color: colors.gold },
  sub:               { fontSize: 15, color: 'rgba(255,255,255,0.45)', lineHeight: 24, marginBottom: 52 },

  btnGroup:          { gap: 12 },
  btnPrimary:        { backgroundColor: colors.gold, borderRadius: 14, padding: 18, alignItems: 'center' },
  btnPrimaryText:    { fontSize: 16, fontWeight: '700', color: colors.black },
  btnPrimaryMeta:    { fontSize: 10, color: 'rgba(0,0,0,0.55)', marginTop: 3, fontWeight: '500' },
  btnSecondary:      { borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.15)', borderRadius: 14, padding: 18, alignItems: 'center' },
  btnSecondaryText:  { fontSize: 16, fontWeight: '600', color: colors.white },
  btnSecondaryMeta:  { fontSize: 10, color: 'rgba(255,255,255,0.35)', marginTop: 3 },

  footer:            { textAlign: 'center', fontSize: 11, color: 'rgba(255,255,255,0.18)', marginTop: 'auto', paddingTop: 24 },
})
