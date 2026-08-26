import { BlurView } from 'expo-blur';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon, IconName } from '../Icon';
import { GLASS } from './tokens';

// Composant présentationnel — pas encore branché à expo-router (voir
// app/(tabs)/_layout.tsx pour l'intégration réelle via un `tabBar` custom,
// hors périmètre de cette passe).

export interface GlassTabBarItem {
  key: string;
  label: string;
  icon: IconName;
  active?: boolean;
  onPress: () => void;
}

interface GlassTabBarProps {
  items: GlassTabBarItem[];
}

export function GlassTabBar({ items }: GlassTabBarProps) {
  const insets = useSafeAreaInsets();
  return (
    <BlurView intensity={30} tint="dark" style={[styles.bar, { paddingBottom: insets.bottom }]}>
      <View style={styles.row}>
        {items.map((item) => (
          <Pressable key={item.key} onPress={item.onPress} style={styles.item} hitSlop={6}>
            <Icon name={item.icon} size={22} color={item.active ? GLASS.brand : 'rgba(255,255,255,0.5)'} />
            <Text style={[styles.label, item.active && styles.labelActive]}>{item.label}</Text>
          </Pressable>
        ))}
      </View>
    </BlurView>
  );
}

const styles = StyleSheet.create({
  bar: {
    borderTopWidth: 1, borderTopColor: GLASS.border,
  },
  row: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around',
    paddingTop: 10, paddingBottom: 4,
  },
  item: { alignItems: 'center', gap: 4 },
  label: { fontFamily: 'Inter', fontWeight: '500', fontSize: 11, color: 'rgba(255,255,255,0.5)' },
  labelActive: { color: GLASS.brand, fontWeight: '600' },
});
