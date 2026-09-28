import { useState } from 'react'
import { StyleSheet, Text, TextInput, View } from 'react-native'
import { api, type DriverLoad } from '../lib/api'
import { deliveryFix } from '../lib/tracking'
import { colors } from '../lib/theme'
import { Button } from './ui'

/** Proof of delivery: who signed for the goods, an optional note, and the GPS fix. */
export function DeliverForm({ loadId, onDelivered, onError }: {
  loadId: string
  onDelivered: (load: DriverLoad) => void
  onError: (message: string) => void
}) {
  const [receiver, setReceiver] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const ready = receiver.trim().length >= 2

  async function submit() {
    setBusy(true)
    try {
      const fix = await deliveryFix()
      onDelivered(await api.deliver(loadId, { receiverName: receiver.trim(), note: note.trim() || undefined, ...fix }))
    } catch (e) {
      onError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <View style={s.wrap}>
      <TextInput
        style={s.input} value={receiver} onChangeText={setReceiver} maxLength={120} autoCapitalize="words"
        placeholder="Received by — name of who signed *" placeholderTextColor={colors.faint}
      />
      <TextInput
        style={s.input} value={note} onChangeText={setNote} maxLength={500}
        placeholder="Delivery note (optional) — dock #, condition…" placeholderTextColor={colors.faint}
      />
      <Text style={s.hint}>Your location is recorded with the delivery.</Text>
      <Button title="Confirm delivery" variant="dark" onPress={submit} busy={busy} disabled={!ready} />
    </View>
  )
}

const s = StyleSheet.create({
  wrap: { gap: 10 },
  input: {
    borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: colors.text, backgroundColor: '#fff',
  },
  hint: { fontSize: 12, color: colors.muted },
})
