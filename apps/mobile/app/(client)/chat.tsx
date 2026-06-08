import { useEffect, useRef, useState } from 'react'
import {
  FlatList, KeyboardAvoidingView, Platform, StyleSheet,
  Text, TextInput, TouchableOpacity, View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router, useLocalSearchParams } from 'expo-router'
import { colors } from '../../constants/theme'
import { api, Message } from '../../lib/api'
import { useAuth } from '../../context/auth'

export default function ChatScreen() {
  const { bookingId, providerName } = useLocalSearchParams<{ bookingId: string; providerName?: string }>()
  const { user } = useAuth()
  const [messages, setMessages] = useState<Message[]>([])
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const listRef = useRef<FlatList>(null)

  const load = async () => {
    try {
      const data = await api.chat.list(bookingId)
      setMessages(data)
    } catch {}
  }

  useEffect(() => { load() }, [bookingId])

  // Poll every 3 seconds
  useEffect(() => {
    const id = setInterval(load, 3000)
    return () => clearInterval(id)
  }, [bookingId])

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100)
    }
  }, [messages.length])

  const send = async () => {
    if (!text.trim() || sending || !user) return
    setSending(true)
    try {
      await api.chat.send(bookingId, {
        senderId:   user.id,
        senderRole: user.role,
        senderName: user.phone, // fallback; real name would come from profile
        text:       text.trim(),
      })
      setText('')
      await load()
    } finally {
      setSending(false)
    }
  }

  const renderItem = ({ item }: { item: Message }) => {
    const isMe = item.senderId === user?.id
    return (
      <View style={[s.bubble, isMe ? s.bubbleMe : s.bubbleThem]}>
        {!isMe && (
          <Text style={s.senderName}>
            {item.senderName} · <Text style={{ color: ROLE_COLOR[item.senderRole] ?? colors.textMuted }}>{item.senderRole}</Text>
          </Text>
        )}
        <Text style={[s.bubbleText, isMe && s.bubbleTextMe]}>{item.text}</Text>
        <Text style={[s.time, isMe && { color: 'rgba(255,255,255,0.55)' }]}>
          {new Date(item.createdAt).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
    )
  }

  return (
    <SafeAreaView style={s.safe}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.back}>
          <Text style={s.backText}>‹</Text>
        </TouchableOpacity>
        <View style={s.avatar}>
          <Text style={s.avatarText}>{(providerName ?? 'P')[0].toUpperCase()}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.headerName}>{providerName ?? 'Provider'}</Text>
          <Text style={s.headerSub}>Booking #{bookingId?.slice(-6).toUpperCase()}</Text>
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={m => m.id}
          renderItem={renderItem}
          contentContainerStyle={s.list}
          ListEmptyComponent={
            <View style={s.empty}>
              <Text style={s.emptyEmoji}>💬</Text>
              <Text style={s.emptyTitle}>No messages yet</Text>
              <Text style={s.emptySub}>Start the conversation below</Text>
            </View>
          }
        />

        {/* Input bar */}
        <View style={s.inputRow}>
          <TextInput
            style={s.input}
            value={text}
            onChangeText={setText}
            placeholder="Type a message…"
            placeholderTextColor={colors.textLight}
            multiline
            returnKeyType="send"
            onSubmitEditing={send}
          />
          <TouchableOpacity
            style={[s.sendBtn, (!text.trim() || sending) && s.sendBtnDisabled]}
            onPress={send}
            disabled={!text.trim() || sending}
          >
            <Text style={s.sendIcon}>➤</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const ROLE_COLOR: Record<string, string> = {
  admin:    colors.gold,
  provider: colors.accent,
  client:   '#1D4ED8',
}

const s = StyleSheet.create({
  safe:           { flex: 1, backgroundColor: colors.cream },
  header:         { backgroundColor: colors.navy, flexDirection: 'row', alignItems: 'center', padding: 14, gap: 10 },
  back:           { paddingRight: 4 },
  backText:       { fontSize: 28, color: '#fff', lineHeight: 28 },
  avatar:         { width: 36, height: 36, borderRadius: 18, backgroundColor: '#1E3A2F', alignItems: 'center', justifyContent: 'center' },
  avatarText:     { fontSize: 14, fontWeight: '600', color: colors.accent },
  headerName:     { fontSize: 14, fontWeight: '600', color: '#fff' },
  headerSub:      { fontSize: 10, color: 'rgba(255,255,255,0.45)', marginTop: 1 },
  list:           { padding: 14, gap: 8, flexGrow: 1 },
  bubble:         { maxWidth: '78%', padding: 10, borderRadius: 14, marginBottom: 4 },
  bubbleMe:       { alignSelf: 'flex-end', backgroundColor: colors.gold, borderBottomRightRadius: 4 },
  bubbleThem:     { alignSelf: 'flex-start', backgroundColor: '#fff', borderBottomLeftRadius: 4, borderWidth: 1, borderColor: colors.creamMid },
  senderName:     { fontSize: 10, color: colors.textMuted, marginBottom: 3, fontWeight: '600' },
  bubbleText:     { fontSize: 13, color: colors.text, lineHeight: 19 },
  bubbleTextMe:   { color: '#fff' },
  time:           { fontSize: 9, color: colors.textMuted, marginTop: 4, textAlign: 'right' },
  empty:          { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80, gap: 6 },
  emptyEmoji:     { fontSize: 40 },
  emptyTitle:     { fontSize: 15, fontWeight: '600', color: colors.text },
  emptySub:       { fontSize: 12, color: colors.textLight },
  inputRow:       { flexDirection: 'row', alignItems: 'flex-end', padding: 10, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: colors.creamMid, gap: 8 },
  input:          { flex: 1, backgroundColor: colors.cream, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 9, fontSize: 13, color: colors.text, maxHeight: 100, borderWidth: 1, borderColor: colors.creamMid },
  sendBtn:        { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.gold, alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled:{ backgroundColor: colors.creamMid },
  sendIcon:       { fontSize: 14, color: '#fff' },
})
