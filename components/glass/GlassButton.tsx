import { useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, ViewStyle } from 'react-native';
import { Icon, IconName } from '../Icon';
import { GLASS, GLASS_SPRING } from './tokens';

type GlassButtonVariant = 'compact' | 'large';

interface GlassButtonProps {
  label: string;
  onPress: () => void;
  icon?: IconName;
  variant?: GlassButtonVariant;
  style?: ViewStyle | ViewStyle[];
}

export function GlassButton({ label, onPress, icon, variant = 'compact', style }: GlassButtonProps) {
  const scale = useRef(new Animated.Value(1)).current;

  const pressIn = () => Animated.spring(scale, { toValue: 0.96, ...GLASS_SPRING }).start();
  const pressOut = () => Animated.spring(scale, { toValue: 1, ...GLASS_SPRING }).start();

  return (
    <Pressable onPress={onPress} onPressIn={pressIn} onPressOut={pressOut} hitSlop={6}>
      <Animated.View
        style={[
          styles.base,
          variant === 'large' ? styles.large : styles.compact,
          style,
          { transform: [{ scale }] },
        ]}
      >
        <Text style={styles.label}>{label}</Text>
        {icon && <Icon name={icon} size={variant === 'large' ? 14 : 12} color={GLASS.ctaTxt} />}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
    backgroundColor: GLASS.ctaBg,
    borderWidth: 1, borderColor: GLASS.ctaBorder,
  },
  compact: {
    borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 10,
  },
  large: {
    borderRadius: 999,
    minHeight: 56,
    paddingHorizontal: 20,
  },
  label: {
    fontFamily: 'Inter', fontWeight: '700', fontSize: 13,
    color: GLASS.ctaTxt, letterSpacing: -0.3,
  },
});
