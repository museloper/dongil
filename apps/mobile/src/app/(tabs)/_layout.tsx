import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import type { IconName } from '@/components/ui';
import { useTheme } from '@/theme/theme';

const TABS: { name: string; title: string; icon: IconName; activeIcon: IconName }[] = [
  { name: 'index', title: '홈', icon: 'home-outline', activeIcon: 'home' },
  { name: 'transactions', title: '내역', icon: 'receipt-outline', activeIcon: 'receipt' },
  { name: 'stats', title: '통계', icon: 'pie-chart-outline', activeIcon: 'pie-chart' },
  { name: 'budget', title: '예산', icon: 'wallet-outline', activeIcon: 'wallet' },
  { name: 'settings', title: '설정', icon: 'settings-outline', activeIcon: 'settings' },
];

export default function TabLayout() {
  const { colors } = useTheme();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.text,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.border },
        sceneStyle: { backgroundColor: colors.bg },
      }}>
      {TABS.map((t) => (
        <Tabs.Screen
          key={t.name}
          name={t.name}
          options={{
            title: t.title,
            tabBarIcon: ({ focused, color }) => <Ionicons name={focused ? t.activeIcon : t.icon} size={24} color={color} />,
          }}
        />
      ))}
    </Tabs>
  );
}
