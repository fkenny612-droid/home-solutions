import { Tabs } from 'expo-router'
import { colors } from '../../constants/theme'

export default function ProviderLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: '#fff', borderTopColor: '#EDE8E0', height: 60, paddingBottom: 8 },
        tabBarActiveTintColor: colors.gold,
        tabBarInactiveTintColor: colors.textLight,
        tabBarLabelStyle: { fontSize: 10, fontWeight: '500' },
      }}
    >
      <Tabs.Screen name="index"      options={{ title: 'Earnings',   tabBarIcon: ({ color }) => <TabIcon emoji="💰" color={color} /> }} />
      <Tabs.Screen name="jobs"       options={{ title: 'Jobs',       tabBarIcon: ({ color }) => <TabIcon emoji="🔧" color={color} /> }} />
      <Tabs.Screen name="onboarding" options={{ title: 'Profile',    tabBarIcon: ({ color }) => <TabIcon emoji="👤" color={color} /> }} />
    </Tabs>
  )
}

function TabIcon({ emoji, color }: { emoji: string; color: string }) {
  const { Text } = require('react-native')
  return <Text style={{ fontSize: 18, opacity: color === colors.gold ? 1 : 0.5 }}>{emoji}</Text>
}
