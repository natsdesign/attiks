import { useEffect, useRef } from 'react';
import { Animated, Easing, Modal, Pressable, StyleSheet, View, ViewStyle } from 'react-native';
import { GlassCard } from './GlassCard';
import { GLASS } from './tokens';

interface GlassModalProps {
  visible: boolean;
  onDismiss: () => void;
  children: React.ReactNode;
  contentStyle?: ViewStyle | ViewStyle[];
}

export function GlassModal({ visible, onDismiss, children, contentStyle }: GlassModalProps) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: visible ? 1 : 0,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [visible, progress]);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onDismiss}>
      <Animated.View style={[styles.backdrop, { opacity: progress }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onDismiss} />
      </Animated.View>
      <View style={styles.center} pointerEvents="box-none">
        <Animated.View
          style={{
            opacity: progress,
            transform: [{ scale: progress.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] }) }],
            width: '100%',
          }}
        >
          <GlassCard contentStyle={contentStyle} intensity={40}>
            {children}
          </GlassCard>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: GLASS.backdrop },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
});
