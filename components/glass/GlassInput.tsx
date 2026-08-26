import { BlurView } from 'expo-blur';
import { StyleSheet, TextInput, TextInputProps, View, ViewStyle } from 'react-native';
import { GLASS } from './tokens';

interface GlassInputProps extends TextInputProps {
  style?: ViewStyle | ViewStyle[];
}

export function GlassInput({ style, ...inputProps }: GlassInputProps) {
  return (
    <View style={[styles.wrapper, style]}>
      <BlurView intensity={16} tint="dark" style={styles.blur}>
        <TextInput
          placeholderTextColor={GLASS.placeholder}
          style={styles.input}
          {...inputProps}
        />
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { borderRadius: 22 },
  blur: {
    borderRadius: 22, overflow: 'hidden',
    borderWidth: 1, borderColor: GLASS.inputBorder,
    backgroundColor: GLASS.inputBg,
  },
  input: {
    fontFamily: 'Inter', fontSize: 15, color: '#FFFFFF',
    paddingHorizontal: 18, paddingVertical: 14,
  },
});
