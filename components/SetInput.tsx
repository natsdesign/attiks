import { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { ProgressionSuggestion, PRType } from '@/lib/types';
import { useTheme } from '@/lib/theme';

export interface LastSetInfo {
  reps: number;
  weight_kg: number;
}

const PR_LABELS: Record<PRType, string> = {
  absolu:  'PR ABSOLU ★',
  reps:    'PR REPS',
  volume:  'PR VOLUME',
  streak:  '6 SÉANCES / SEM.',
};

interface SetInputProps {
  setNumber: number;
  reps: string;
  weight: string;
  lastSetInfo?: LastSetInfo | null;
  suggestion?: ProgressionSuggestion | null;
  prTypes?: PRType[];
  onRepsChange: (v: string) => void;
  onWeightChange: (v: string) => void;
  onConfirm: () => void;
  isConfirmed?: boolean;
}

function formatWeight(kg: number): string {
  const rounded = Math.round(kg * 2) / 2;
  return rounded % 1 === 0 ? String(rounded) : String(rounded).replace('.', ',');
}

export function SetInput({
  setNumber,
  reps,
  weight,
  lastSetInfo,
  suggestion,
  prTypes,
  onRepsChange,
  onWeightChange,
  onConfirm,
  isConfirmed = false,
}: SetInputProps) {
  const { theme } = useTheme();
  const repsRef = useRef<TextInput>(null);
  const badgeAnim = useRef(new Animated.Value(0)).current;
  const prevPRCount = useRef(0);

  useEffect(() => {
    const count = prTypes?.length ?? 0;
    if (count > 0 && prevPRCount.current === 0) {
      Animated.spring(badgeAnim, {
        toValue: 1,
        tension: 200,
        friction: 6,
        useNativeDriver: true,
      }).start();
    }
    prevPRCount.current = count;
  }, [prTypes?.length]);

  return (
    <View style={[ss.row, !isConfirmed && { backgroundColor: theme.surfaceRaised + '73' }, isConfirmed && ss.rowConfirmed]}>
      <View style={[ss.numBubble,
        isConfirmed ? { backgroundColor: theme.brand } : { backgroundColor: theme.border }]}>
        <Text style={[ss.numTxt, { color: isConfirmed ? theme.bg : theme.textSecondary }]}>{setNumber}</Text>
      </View>

      <View style={{ flex: 1 }}>
        {suggestion && !isConfirmed && (
          <Text style={[ss.suggestionTxt, { color: theme.brand }]}>
            Essaie {formatWeight(suggestion.weight_kg)} kg × {suggestion.reps}
          </Text>
        )}
        {lastSetInfo && !isConfirmed && (
          <Text style={[ss.lastTxt, { color: theme.textSecondary }]}>
            Dernière fois : {formatWeight(lastSetInfo.weight_kg)} kg × {lastSetInfo.reps}
          </Text>
        )}

        <View style={ss.inputsRow}>
          <View style={[ss.inputWrap, { backgroundColor: theme.bg + '80' }]}>
            <TextInput
              style={[ss.input, { color: theme.textPrimary }]}
              value={weight}
              onChangeText={onWeightChange}
              keyboardType="decimal-pad"
              returnKeyType="next"
              placeholder={lastSetInfo ? formatWeight(lastSetInfo.weight_kg) : '0'}
              placeholderTextColor={theme.textMuted}
              onSubmitEditing={() => repsRef.current?.focus()}
              editable={!isConfirmed}
            />
            <Text style={[ss.unit, { color: theme.textMuted }]}>kg</Text>
          </View>

          <Text style={[ss.times, { color: theme.textMuted }]}>×</Text>

          <View style={[ss.inputWrap, ss.repsWrap, { backgroundColor: theme.bg + '80' }]}>
            <TextInput
              ref={repsRef}
              style={[ss.input, { color: theme.textPrimary }]}
              value={reps}
              onChangeText={onRepsChange}
              keyboardType="number-pad"
              returnKeyType="done"
              placeholder={lastSetInfo ? String(lastSetInfo.reps) : '0'}
              placeholderTextColor={theme.textMuted}
              onSubmitEditing={onConfirm}
              editable={!isConfirmed}
            />
            <Text style={[ss.unit, { color: theme.textMuted }]}>reps</Text>
          </View>

          <Pressable
            onPress={onConfirm}
            disabled={isConfirmed}
            style={[ss.confirmBtn,
              isConfirmed ? { backgroundColor: theme.brand + '26' } : { backgroundColor: theme.brand }]}
          >
            <Text style={[ss.confirmTxt, { color: isConfirmed ? theme.brand : theme.bg }]}>✓</Text>
          </Pressable>
        </View>

        {prTypes && prTypes.length > 0 && (
          <Animated.View style={[ss.prRow, { opacity: badgeAnim, transform: [{ scale: badgeAnim }] }]}>
            {prTypes.map((type) => (
              <View key={type} style={[ss.prBadge, { backgroundColor: theme.brand }]}>
                <Text style={[ss.prBadgeTxt, { color: theme.bg }]}>{PR_LABELS[type]}</Text>
              </View>
            ))}
          </Animated.View>
        )}
      </View>
    </View>
  );
}

const ss = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, paddingHorizontal: 6, borderRadius: 12, marginBottom: 4 },
  rowConfirmed: { opacity: 0.45 },
  numBubble: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  numTxt: { fontSize: 12, fontWeight: '700' },
  suggestionTxt: { fontSize: 12, fontWeight: '600', marginBottom: 3 },
  lastTxt: { fontSize: 11, marginBottom: 6 },
  inputsRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  inputWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', borderRadius: 12, paddingHorizontal: 10, height: 44 },
  repsWrap: { flex: 0, width: 72 },
  input: { flex: 1, fontSize: 16, fontWeight: '700', textAlign: 'center' },
  unit: { fontSize: 11, marginLeft: 2 },
  times: { fontSize: 14 },
  confirmBtn: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  confirmTxt: { fontSize: 18, fontWeight: '800' },
  prRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 6 },
  prBadge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
  prBadgeTxt: { fontSize: 11, fontWeight: '800' },
});
