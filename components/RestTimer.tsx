import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View, Vibration } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useTheme } from '@/lib/theme';
const SIZE = 220;
const STROKE = 14;
const R = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * R;

const PRESETS = [
  { label: '1:30', seconds: 90 },
  { label: '2:30', seconds: 150 },
  { label: '3:00', seconds: 180 },
  { label: '4:00', seconds: 240 },
];

interface RestTimerProps {
  defaultSeconds?: number;
}

export function RestTimer({ defaultSeconds = 90 }: RestTimerProps) {
  const { theme } = useTheme();
  const [active, setActive] = useState(false);
  const [remaining, setRemaining] = useState(defaultSeconds);
  const [total, setTotal] = useState(defaultSeconds);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stop = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setActive(false);
    setRemaining(total);
  }, [total]);

  const start = useCallback((seconds: number) => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setTotal(seconds);
    setRemaining(seconds);
    setActive(true);

    intervalRef.current = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current!);
          setActive(false);
          Vibration.vibrate([0, 200, 100, 200]);
          return seconds;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  useEffect(() => () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
  }, []);

  const progress = active ? remaining / total : 1;
  const dashOffset = CIRCUMFERENCE * (1 - progress);
  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;

  return (
    <View style={ss.root}>
      <View style={ss.topRow}>
        <Text style={[ss.label, { color: theme.brand }]}>REPOS</Text>
        {active && (
          <Pressable onPress={stop} hitSlop={12}>
            <Text style={[ss.passerTxt, { color: theme.brand }]}>Passer</Text>
          </Pressable>
        )}
      </View>

      <View style={ss.circleWrap}>
        <Svg width={SIZE} height={SIZE}>
          <Circle cx={SIZE / 2} cy={SIZE / 2} r={R}
            stroke={theme.brand + '26'} strokeWidth={STROKE} fill="none" />
          <Circle cx={SIZE / 2} cy={SIZE / 2} r={R}
            stroke={theme.brand} strokeWidth={STROKE}
            strokeDasharray={CIRCUMFERENCE} strokeDashoffset={dashOffset}
            strokeLinecap="round" fill="none"
            rotation={-90} origin={`${SIZE / 2}, ${SIZE / 2}`} />
        </Svg>
        <View style={ss.numWrap} pointerEvents="none">
          <Text style={[ss.num, { color: theme.textPrimary }]}>
            {mins}:{secs.toString().padStart(2, '0')}
          </Text>
        </View>
      </View>

      <View style={ss.presetsRow}>
        {PRESETS.map(({ label, seconds }) => {
          const selected = total === seconds;
          return (
            <Pressable
              key={seconds}
              onPress={() => start(seconds)}
              style={[ss.presetBtn,
                selected
                  ? { backgroundColor: theme.brand + '59', borderColor: theme.brand }
                  : { backgroundColor: theme.brand + '1A', borderColor: theme.brand + '4D' }
              ]}
            >
              <Text style={[ss.presetTxt, { color: selected ? theme.brand : theme.brand + 'B3' }]}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const ss = StyleSheet.create({
  root: { width: '100%', alignItems: 'center', gap: 26 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%' },
  label: { fontSize: 14, fontWeight: '600', letterSpacing: -0.42 },
  passerTxt: { fontSize: 14, fontWeight: '600', letterSpacing: -0.42 },
  circleWrap: { width: SIZE, height: SIZE, alignItems: 'center', justifyContent: 'center' },
  numWrap: { position: 'absolute', alignItems: 'center', justifyContent: 'center', width: SIZE, height: SIZE },
  num: { fontSize: 64, fontWeight: '900', fontVariant: ['tabular-nums'], letterSpacing: -2 },
  presetsRow: { flexDirection: 'row', gap: 10 },
  presetBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 6, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  presetTxt: { fontSize: 16, fontWeight: '600', letterSpacing: -0.48 },
});
