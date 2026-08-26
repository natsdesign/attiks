import { BlurView } from 'expo-blur';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GLASS } from './tokens';

interface GlassHeaderProps {
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
}

export function GlassHeader({ children, style }: GlassHeaderProps) {
  const insets = useSafeAreaInsets();
  return (
    <BlurView intensity={30} tint="dark" style={[styles.bar, { paddingTop: insets.top }, style]}>
      <View style={styles.row}>{children}</View>
    </BlurView>
  );
}

const styles = StyleSheet.create({
  bar: {
    borderBottomWidth: 1, borderBottomColor: GLASS.border,
  },
  row: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, height: 52,
  },
});
