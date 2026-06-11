import { Tabs } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { colors } from '../../constants/theme'

type IconName = React.ComponentProps<typeof Ionicons>['name']

const PROVIDER_TABS: { name: string; label: string; icon: IconName; iconActive: IconName }[] = [
  { name: 'index',      label: 'Earnings', icon: 'wallet-outline',          iconActive: 'wallet'           },
  { name: 'jobs',       label: 'Jobs',     icon: 'construct-outline',        iconActive: 'construct'        },
  { name: 'onboarding', label: 'Verify',   icon: 'shield-checkmark-outline', iconActive: 'shield-checkmark' },
  { name: 'profile',    label: 'Profile',  icon: 'person-outline',           iconActive: 'person'           },
]

export default function ProviderLayout() {
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
      {PROVIDER_TABS.map(tab => (
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
      <Tabs.Screen name="materials"     options={{ href: null }} />
      <Tabs.Screen name="subscription"  options={{ href: null }} />
      <Tabs.Screen name="notifications" options={{ href: null }} />
      <Tabs.Screen name="edit-profile"  options={{ href: null }} />
      <Tabs.Screen name="reviews"       options={{ href: null }} />
      <Tabs.Screen name="bank-account"  options={{ href: null }} />
      <Tabs.Screen name="availability"  options={{ href: null }} />
      <Tabs.Screen name="service-area"  options={{ href: null }} />
    </Tabs>
  )
}
