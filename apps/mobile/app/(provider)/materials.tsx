/**
 * Provider Materials Screen
 * Browse hardware store products and submit a material order for a job.
 * Navigated to from the Jobs screen with bookingId param.
 */
import { useState, useEffect } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, TextInput, Alert, FlatList,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router, useLocalSearchParams } from 'expo-router'
import { colors } from '../../constants/theme'
import { useAuth } from '../../context/auth'
import { api } from '../../lib/api'

const CATEGORIES = [
  { id: 'all',        label: 'All',        emoji: '📦' },
  { id: 'plumbing',   label: 'Plumbing',   emoji: '💧' },
  { id: 'electrical', label: 'Electrical', emoji: '⚡' },
  { id: 'tiling',     label: 'Tiling',     emoji: '🪟' },
  { id: 'painting',   label: 'Painting',   emoji: '🎨' },
  { id: 'general',    label: 'General',    emoji: '🔧' },
]

interface CartItem {
  productId:  string
  name:       string
  unit:       string
  unitPrice:  number
  quantity:   number
  storeId:    string
  storeName:  string
}

export default function MaterialsScreen() {
  const { user }                    = useAuth()
  const { bookingId, serviceType }  = useLocalSearchParams<{ bookingId: string; serviceType: string }>()

  const [stores,      setStores]      = useState<any[]>([])
  const [selectedStore, setSelectedStore] = useState<any | null>(null)
  const [products,    setProducts]    = useState<any[]>([])
  const [category,    setCategory]    = useState('all')
  const [search,      setSearch]      = useState('')
  const [cart,        setCart]        = useState<CartItem[]>([])
  const [loading,     setLoading]     = useState(false)
  const [submitting,  setSubmitting]  = useState(false)
  const [tab,         setTab]         = useState<'browse' | 'cart'>('browse')
  const [notes,       setNotes]       = useState('')

  useEffect(() => {
    api.hardware.stores().then(setStores).catch(() => {})
  }, [])

  useEffect(() => {
    if (!selectedStore) return
    setLoading(true)
    const cat = category === 'all' ? undefined : category
    ;(search.trim().length > 1
      ? api.hardware.search(search, cat)
      : api.hardware.products(selectedStore.id, cat)
    ).then(setProducts).catch(() => {}).finally(() => setLoading(false))
  }, [selectedStore, category, search])

  const addToCart = (product: any) => {
    setCart(prev => {
      const existing = prev.find(i => i.productId === product.id)
      if (existing) {
        return prev.map(i => i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i)
      }
      return [...prev, {
        productId: product.id,
        name:      product.name,
        unit:      product.unit,
        unitPrice: product.price,
        quantity:  1,
        storeId:   product.storeId ?? selectedStore?.id,
        storeName: selectedStore?.name ?? '',
      }]
    })
  }

  const updateQty = (productId: string, qty: number) => {
    if (qty <= 0) {
      setCart(prev => prev.filter(i => i.productId !== productId))
    } else {
      setCart(prev => prev.map(i => i.productId === productId ? { ...i, quantity: qty } : i))
    }
  }

  const cartTotal = cart.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0)
  const cartCount = cart.reduce((sum, i) => sum + i.quantity, 0)

  const submitOrder = async () => {
    if (!user || !bookingId || cart.length === 0 || !selectedStore) return
    setSubmitting(true)
    try {
      await api.hardware.createOrder({
        bookingId,
        providerId: user.id,
        storeId:    selectedStore.id,
        notes:      notes.trim() || undefined,
        items:      cart.map(i => ({ productId: i.productId, quantity: i.quantity })),
      })
      Alert.alert(
        '✅ Order submitted',
        `${selectedStore.name} has been notified and will prepare your materials.`,
        [{ text: 'Done', onPress: () => router.back() }]
      )
    } catch {
      Alert.alert('Failed', 'Could not submit order. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <SafeAreaView style={s.safe}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Text style={s.backArrow}>←</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.title}>Order materials</Text>
          <Text style={s.sub}>Job #{bookingId?.slice(-6).toUpperCase() ?? '—'}</Text>
        </View>
        <TouchableOpacity style={s.cartBtn} onPress={() => setTab(t => t === 'cart' ? 'browse' : 'cart')}>
          <Text style={s.cartEmoji}>🛒</Text>
          {cart.length > 0 && <View style={s.cartBadge}><Text style={s.cartBadgeText}>{cartCount}</Text></View>}
        </TouchableOpacity>
      </View>

      {/* Store picker */}
      {!selectedStore && (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 14 }}>
          <Text style={s.sectionLabel}>Select a hardware store</Text>
          {stores.map(store => (
            <TouchableOpacity key={store.id} style={s.storeCard} onPress={() => setSelectedStore(store)}>
              <View style={s.storeIcon}><Text style={{ fontSize: 22 }}>🏪</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={s.storeName}>{store.name}</Text>
                <Text style={s.storeArea}>{store.areas?.join(' · ')}</Text>
                <Text style={s.storeProducts}>{store._count?.products ?? 0} products listed</Text>
              </View>
              <Text style={s.storeArrow}>›</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Browse tab */}
      {selectedStore && tab === 'browse' && (
        <>
          {/* Store + search */}
          <View style={s.storeBar}>
            <TouchableOpacity onPress={() => setSelectedStore(null)} style={s.changeStore}>
              <Text style={s.changeStoreText}>🏪 {selectedStore.name} ›</Text>
            </TouchableOpacity>
          </View>

          <View style={s.searchBar}>
            <Text style={s.searchIcon}>🔍</Text>
            <TextInput
              style={s.searchInput}
              value={search}
              onChangeText={setSearch}
              placeholder="Search products…"
              placeholderTextColor={colors.textLight}
            />
          </View>

          {/* Categories */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.catScroll} contentContainerStyle={{ paddingHorizontal: 14, gap: 8, paddingVertical: 8 }}>
            {CATEGORIES.map(c => (
              <TouchableOpacity
                key={c.id}
                style={[s.catChip, category === c.id && s.catChipSel]}
                onPress={() => setCategory(c.id)}
              >
                <Text style={{ fontSize: 14 }}>{c.emoji}</Text>
                <Text style={[s.catLabel, category === c.id && s.catLabelSel]}>{c.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Products */}
          {loading ? (
            <View style={s.center}><ActivityIndicator color={colors.gold} /></View>
          ) : (
            <FlatList
              data={products}
              keyExtractor={p => p.id}
              contentContainerStyle={{ padding: 14, gap: 8 }}
              renderItem={({ item }) => {
                const inCart = cart.find(c => c.productId === item.id)
                return (
                  <View style={s.productCard}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.productName}>{item.name}</Text>
                      <Text style={s.productMeta}>SKU: {item.sku ?? '—'} · per {item.unit}</Text>
                      {item.store && <Text style={s.productStore}>🏪 {item.store.name}</Text>}
                    </View>
                    <View style={s.productRight}>
                      <Text style={s.productPrice}>R{item.price.toFixed(2)}</Text>
                      {inCart ? (
                        <View style={s.qtyRow}>
                          <TouchableOpacity style={s.qtyBtn} onPress={() => updateQty(item.id, inCart.quantity - 1)}>
                            <Text style={s.qtyBtnText}>−</Text>
                          </TouchableOpacity>
                          <Text style={s.qtyVal}>{inCart.quantity}</Text>
                          <TouchableOpacity style={s.qtyBtn} onPress={() => updateQty(item.id, inCart.quantity + 1)}>
                            <Text style={s.qtyBtnText}>+</Text>
                          </TouchableOpacity>
                        </View>
                      ) : (
                        <TouchableOpacity style={s.addBtn} onPress={() => addToCart(item)}>
                          <Text style={s.addBtnText}>Add</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                )
              }}
              ListEmptyComponent={
                <View style={s.center}>
                  <Text style={s.emptyEmoji}>📦</Text>
                  <Text style={s.emptyText}>No products found</Text>
                </View>
              }
            />
          )}
        </>
      )}

      {/* Cart tab */}
      {selectedStore && tab === 'cart' && (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 14 }}>
          <Text style={s.sectionLabel}>Your cart · {selectedStore.name}</Text>

          {cart.length === 0 ? (
            <View style={[s.center, { marginTop: 40 }]}>
              <Text style={s.emptyEmoji}>🛒</Text>
              <Text style={s.emptyText}>Your cart is empty</Text>
              <TouchableOpacity onPress={() => setTab('browse')} style={s.browseBtn}>
                <Text style={s.browseBtnText}>Browse products →</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {cart.map(item => (
                <View key={item.productId} style={s.cartItem}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.cartItemName}>{item.name}</Text>
                    <Text style={s.cartItemMeta}>R{item.unitPrice.toFixed(2)} per {item.unit}</Text>
                  </View>
                  <View style={s.qtyRow}>
                    <TouchableOpacity style={s.qtyBtn} onPress={() => updateQty(item.productId, item.quantity - 1)}>
                      <Text style={s.qtyBtnText}>−</Text>
                    </TouchableOpacity>
                    <Text style={s.qtyVal}>{item.quantity}</Text>
                    <TouchableOpacity style={s.qtyBtn} onPress={() => updateQty(item.productId, item.quantity + 1)}>
                      <Text style={s.qtyBtnText}>+</Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={s.cartItemTotal}>R{(item.unitPrice * item.quantity).toFixed(2)}</Text>
                </View>
              ))}

              <View style={s.cartTotalRow}>
                <Text style={s.cartTotalLabel}>Total</Text>
                <Text style={s.cartTotalVal}>R {cartTotal.toFixed(2)}</Text>
              </View>

              <Text style={[s.sectionLabel, { marginTop: 16 }]}>Notes for the store</Text>
              <TextInput
                style={s.notesInput}
                value={notes}
                onChangeText={setNotes}
                placeholder="e.g. Need materials ready by 9am tomorrow"
                placeholderTextColor={colors.textLight}
                multiline
                numberOfLines={3}
              />

              <TouchableOpacity
                style={[s.submitBtn, submitting && { opacity: 0.7 }]}
                onPress={submitOrder}
                disabled={submitting}
              >
                {submitting
                  ? <ActivityIndicator color={colors.navy} />
                  : <Text style={s.submitBtnText}>📦  Submit order to {selectedStore.name}</Text>}
              </TouchableOpacity>

              <Text style={s.submitNote}>The store will be notified immediately via SMS</Text>
            </>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe:            { flex: 1, backgroundColor: colors.cream },
  header:          { backgroundColor: colors.navy, padding: 14, paddingBottom: 16, flexDirection: 'row', alignItems: 'center', gap: 10 },
  backBtn:         { width: 32, height: 32, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  backArrow:       { color: '#fff', fontSize: 16 },
  title:           { fontSize: 16, fontWeight: '600', color: '#fff' },
  sub:             { fontSize: 11, color: 'rgba(255,255,255,0.45)', marginTop: 1 },
  cartBtn:         { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  cartEmoji:       { fontSize: 22 },
  cartBadge:       { position: 'absolute', top: 0, right: 0, backgroundColor: colors.red, borderRadius: 8, minWidth: 16, height: 16, alignItems: 'center', justifyContent: 'center' },
  cartBadgeText:   { fontSize: 9, color: '#fff', fontWeight: '700' },
  storeBar:        { backgroundColor: '#fff', paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.creamMid },
  changeStore:     { alignSelf: 'flex-start' },
  changeStoreText: { fontSize: 13, color: colors.gold, fontWeight: '600' },
  searchBar:       { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', paddingHorizontal: 14, paddingVertical: 10, gap: 8, borderBottomWidth: 1, borderBottomColor: colors.creamMid },
  searchIcon:      { fontSize: 14 },
  searchInput:     { flex: 1, fontSize: 14, color: colors.text },
  catScroll:       { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: colors.creamMid },
  catChip:         { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: colors.creamMid, backgroundColor: colors.cream },
  catChipSel:      { borderColor: colors.gold, backgroundColor: '#FFFBF0' },
  catLabel:        { fontSize: 12, color: colors.textMuted },
  catLabelSel:     { color: colors.gold, fontWeight: '600' },
  sectionLabel:    { fontSize: 10, color: colors.textLight, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10, fontWeight: '500' },
  storeCard:       { backgroundColor: '#fff', borderRadius: 12, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10, borderWidth: 1, borderColor: colors.creamMid },
  storeIcon:       { width: 44, height: 44, borderRadius: 10, backgroundColor: colors.creamMid, alignItems: 'center', justifyContent: 'center' },
  storeName:       { fontSize: 14, fontWeight: '600', color: colors.text },
  storeArea:       { fontSize: 11, color: colors.textLight, marginTop: 2 },
  storeProducts:   { fontSize: 11, color: colors.accent, marginTop: 2 },
  storeArrow:      { fontSize: 18, color: colors.textLight },
  productCard:     { backgroundColor: '#fff', borderRadius: 10, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: colors.creamMid },
  productName:     { fontSize: 13, fontWeight: '500', color: colors.text },
  productMeta:     { fontSize: 10, color: colors.textLight, marginTop: 2 },
  productStore:    { fontSize: 10, color: colors.accent, marginTop: 2 },
  productRight:    { alignItems: 'flex-end', gap: 6 },
  productPrice:    { fontSize: 14, fontWeight: '700', color: colors.navy },
  addBtn:          { backgroundColor: colors.gold, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 6 },
  addBtnText:      { fontSize: 12, fontWeight: '600', color: colors.navy },
  qtyRow:          { flexDirection: 'row', alignItems: 'center', gap: 8 },
  qtyBtn:          { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.creamMid, alignItems: 'center', justifyContent: 'center' },
  qtyBtnText:      { fontSize: 16, color: colors.text, lineHeight: 20 },
  qtyVal:          { fontSize: 14, fontWeight: '600', color: colors.text, minWidth: 24, textAlign: 'center' },
  cartItem:        { backgroundColor: '#fff', borderRadius: 10, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8, borderWidth: 1, borderColor: colors.creamMid },
  cartItemName:    { fontSize: 13, fontWeight: '500', color: colors.text },
  cartItemMeta:    { fontSize: 10, color: colors.textLight, marginTop: 2 },
  cartItemTotal:   { fontSize: 13, fontWeight: '700', color: colors.accent, minWidth: 70, textAlign: 'right' },
  cartTotalRow:    { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderTopWidth: 1, borderTopColor: colors.creamMid, marginTop: 4 },
  cartTotalLabel:  { fontSize: 15, fontWeight: '600', color: colors.text },
  cartTotalVal:    { fontSize: 18, fontWeight: '700', color: colors.navy },
  notesInput:      { backgroundColor: '#fff', borderRadius: 10, padding: 12, fontSize: 13, color: colors.text, borderWidth: 1, borderColor: colors.creamMid, height: 80, textAlignVertical: 'top', marginBottom: 16 },
  submitBtn:       { backgroundColor: colors.gold, borderRadius: 12, padding: 16, alignItems: 'center' },
  submitBtnText:   { fontSize: 14, fontWeight: '600', color: colors.navy },
  submitNote:      { textAlign: 'center', fontSize: 11, color: colors.textLight, marginTop: 8 },
  center:          { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  emptyEmoji:      { fontSize: 40, marginBottom: 8 },
  emptyText:       { fontSize: 14, color: colors.textMuted },
  browseBtn:       { marginTop: 16, backgroundColor: colors.gold, borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10 },
  browseBtnText:   { fontSize: 13, fontWeight: '600', color: colors.navy },
})
