import { View } from 'react-native';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';

const SIZE = 400;

export function GradientOrb() {
  const cx = SIZE / 2;
  const cy = SIZE / 2;
  const r = SIZE / 2;

  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        top: -cy,
        left: 0,
        right: 0,
        alignItems: 'center',
        zIndex: 0,
      }}
    >
      <Svg width={SIZE} height={SIZE}>
        <Defs>
          <RadialGradient
            id="orb"
            cx={cx}
            cy={cy}
            rx={r}
            ry={r}
            fx={cx}
            fy={cy}
            gradientUnits="userSpaceOnUse"
          >
            <Stop offset="0%" stopColor="#C8F135" stopOpacity="0.24" />
            <Stop offset="30%" stopColor="#C8F135" stopOpacity="0.10" />
            <Stop offset="60%" stopColor="#C8F135" stopOpacity="0.03" />
            <Stop offset="100%" stopColor="#C8F135" stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Circle cx={cx} cy={cy} r={r} fill="url(#orb)" />
      </Svg>
    </View>
  );
}
