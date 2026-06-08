import { useEffect, useRef, useState } from 'react'
import {
  FlatList, KeyboardAvoidingView, Platform, StyleSheet,
  Text, TextInput, TouchableOpacity, View, Image,
  ActionSheetIOS, Alert, ActivityIndicator, Linking,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router, useLocalSearchParams } from 'expo-router'
import * as ImagePicker from 'expo-image-picker'
import * as DocumentPicker from 'expo-document-picker'
import { colors } from '../../constants/theme'
import { api, Message, ChatAttachment } from '../../lib/api'
import { useAuth } from '../../context/auth'
import { uploadToCloudinary } from '../../lib/cloudinary'

// ─── Pending attachment before send ──────────────────────────────────────────
interface PendingAttachment {
  localUri:  string
  type:      'image' | 'file'
  fileName:  string
  uploading: boolean
  url?:      string
}

export default function ChatScreen() {
  const { bookingId, providerName } = useLocalSearchParams<{ bookingId: string; providerName?: string }>()
  const { user } = useAuth()
  const [messages,  setMessages]  = useState<Message[]>([])
  const [text,      setText]      = useState('')
  const [sending,   setSending]   = useState(false)
  const [pending,   setPending]   = useState<PendingAttachment[]>([])
  const listRef = useRef<FlatList>(null)

  const load = async () => {
    try { setMessages(await api.chat.list(bookingId)) } catch {}
  }

  useEffect(() => { load() }, [bookingId])
  useEffect(() => {
    const id = setInterval(load, 3000)
    return () => clearInterval(id)
  }, [bookingId])
  useEffect(() => {
    if (messages.length > 0)
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100)
  }, [messages.length])

  // ─── Attachment picker ──────────────────────────────────────────────────────
  const pickAttachment = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: ['Cancel', '📷 Take photo', '🖼️ Photo library', '📄 File / document'], cancelButtonIndex: 0 },
        i => { if (i === 1) pickCamera(); else if (i === 2) pickLibrary(); else if (i === 3) pickFile() }
      )
    } else {
      // Android: show Alert as fallback (expo-action-sheet can be added later)
      Alert.alert('Add attachment', undefined, [
        { text: 'Take photo',      onPress: pickCamera  },
        { text: 'Photo library',   onPress: pickLibrary },
        { text: 'File / document', onPress: pickFile    },
        { text: 'Cancel', style: 'cancel' },
      ])
    }
  }

  const addPending = (item: PendingAttachment) =>
    setPending(prev => [...prev, item])

  const updatePending = (localUri: string, update: Partial<PendingAttachment>) =>
    setPending(prev => prev.map(p => p.localUri === localUri ? { ...p, ...update } : p))

  const removePending = (localUri: string) =>
    setPending(prev => prev.filter(p => p.localUri !== localUri))

  const uploadItem = async (localUri: string, fileName: string, mimeType: string, type: 'image' | 'file') => {
    addPending({ localUri, type, fileName, uploading: true })
    try {
      const { url } = await uploadToCloudinary(localUri, fileName, mimeType)
      updatePending(localUri, { uploading: false, url })
    } catch {
      Alert.alert('Upload failed', 'Could not upload the file. Please try again.')
      removePending(localUri)
    }
  }

  const pickCamera = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync()
    if (!perm.granted) { Alert.alert('Permission needed', 'Allow camera access to take photos.'); return }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.8, allowsEditing: false })
    if (result.canceled) return
    const asset = result.assets[0]
    uploadItem(asset.uri, asset.fileName ?? `photo_${Date.now()}.jpg`, asset.mimeType ?? 'image/jpeg', 'image')
  }

  const pickLibrary = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!perm.granted) { Alert.alert('Permission needed', 'Allow photo library access.'); return }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.All, quality: 0.85, allowsMultipleSelection: true })
    if (result.canceled) return
    for (const asset of result.assets) {
      const isImage = (asset.mimeType ?? '').startsWith('image/')
      uploadItem(asset.uri, asset.fileName ?? `file_${Date.now()}`, asset.mimeType ?? 'image/jpeg', isImage ? 'image' : 'file')
    }
  }

  const pickFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true, multiple: true })
    if (result.canceled) return
    for (const asset of result.assets) {
      const isImage = (asset.mimeType ?? '').startsWith('image/')
      uploadItem(asset.uri, asset.name, asset.mimeType ?? 'application/octet-stream', isImage ? 'image' : 'file')
    }
  }

  // ─── Send ───────────────────────────────────────────────────────────────────
  const canSend = (text.trim().length > 0 || pending.some(p => p.url)) && !sending && !pending.some(p => p.uploading)

  const send = async () => {
    if (!canSend || !user) return
    setSending(true)
    const attachments: ChatAttachment[] = pending
      .filter(p => p.url)
      .map(p => ({ url: p.url!, type: p.type, fileName: p.fileName }))
    try {
      await api.chat.send(bookingId, {
        senderId:    user.id,
        senderRole:  user.role,
        senderName:  [user.firstName, user.lastName].filter(Boolean).join(' ') || user.phone,
        text:        text.trim(),
        attachments,
      })
      setText('')
      setPending([])
      await load()
    } finally {
      setSending(false)
    }
  }

  // ─── Render ─────────────────────────────────────────────────────────────────
  const renderItem = ({ item }: { item: Message }) => {
    const isMe = item.senderId === user?.id
    const attachments: ChatAttachment[] = Array.isArray(item.attachments) ? item.attachments : []
    return (
      <View style={[s.bubbleWrap, isMe ? s.bubbleWrapMe : s.bubbleWrapThem]}>
        {!isMe && (
          <Text style={s.senderName}>
            {item.senderName}{' '}
            <Text style={{ color: ROLE_COLOR[item.senderRole] ?? colors.textMuted }}>{item.senderRole}</Text>
          </Text>
        )}

        {/* Attachments */}
        {attachments.length > 0 && (
          <View style={s.attachGrid}>
            {attachments.map((att, i) =>
              att.type === 'image' ? (
                <Image key={i} source={{ uri: att.url }} style={s.attachImg} resizeMode="cover" />
              ) : (
                <TouchableOpacity key={i} style={[s.filePill, isMe && s.filePillMe]} onPress={() => Linking.openURL(att.url)}>
                  <Text style={s.filePillIcon}>📄</Text>
                  <Text style={[s.filePillName, isMe && s.filePillNameMe]} numberOfLines={1}>{att.fileName}</Text>
                </TouchableOpacity>
              )
            )}
          </View>
        )}

        {/* Text */}
        {item.text.length > 0 && (
          <Text style={[s.bubbleText, isMe && s.bubbleTextMe]}>{item.text}</Text>
        )}

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

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={0}>
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

        {/* Pending attachments preview strip */}
        {pending.length > 0 && (
          <View style={s.pendingStrip}>
            {pending.map((p, i) => (
              <View key={i} style={s.pendingThumb}>
                {p.type === 'image' ? (
                  <Image source={{ uri: p.localUri }} style={s.pendingImg} resizeMode="cover" />
                ) : (
                  <View style={s.pendingFile}>
                    <Text style={s.pendingFileIcon}>📄</Text>
                    <Text style={s.pendingFileName} numberOfLines={1}>{p.fileName}</Text>
                  </View>
                )}
                {p.uploading && (
                  <View style={s.pendingOverlay}>
                    <ActivityIndicator color="#fff" size="small" />
                  </View>
                )}
                {!p.uploading && (
                  <TouchableOpacity style={s.pendingRemove} onPress={() => removePending(p.localUri)}>
                    <Text style={s.pendingRemoveText}>✕</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Input bar */}
        <View style={s.inputRow}>
          <TouchableOpacity style={s.attachBtn} onPress={pickAttachment}>
            <Text style={s.attachBtnIcon}>＋</Text>
          </TouchableOpacity>
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
            style={[s.sendBtn, !canSend && s.sendBtnDisabled]}
            onPress={send}
            disabled={!canSend}
          >
            {sending
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={s.sendIcon}>➤</Text>}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const ROLE_COLOR: Record<string, string> = {
  admin: colors.gold, provider: colors.accent, client: '#1D4ED8',
}

const s = StyleSheet.create({
  safe:              { flex: 1, backgroundColor: colors.cream },
  header:            { backgroundColor: colors.navy, flexDirection: 'row', alignItems: 'center', padding: 14, gap: 10 },
  back:              { paddingRight: 4 },
  backText:          { fontSize: 28, color: '#fff', lineHeight: 28 },
  avatar:            { width: 36, height: 36, borderRadius: 18, backgroundColor: '#1E3A2F', alignItems: 'center', justifyContent: 'center' },
  avatarText:        { fontSize: 14, fontWeight: '600', color: colors.accent },
  headerName:        { fontSize: 14, fontWeight: '600', color: '#fff' },
  headerSub:         { fontSize: 10, color: 'rgba(255,255,255,0.45)', marginTop: 1 },
  list:              { padding: 14, gap: 8, flexGrow: 1 },

  // Bubbles
  bubbleWrap:        { maxWidth: '82%', marginBottom: 4 },
  bubbleWrapMe:      { alignSelf: 'flex-end' },
  bubbleWrapThem:    { alignSelf: 'flex-start' },
  senderName:        { fontSize: 10, color: colors.textMuted, marginBottom: 3, fontWeight: '600' },
  bubbleText:        { fontSize: 13, color: colors.text, lineHeight: 19, backgroundColor: '#fff', borderRadius: 14, borderBottomLeftRadius: 4, padding: 10, borderWidth: 1, borderColor: colors.creamMid },
  bubbleTextMe:      { color: '#fff', backgroundColor: colors.gold, borderColor: colors.gold, borderBottomLeftRadius: 14, borderBottomRightRadius: 4 },
  time:              { fontSize: 9, color: colors.textMuted, marginTop: 3, textAlign: 'right' },

  // Attachments in bubbles
  attachGrid:        { gap: 4, marginBottom: 4 },
  attachImg:         { width: 220, height: 165, borderRadius: 12 },
  filePill:          { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fff', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: colors.creamMid },
  filePillMe:        { backgroundColor: 'rgba(255,255,255,0.2)', borderColor: 'rgba(255,255,255,0.3)' },
  filePillIcon:      { fontSize: 18 },
  filePillName:      { flex: 1, fontSize: 12, color: colors.text, fontWeight: '500' },
  filePillNameMe:    { color: '#fff' },

  // Pending strip
  pendingStrip:      { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: colors.creamMid },
  pendingThumb:      { width: 64, height: 64, borderRadius: 10, overflow: 'hidden', backgroundColor: colors.creamMid },
  pendingImg:        { width: '100%', height: '100%' },
  pendingFile:       { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 4, gap: 2 },
  pendingFileIcon:   { fontSize: 22 },
  pendingFileName:   { fontSize: 8, color: colors.textMuted, textAlign: 'center' },
  pendingOverlay:    { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center' },
  pendingRemove:     { position: 'absolute', top: 2, right: 2, backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 10, width: 18, height: 18, alignItems: 'center', justifyContent: 'center' },
  pendingRemoveText: { fontSize: 9, color: '#fff', fontWeight: '700' },

  // Input bar
  inputRow:          { flexDirection: 'row', alignItems: 'flex-end', padding: 10, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: colors.creamMid, gap: 8 },
  attachBtn:         { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.creamMid, alignItems: 'center', justifyContent: 'center' },
  attachBtnIcon:     { fontSize: 22, color: colors.textMuted, lineHeight: 26 },
  input:             { flex: 1, backgroundColor: colors.cream, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 9, fontSize: 13, color: colors.text, maxHeight: 100, borderWidth: 1, borderColor: colors.creamMid },
  sendBtn:           { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.gold, alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled:   { backgroundColor: colors.creamMid },
  sendIcon:          { fontSize: 14, color: '#fff' },

  // Empty state
  empty:             { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80, gap: 6 },
  emptyEmoji:        { fontSize: 40 },
  emptyTitle:        { fontSize: 15, fontWeight: '600', color: colors.text },
  emptySub:          { fontSize: 12, color: colors.textLight },
})
