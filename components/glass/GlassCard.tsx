import { BlurView } from 'expo-blur';
import { Platform, StyleSheet, View, ViewStyle } from 'react-native';
import { GLASS } from './tokens';

interface GlassCardProps {
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
  contentStyle?: ViewStyle | ViewStyle[];
  intensity?: number;
}

export function GlassCard({ children, style, contentStyle, intensity = 20 }: GlassCardProps) {
  return (
    <View style={[styles.shadow, style]}>
      <BlurView intensity={intensity} tint="dark" style={styles.blur}>
        <View style={styles.tint} pointerEvents="none" />
        <View style={[styles.content, contentStyle]}>{children}</View>
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  shadow: {
    borderRadius: GLASS.radius,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.18,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
      },
      android: { elevation: 3 },
    }),
  },
  blur: {
    borderRadius: GLASS.radius,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: GLASS.border,
    borderTopColor: GLASS.borderTop,
  },
  tint: { ...StyleSheet.absoluteFill, backgroundColor: GLASS.tint },
  content: { padding: 14 },
});
