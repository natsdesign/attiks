import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View, Vibration } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

const BRAND = '#C8F135';
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
      {/* ── REPOS + Passer ─────────────────────────── */}
      <View style={ss.topRow}>
        <Text style={ss.label}>REPOS</Text>
        {active && (
          <Pressable onPress={stop} hitSlop={12}>
            <Text style={ss.passerTxt}>Passer</Text>
          </Pressable>
        )}
      </View>

      {/* ── Anneau circulaire ──────────────────────── */}
      <View style={ss.circleWrap}>
        <Svg width={SIZE} height={SIZE}>
          {/* Track */}
          <Circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={R}
            stroke="rgba(200,241,53,0.15)"
            strokeWidth={STROKE}
            fill="none"
          />
          {/* Arc de progression */}
          <Circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={R}
            stroke={BRAND}
            strokeWidth={STROKE}
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            fill="none"
            rotation={-90}
            origin={`${SIZE / 2}, ${SIZE / 2}`}
          />
        </Svg>
        {/* Chrono centré */}
        <View style={ss.numWrap} pointerEvents="none">
          <Text style={ss.num}>
            {mins}:{secs.toString().padStart(2, '0')}
          </Text>
        </View>
      </View>

      {/* ── Presets ────────────────────────────────── */}
      <View style={ss.presetsRow}>
        {PRESETS.map(({ label, seconds }) => {
          const selected = total === seconds;
          return (
            <Pressable
              key={seconds}
              onPress={() => start(seconds)}
              style={[ss.presetBtn, selected ? ss.presetBtnOn : ss.presetBtnOff]}
            >
              <Text style={[ss.presetTxt, selected ? ss.presetTxtOn : ss.presetTxtOff]}>
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
  root: {
    width: '100%',
    alignItems: 'center',
    gap: 26,
  },

  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  label: {
    color: BRAND,
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: -0.42,
  },
  passerTxt: {
    color: BRAND,
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: -0.42,
  },

  circleWrap: {
    width: SIZE,
    height: SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numWrap: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    width: SIZE,
    height: SIZE,
  },
  num: {
    color: '#FFFFFF',
    fontSize: 64,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
    letterSpacing: -2,
  },

  presetsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  presetBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  presetBtnOn: {
    backgroundColor: 'rgba(189,208,47,0.35)',
    borderColor: BRAND,
  },
  presetBtnOff: {
    backgroundColor: 'rgba(189,208,47,0.1)',
    borderColor: 'rgba(200,241,53,0.3)',
  },
  presetTxt: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.48,
  },
  presetTxtOn: {
    color: BRAND,
  },
  presetTxtOff: {
    color: 'rgba(200,241,53,0.5)',
  },
});
