import { View } from 'react-native';

export const APP_BG = '#0A0D06';

export function GradientOrb() {
  const layers = [
    { size: 56,  opacity: 0.10 },
    { size: 110, opacity: 0.065 },
    { size: 166, opacity: 0.04 },
    { size: 240, opacity: 0.025 },
    { size: 340, opacity: 0.012 },
  ];
  return (
    <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1 }}>
      {layers.map(({ size, opacity }) => (
        <View
          key={size}
          style={{
            position: 'absolute',
            top: -(size / 2),
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: `rgba(200,241,53,${opacity})`,
            alignSelf: 'center',
          }}
        />
      ))}
    </View>
  );
}
