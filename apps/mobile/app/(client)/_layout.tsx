import { useEffect, useState } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { Tabs } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { colors } from '../../constants/theme'
import { api } from '../../lib/api'

type IconName = React.ComponentProps<typeof Ionicons>['name']

const CLIENT_TABS: { name: string; label: string; icon: IconName; iconActive: IconName }[] = [
  { name: 'index',    label: 'Home',      icon: 'home-outline',     iconActive: 'home'     },
  { name: 'bookings', label: 'Bookings',  icon: 'calendar-outline', iconActive: 'calendar' },
  { name: 'market',   label: 'Market',    icon: 'storefront-outline',   iconActive: 'storefront'   },
  { name: 'chat',     label: 'Chat',      icon: 'chatbubbles-outline',  iconActive: 'chatbubbles'  },
  { name: 'profile',  label: 'Profile',   icon: 'person-outline',       iconActive: 'person'       },
]

function BadgeIcon({ name, color, size, count }: { name: IconName; color: string; size: number; count: number }) {
  return (
    <View>
      <Ionicons name={name} size={size} color={color} />
      {count > 0 && (
        <View style={s.badge}>
          <Text style={s.badgeText}>{count > 9 ? '9+' : count}</Text>
        </View>
      )}
    </View>
  )
}

export default function ClientLayout() {
  const [unread, setUnread] = useState(0)

  useEffect(() => {
    const fetch = () => api.notifications.unreadCount().then(r => setUnread(r.count)).catch(() => {})
    fetch()
    const id = setInterval(fetch, 30_000)
    return () => clearInterval(id)
  }, [])

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.white,
          borderTopColor: colors.gray100,
          borderTopWidth: 1,
          height: 64,
          paddingBottom: 10,
          paddingTop: 8,
        },
        tabBarActiveTintColor: colors.black,
        tabBarInactiveTintColor: colors.gray400,
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600', letterSpacing: 0.2 },
      }}
    >
      {CLIENT_TABS.map(tab => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.label,
            tabBarIcon: ({ focused, color }) =>
              tab.name === 'profile' ? (
                <BadgeIcon
                  name={focused ? tab.iconActive : tab.icon}
                  size={22}
                  color={color}
                  count={unread}
                />
              ) : (
                <Ionicons name={focused ? tab.iconActive : tab.icon} size={22} color={color} />
              ),
          }}
        />
      ))}
      {/* Hide these screens from the tab bar — accessible via navigation only */}
      <Tabs.Screen name="addresses"       options={{ href: null }} />
      <Tabs.Screen name="book"            options={{ href: null }} />
      <Tabs.Screen name="history"          options={{ href: null }} />
      <Tabs.Screen name="conversation"     options={{ href: null }} />
      <Tabs.Screen name="subscription"    options={{ href: null }} />
      <Tabs.Screen name="notifications"   options={{ href: null }} />
      <Tabs.Screen name="booking-detail"  options={{ href: null }} />
      <Tabs.Screen name="edit-profile"    options={{ href: null }} />
      <Tabs.Screen name="warranties"      options={{ href: null }} />
      <Tabs.Screen name="payment-methods" options={{ href: null }} />
      <Tabs.Screen name="help"            options={{ href: null }} />
      <Tabs.Screen name="receipt"         options={{ href: null }} />
      <Tabs.Screen name="loyalty"         options={{ href: null }} />
      <Tabs.Screen name="referral"          options={{ href: null }} />
      <Tabs.Screen name="provider-profile"  options={{ href: null }} />
      <Tabs.Screen name="emergency"       options={{ href: null }} />
      <Tabs.Screen name="listing-detail" options={{ href: null }} />
      <Tabs.Screen name="post-listing"   options={{ href: null }} />
      <Tabs.Screen name="verify-id"      options={{ href: null }} />
    </Tabs>
  )
}

const s = StyleSheet.create({
  badge:     { position: 'absolute', top: -4, right: -6, minWidth: 16, height: 16, borderRadius: 8, backgroundColor: colors.red, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
  badgeText: { fontSize: 9, fontWeight: '700', color: colors.white },
})
