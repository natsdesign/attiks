import { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { ProgressionSuggestion, PRType } from '@/lib/types';

const BRAND = '#C8F135';
const SURFACE_RAISED = '#1E2914';
const SURFACE_BORDER = '#2A3A1A';
const TEXT_SECONDARY = '#8A9A7A';
const TEXT_MUTED = '#4A5A3A';

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
    <View style={[ss.row, !isConfirmed && ss.rowActive, isConfirmed && ss.rowConfirmed]}>
      {/* Set number bubble */}
      <View style={[ss.numBubble, isConfirmed && ss.numBubbleConfirmed]}>
        <Text style={[ss.numTxt, isConfirmed && ss.numTxtConfirmed]}>{setNumber}</Text>
      </View>

      <View style={{ flex: 1 }}>
        {/* Suggestion IA */}
        {suggestion && !isConfirmed && (
          <Text style={ss.suggestionTxt}>
            Essaie {formatWeight(suggestion.weight_kg)} kg × {suggestion.reps}
          </Text>
        )}
        {/* Dernière séance */}
        {lastSetInfo && !isConfirmed && (
          <Text style={ss.lastTxt}>
            Dernière fois : {formatWeight(lastSetInfo.weight_kg)} kg × {lastSetInfo.reps}
          </Text>
        )}

        <View style={ss.inputsRow}>
          {/* Poids */}
          <View style={ss.inputWrap}>
            <TextInput
              style={ss.input}
              value={weight}
              onChangeText={onWeightChange}
              keyboardType="decimal-pad"
              returnKeyType="next"
              placeholder={lastSetInfo ? formatWeight(lastSetInfo.weight_kg) : '0'}
              placeholderTextColor={TEXT_MUTED}
              onSubmitEditing={() => repsRef.current?.focus()}
              editable={!isConfirmed}
            />
            <Text style={ss.unit}>kg</Text>
          </View>

          <Text style={ss.times}>×</Text>

          {/* Reps */}
          <View style={[ss.inputWrap, ss.repsWrap]}>
            <TextInput
              ref={repsRef}
              style={ss.input}
              value={reps}
              onChangeText={onRepsChange}
              keyboardType="number-pad"
              returnKeyType="done"
              placeholder={lastSetInfo ? String(lastSetInfo.reps) : '0'}
              placeholderTextColor={TEXT_MUTED}
              onSubmitEditing={onConfirm}
              editable={!isConfirmed}
            />
            <Text style={ss.unit}>reps</Text>
          </View>

          {/* Confirm */}
          <Pressable
            onPress={onConfirm}
            disabled={isConfirmed}
            style={[ss.confirmBtn, isConfirmed && ss.confirmBtnDone]}
          >
            <Text style={[ss.confirmTxt, isConfirmed && ss.confirmTxtDone]}>✓</Text>
          </Pressable>
        </View>

        {/* PR badges */}
        {prTypes && prTypes.length > 0 && (
          <Animated.View
            style={[
              ss.prRow,
              { opacity: badgeAnim, transform: [{ scale: badgeAnim }] },
            ]}
          >
            {prTypes.map((type) => (
              <View key={type} style={ss.prBadge}>
                <Text style={ss.prBadgeTxt}>{PR_LABELS[type]}</Text>
              </View>
            ))}
          </Animated.View>
        )}
      </View>
    </View>
  );
}

const ss = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 12,
    marginBottom: 4,
  },
  rowActive: {
    backgroundColor: 'rgba(30,41,20,0.45)',
  },
  rowConfirmed: {
    opacity: 0.45,
  },

  numBubble: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: SURFACE_BORDER,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numBubbleConfirmed: {
    backgroundColor: BRAND,
  },
  numTxt: {
    color: TEXT_SECONDARY,
    fontSize: 12,
    fontWeight: '700',
  },
  numTxtConfirmed: {
    color: '#0D1108',
  },

  suggestionTxt: {
    color: BRAND,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 3,
  },
  lastTxt: {
    color: TEXT_SECONDARY,
    fontSize: 11,
    marginBottom: 6,
  },

  inputsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  inputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(13,17,8,0.5)',
    borderRadius: 12,
    paddingHorizontal: 10,
    height: 44,
  },
  repsWrap: { flex: 0, width: 72 },
  input: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  unit: {
    color: TEXT_MUTED,
    fontSize: 11,
    marginLeft: 2,
  },
  times: {
    color: TEXT_MUTED,
    fontSize: 14,
  },

  confirmBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: BRAND,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBtnDone: {
    backgroundColor: 'rgba(200, 241, 53, 0.15)',
  },
  confirmTxt: {
    color: '#0D1108',
    fontSize: 18,
    fontWeight: '800',
  },
  confirmTxtDone: {
    color: BRAND,
  },

  prRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 6,
  },
  prBadge: {
    backgroundColor: BRAND,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  prBadgeTxt: {
    color: '#0D1108',
    fontSize: 11,
    fontWeight: '800',
  },
});
