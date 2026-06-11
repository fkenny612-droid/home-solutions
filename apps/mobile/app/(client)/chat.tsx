import { useEffect, useRef, useState } from 'react'
import {
  FlatList, KeyboardAvoidingView, Platform, StyleSheet,
  Text, TextInput, TouchableOpacity, View, Image,
  Alert, ActivityIndicator, Linking,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router, useLocalSearchParams } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import * as ImagePicker from 'expo-image-picker'
import * as DocumentPicker from 'expo-document-picker'
import { colors } from '../../constants/theme'
import { api, Message, ChatAttachment } from '../../lib/api'
import { useAuth } from '../../context/auth'
import { uploadToCloudinary } from '../../lib/cloudinary'

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

  const addPending    = (item: PendingAttachment) => setPending(prev => [...prev, item])
  const updatePending = (uri: string, patch: Partial<PendingAttachment>) =>
    setPending(prev => prev.map(p => p.localUri === uri ? { ...p, ...patch } : p))
  const removePending = (uri: string) => setPending(prev => prev.filter(p => p.localUri !== uri))

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
    if (!perm.granted) { Alert.alert('Camera access needed', 'Allow camera access in Settings.'); return }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.8, allowsEditing: false })
    if (result.canceled) return
    const a = result.assets[0]
    uploadItem(a.uri, a.fileName ?? `photo_${Date.now()}.jpg`, a.mimeType ?? 'image/jpeg', 'image')
  }

  const pickGallery = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!perm.granted) { Alert.alert('Gallery access needed', 'Allow photo library access in Settings.'); return }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      quality: 0.85,
      allowsMultipleSelection: true,
    })
    if (result.canceled) return
    for (const a of result.assets) {
      const isImg = (a.mimeType ?? '').startsWith('image/')
      uploadItem(a.uri, a.fileName ?? `file_${Date.now()}`, a.mimeType ?? 'image/jpeg', isImg ? 'image' : 'file')
    }
  }

  const pickFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true, multiple: true })
    if (result.canceled) return
    for (const a of result.assets) {
      const isImg = (a.mimeType ?? '').startsWith('image/')
      uploadItem(a.uri, a.name, a.mimeType ?? 'application/octet-stream', isImg ? 'image' : 'file')
    }
  }

  const canSend = (text.trim().length > 0 || pending.some(p => p.url)) && !sending && !pending.some(p => p.uploading)

  const send = async () => {
    if (!canSend || !user) return
    setSending(true)
    const attachments: ChatAttachment[] = pending
      .filter(p => p.url)
      .map(p => ({ url: p.url!, type: p.type, fileName: p.fileName }))
    try {
      await api.chat.send(bookingId, {
        senderId:   user.id,
        senderRole: user.role,
        senderName: [user.firstName, user.lastName].filter(Boolean).join(' ') || user.phone,
        text:       text.trim(),
        attachments,
      })
      setText('')
      setPending([])
      await load()
    } finally {
      setSending(false)
    }
  }

  const renderItem = ({ item }: { item: Message }) => {
    const isMe = item.senderId === user?.id
    const attachments: ChatAttachment[] = Array.isArray(item.attachments) ? item.attachments : []
    return (
      <View style={[s.bubble, isMe ? s.bubbleMe : s.bubbleThem]}>
        {!isMe && (
          <Text style={s.senderName}>{item.senderName}</Text>
        )}
        {attachments.length > 0 && (
          <View style={s.attachGrid}>
            {attachments.map((att, i) =>
              att.type === 'image' ? (
                <Image key={i} source={{ uri: att.url }} style={s.attachImg} resizeMode="cover" />
              ) : (
                <TouchableOpacity key={i} style={[s.filePill, isMe && s.filePillMe]} onPress={() => Linking.openURL(att.url)}>
                  <Ionicons name="document-outline" size={18} color={isMe ? 'rgba(255,255,255,0.8)' : colors.gray600} />
                  <Text style={[s.filePillName, isMe && s.filePillNameMe]} numberOfLines={1}>{att.fileName}</Text>
                </TouchableOpacity>
              )
            )}
          </View>
        )}
        {item.text.length > 0 && (
          <Text style={[s.bubbleText, isMe && s.bubbleTextMe]}>{item.text}</Text>
        )}
        <Text style={[s.time, isMe && s.timeMe]}>
          {new Date(item.createdAt).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
    )
  }

  return (
    <SafeAreaView style={s.safe}>
      {/* ── Header ── */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.white} />
        </TouchableOpacity>
        <View style={s.headerAvatar}>
          <Text style={s.headerAvatarText}>{(providerName ?? 'P')[0].toUpperCase()}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.headerName}>{providerName ?? 'Provider'}</Text>
          <Text style={s.headerSub}>Booking #{bookingId?.slice(-6).toUpperCase()}</Text>
        </View>
        <TouchableOpacity onPress={pickFile} style={s.headerFileBtn}>
          <Ionicons name="attach" size={20} color={colors.gray400} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>

        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={m => m.id}
          renderItem={renderItem}
          contentContainerStyle={s.list}
          ListEmptyComponent={
            <View style={s.empty}>
              <Ionicons name="chatbubble-ellipses-outline" size={48} color={colors.gray200} />
              <Text style={s.emptyTitle}>No messages yet</Text>
              <Text style={s.emptySub}>Start the conversation below</Text>
            </View>
          }
        />

        {/* Pending attachment previews */}
        {pending.length > 0 && (
          <View style={s.pendingStrip}>
            {pending.map((p, i) => (
              <View key={i} style={s.pendingThumb}>
                {p.type === 'image' ? (
                  <Image source={{ uri: p.localUri }} style={s.pendingImg} resizeMode="cover" />
                ) : (
                  <View style={s.pendingFile}>
                    <Ionicons name="document-outline" size={22} color={colors.gray400} />
                    <Text style={s.pendingFileName} numberOfLines={1}>{p.fileName}</Text>
                  </View>
                )}
                {p.uploading ? (
                  <View style={s.pendingOverlay}>
                    <ActivityIndicator color="#fff" size="small" />
                  </View>
                ) : (
                  <TouchableOpacity style={s.pendingRemove} onPress={() => removePending(p.localUri)}>
                    <Ionicons name="close" size={10} color="#fff" />
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </View>
        )}

        {/* ── Input bar ── */}
        <View style={s.inputBar}>
          {/* Camera + Gallery side by side */}
          <View style={s.mediaButtons}>
            <TouchableOpacity style={s.mediaBtn} onPress={pickCamera} activeOpacity={0.7}>
              <Ionicons name="camera" size={20} color={colors.black} />
            </TouchableOpacity>
            <TouchableOpacity style={s.mediaBtn} onPress={pickGallery} activeOpacity={0.7}>
              <Ionicons name="image" size={20} color={colors.black} />
            </TouchableOpacity>
          </View>

          {/* Text input */}
          <TextInput
            style={s.input}
            value={text}
            onChangeText={setText}
            placeholder="Message…"
            placeholderTextColor={colors.gray400}
            multiline
            returnKeyType="send"
            onSubmitEditing={send}
          />

          {/* Send */}
          <TouchableOpacity
            style={[s.sendBtn, !canSend && s.sendBtnOff]}
            onPress={send}
            disabled={!canSend}
            activeOpacity={0.85}
          >
            {sending
              ? <ActivityIndicator color="#fff" size="small" />
              : <Ionicons name="arrow-up" size={18} color={canSend ? colors.white : colors.gray400} />}
          </TouchableOpacity>
        </View>

      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe:             { flex: 1, backgroundColor: colors.gray50 },

  // Header
  header:           { backgroundColor: colors.black, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 12, gap: 10 },
  backBtn:          { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerAvatar:     { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.black2, borderWidth: 1.5, borderColor: colors.gold, alignItems: 'center', justifyContent: 'center' },
  headerAvatarText: { fontSize: 14, fontWeight: '700', color: colors.gold },
  headerName:       { fontSize: 14, fontWeight: '700', color: colors.white },
  headerSub:        { fontSize: 10, color: colors.gray400, marginTop: 1 },
  headerFileBtn:    { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },

  list:             { padding: 16, gap: 10, flexGrow: 1 },

  // Bubbles
  bubble:           { maxWidth: '82%', marginBottom: 2 },
  bubbleMe:         { alignSelf: 'flex-end' },
  bubbleThem:       { alignSelf: 'flex-start' },
  senderName:       { fontSize: 10, color: colors.gray400, marginBottom: 4, fontWeight: '600', letterSpacing: 0.2 },
  bubbleText:       {
    fontSize: 14,
    color: colors.black,
    lineHeight: 20,
    backgroundColor: colors.white,
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bubbleTextMe:     {
    color: colors.white,
    backgroundColor: colors.black,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 4,
  },
  time:             { fontSize: 10, color: colors.gray400, marginTop: 4, textAlign: 'right' },
  timeMe:           { color: colors.gray400 },

  // Attachments in bubbles
  attachGrid:       { gap: 4, marginBottom: 4 },
  attachImg:        { width: 220, height: 165, borderRadius: 14 },
  filePill:         {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.white, borderRadius: 12, padding: 10,
    borderWidth: 1, borderColor: colors.gray100,
  },
  filePillMe:       { backgroundColor: 'rgba(255,255,255,0.15)', borderColor: 'rgba(255,255,255,0.2)' },
  filePillName:     { flex: 1, fontSize: 12, color: colors.black, fontWeight: '500' },
  filePillNameMe:   { color: colors.white },

  // Pending strip
  pendingStrip:     {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8,
    paddingHorizontal: 12, paddingVertical: 10,
    backgroundColor: colors.white, borderTopWidth: 1, borderTopColor: colors.gray100,
  },
  pendingThumb:     { width: 68, height: 68, borderRadius: 12, overflow: 'hidden', backgroundColor: colors.gray50 },
  pendingImg:       { width: '100%', height: '100%' },
  pendingFile:      { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 6, gap: 4 },
  pendingFileName:  { fontSize: 8, color: colors.gray400, textAlign: 'center' },
  pendingOverlay:   { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' },
  pendingRemove:    {
    position: 'absolute', top: 4, right: 4,
    backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 10,
    width: 18, height: 18, alignItems: 'center', justifyContent: 'center',
  },

  // Input bar
  inputBar:         {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.gray100,
    gap: 8,
  },

  // Camera + Gallery buttons side by side
  mediaButtons:     { flexDirection: 'row', gap: 6, alignItems: 'center' },
  mediaBtn:         {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: colors.gray50,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.gray100,
  },

  // Text input
  input:            {
    flex: 1,
    backgroundColor: colors.gray50,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 9,
    fontSize: 14,
    color: colors.black,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: colors.gray100,
  },

  // Send button
  sendBtn:          { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.black, alignItems: 'center', justifyContent: 'center' },
  sendBtnOff:       { backgroundColor: colors.gray100 },

  // Empty state
  empty:            { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80, gap: 10 },
  emptyTitle:       { fontSize: 15, fontWeight: '700', color: colors.black },
  emptySub:         { fontSize: 13, color: colors.gray400 },
})
