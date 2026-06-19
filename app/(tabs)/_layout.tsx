import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Tabs } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon, IconName } from '@/components/Icon';

const BRAND = '#C8F135';
const INACTIVE = '#4A5A3A';
const BG = '#0D1108';
const SURFACE = '#161D0F';

const TAB_ICONS: Record<string, IconName> = {
  index: 'house',
  programs: 'barbell',
  history: 'clock',
  profile: 'user',
};

const TAB_LABELS: Record<string, string> = {
  index: 'Accueil',
  programs: 'Programme',
  history: 'Historique',
  profile: 'Profil',
};

function CustomTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[ss.container, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      <View style={ss.bar}>
        {state.routes.map((route, index) => {
          const isFocused = state.index === index;
          const iconName = TAB_ICONS[route.name] as IconName;
          const label = TAB_LABELS[route.name];

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              style={[ss.tab, isFocused && ss.tabActive]}
            >
              <Icon name={iconName} size={20} color={isFocused ? '#0D1108' : INACTIVE} />
              {isFocused && <Text style={ss.tabLabel}>{label}</Text>}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="index" options={{ title: 'Accueil' }} />
      <Tabs.Screen name="programs" options={{ title: 'Programme' }} />
      <Tabs.Screen name="history" options={{ title: 'Historique' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profil' }} />
    </Tabs>
  );
}

const ss = StyleSheet.create({
  container: {
    backgroundColor: 'transparent',
    paddingTop: 10,
    paddingHorizontal: 16,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: SURFACE,
    borderRadius: 99,
    padding: 5,
  },
  tab: {
    height: 46,
    minWidth: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 99,
    paddingHorizontal: 8,
  },
  tabActive: {
    backgroundColor: BRAND,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 18,
  },
  tabLabel: {
    color: '#0D1108',
    fontWeight: '700',
    fontSize: 13,
  },
});
