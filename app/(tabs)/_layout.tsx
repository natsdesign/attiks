import { useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Icon, IconName } from '@/components/Icon';

const BRAND = '#C8F135';
const INACTIVE = '#555555';

const TAB_CONFIG: { name: string; label: string; icon: IconName }[] = [
  { name: 'seance',   label: 'Séance',     icon: 'barbell' },
  { name: 'programs', label: 'Programme',  icon: 'list'    },
  { name: 'history',  label: 'Historique', icon: 'clock'   },
  { name: 'profile',  label: 'Profil',     icon: 'user'    },
];

function CustomTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const visibleRoutes = state.routes.filter((r) => r.name !== 'index');
  const activeIndex = visibleRoutes.findIndex((r) => r === state.routes[state.index]);

  const iconScales = useRef(TAB_CONFIG.map(() => new Animated.Value(1))).current;

  function handlePress(index: number, routeName: string) {
    const isFocused = index === activeIndex;

    Animated.sequence([
      Animated.timing(iconScales[index], {
        toValue: 1.18,
        duration: 120,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(iconScales[index], {
        toValue: 1,
        tension: 200,
        friction: 12,
        useNativeDriver: true,
      }),
    ]).start();

    const event = navigation.emit({
      type: 'tabPress',
      target: visibleRoutes[index].key,
      canPreventDefault: true,
    });
    if (!isFocused && !event.defaultPrevented) {
      navigation.navigate(routeName);
    }
  }

  return (
    <View style={ss.wrapper} pointerEvents="box-none">
      <LinearGradient
        colors={['transparent', '#0D1108']}
        pointerEvents="none"
        style={ss.fadeGradient}
      />
      <BlurView
        intensity={80}
        tint="dark"
        style={[ss.container, { paddingBottom: insets.bottom || 16 }]}
      >
        <View style={ss.overlay} />
        <View style={ss.topBorder} />
        <View style={ss.tabs}>
          {TAB_CONFIG.map((tab, index) => {
            const isActive = index === activeIndex;
            const color = isActive ? BRAND : INACTIVE;
            return (
              <Pressable
                key={tab.name}
                style={ss.tab}
                onPress={() => handlePress(index, tab.name)}
              >
                <Animated.View style={[ss.tabInner, { transform: [{ scale: iconScales[index] }] }]}>
                  <Icon name={tab.icon} size={22} color={color} />
                  <Text style={[ss.label, { color }]}>{tab.label}</Text>
                </Animated.View>
              </Pressable>
            );
          })}
        </View>
      </BlurView>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: '#0D1108' },
        animation: 'none',
      }}
    >
      <Tabs.Screen name="seance"   options={{ title: 'Séance' }} />
      <Tabs.Screen name="programs" options={{ title: 'Programme' }} />
      <Tabs.Screen name="history"  options={{ title: 'Historique' }} />
      <Tabs.Screen name="profile"  options={{ title: 'Profil' }} />
      <Tabs.Screen name="index"    options={{ href: null }} />
    </Tabs>
  );
}

const ss = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  fadeGradient: {
    height: 80,
  },
  container: {
    overflow: 'hidden',
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(13, 17, 8, 0.55)',
  },
  topBorder: {
    height: 0.5,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  tabs: {
    flexDirection: 'row',
    paddingTop: 10,
    paddingHorizontal: 8,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 4,
  },
  tabInner: {
    alignItems: 'center',
    gap: 4,
  },
  label: {
    fontSize: 10,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
});
