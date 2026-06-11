import { Tabs } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { colors } from '../../constants/theme'

type IconName = React.ComponentProps<typeof Ionicons>['name']

const CLIENT_TABS: { name: string; label: string; icon: IconName; iconActive: IconName }[] = [
  { name: 'index',    label: 'Home',     icon: 'home-outline',     iconActive: 'home'             },
  { name: 'bookings', label: 'Bookings', icon: 'calendar-outline', iconActive: 'calendar'         },
  { name: 'history',  label: 'History',  icon: 'time-outline',     iconActive: 'time'             },
  { name: 'profile',  label: 'Profile',  icon: 'person-outline',   iconActive: 'person'           },
]

export default function ClientLayout() {
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
            tabBarIcon: ({ focused, color }) => (
              <Ionicons
                name={focused ? tab.iconActive : tab.icon}
                size={22}
                color={color}
              />
            ),
          }}
        />
      ))}
      {/* Hide these screens from the tab bar — accessible via navigation only */}
      <Tabs.Screen name="addresses"    options={{ href: null }} />
      <Tabs.Screen name="book"         options={{ href: null }} />
      <Tabs.Screen name="chat"         options={{ href: null }} />
      <Tabs.Screen name="subscription"   options={{ href: null }} />
      <Tabs.Screen name="notifications"    options={{ href: null }} />
      <Tabs.Screen name="booking-detail"  options={{ href: null }} />
      <Tabs.Screen name="edit-profile"    options={{ href: null }} />
    </Tabs>
  )
}
