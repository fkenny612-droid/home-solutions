import { useState } from 'react'
import { View, Text, StyleSheet, Modal, TouchableOpacity, Pressable, ActivityIndicator } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { colors } from '../constants/theme'
import { Alert } from '../lib/alert'
import { api, ApiError, ReportReason, ReportTarget } from '../lib/api'
import { confirmBlock } from '../lib/blocking'

const REASONS: { id: ReportReason; label: string }[] = [
  { id: 'spam_or_scam',    label: 'Spam or scam' },
  { id: 'prohibited_item', label: 'Prohibited item or service' },
  { id: 'inappropriate',   label: 'Inappropriate or offensive' },
  { id: 'harassment',      label: 'Harassment or abuse' },
  { id: 'other',           label: 'Something else' },
]

interface Props {
  visible:    boolean
  targetType: ReportTarget
  targetId:   string | null
  onClose:    () => void
  /** When set, the sheet also offers to block this person (who posted the listing / sent the message). */
  blockUser?: { id: string; name: string } | null
  onBlocked?: () => void
}

/** Bottom sheet for reporting a listing or chat message. Required for apps with user-generated content. */
export default function ReportSheet({ visible, targetType, targetId, onClose, blockUser, onBlocked }: Props) {
  const [sending, setSending] = useState(false)

  const submit = async (reason: ReportReason) => {
    if (!targetId || sending) return
    setSending(true)
    try {
      await api.reports.create({ targetType, targetId, reason })
      onClose()
      Alert.alert('Report sent', 'Thanks — our team will review this. You will not be notified of the outcome.')
    } catch (e) {
      const message = e instanceof ApiError && e.status !== 0 ? e.message : 'Check your connection and try again.'
      Alert.alert('Could not send report', message)
    } finally {
      setSending(false)
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={s.backdrop} onPress={onClose}>
        <Pressable style={s.sheet} onPress={() => {}}>
          <View style={s.handle} />
          <Text style={s.title}>Report {targetType === 'listing' ? 'this listing' : 'this message'}</Text>
          <Text style={s.sub}>Why are you reporting it?</Text>

          {REASONS.map(r => (
            <TouchableOpacity key={r.id} style={s.row} onPress={() => submit(r.id)} disabled={sending} activeOpacity={0.7}>
              <Text style={s.rowText}>{r.label}</Text>
              {sending ? <ActivityIndicator size="small" color={colors.gray400} /> : <Ionicons name="chevron-forward" size={16} color={colors.gray300} />}
            </TouchableOpacity>
          ))}

          {blockUser && (
            <TouchableOpacity
              style={s.blockRow}
              onPress={() => { onClose(); confirmBlock(blockUser, onBlocked) }}
              disabled={sending}
              activeOpacity={0.7}
            >
              <Ionicons name="ban-outline" size={18} color={colors.red} />
              <Text style={s.blockText}>Block {blockUser.name}</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={s.cancel} onPress={onClose} activeOpacity={0.7}>
            <Text style={s.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  )
}

const s = StyleSheet.create({
  backdrop:   { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet:      { backgroundColor: colors.white, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 32 },
  handle:     { alignSelf: 'center', width: 36, height: 4, borderRadius: 2, backgroundColor: colors.gray200, marginBottom: 16 },
  title:      { fontSize: 17, fontWeight: '700', color: colors.black },
  sub:        { fontSize: 13, color: colors.gray400, marginTop: 4, marginBottom: 8 },
  row:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: colors.gray100 },
  rowText:    { fontSize: 15, color: colors.black },
  blockRow:   { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 15 },
  blockText:  { fontSize: 15, fontWeight: '600', color: colors.red },
  cancel:     { alignItems: 'center', paddingTop: 18 },
  cancelText: { fontSize: 15, fontWeight: '600', color: colors.gray400 },
})
