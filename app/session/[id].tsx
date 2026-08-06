import { useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { supabase } from '@/lib/supabase';
import type { Session, Set } from '@/lib/types';
import { GradientOrb } from '@/components/GradientOrb';
import { useTheme } from '@/lib/theme';

const PPL_LABELS: Record<string, string> = {
  push: 'Push', pull: 'Pull', legs: 'Legs', full: 'Full Body',
};

export default function SessionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { theme } = useTheme();
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    if (!id) return;
    supabase
      .from('sessions')
      .select('*, sets(*)')
      .eq('id', id)
      .single()
      .then(({ data }) => setSession(data));
  }, [id]);

  if (!session) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg, alignItems: 'center', justifyContent: 'center' }}>
        <GradientOrb />
        <Text style={{ color: theme.textSecondary }}>Chargement…</Text>
      </SafeAreaView>
    );
  }

  const date = new Date(session.date);
  const dateStr = date.toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  const sets = session.sets ?? [];
  const exercises = [...new Set(sets.map((s) => s.exercise_name))];
  const prs = sets.filter((s) => s.is_pr);
  const totalVolume = sets.reduce((acc, s) => acc + s.reps * s.weight_kg, 0);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }} edges={['bottom']}>
      <GradientOrb />
      <ScrollView style={{ flex: 1, paddingHorizontal: 20 }} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Header */}
        <View style={{ paddingTop: 16, paddingBottom: 24 }}>
          <Text style={{ color: theme.textPrimary, fontWeight: '900', fontSize: 24 }}>
            {session.ppl_block ? PPL_LABELS[session.ppl_block] : 'Séance libre'}
          </Text>
          <Text style={{ color: theme.textSecondary, fontSize: 14, marginTop: 4, textTransform: 'capitalize' }}>
            {dateStr}
          </Text>
        </View>

        {/* Stats */}
        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 24 }}>
          {[
            { label: 'Durée', value: session.duration_minutes ? `${session.duration_minutes}min` : '—' },
            { label: 'Séries', value: String(sets.length) },
            { label: 'Volume', value: `${Math.round(totalVolume)}kg` },
          ].map(({ label, value }) => (
            <View key={label} style={{
              flex: 1,
              backgroundColor: theme.surfaceRaised,
              borderWidth: 1,
              borderColor: theme.border,
              borderRadius: 16,
              padding: 12,
              alignItems: 'center',
            }}>
              <Text style={{ color: theme.textSecondary, fontSize: 12, marginBottom: 4 }}>{label}</Text>
              <Text style={{ color: theme.textPrimary, fontWeight: '700', fontSize: 20 }}>{value}</Text>
            </View>
          ))}
        </View>

        {/* PRs */}
        {prs.length > 0 && (
          <View style={{
            backgroundColor: theme.brand + '1A',
            borderWidth: 1,
            borderColor: theme.brand + '4D',
            borderRadius: 16,
            padding: 16,
            marginBottom: 24,
          }}>
            <Text style={{ color: theme.brand, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8 }}>
              🏆 Records personnels
            </Text>
            {prs.map((pr, i) => (
              <Text key={i} style={{ color: theme.textPrimary, fontSize: 14, fontWeight: '500' }}>
                {pr.exercise_name} — {pr.weight_kg}kg × {pr.reps}
              </Text>
            ))}
          </View>
        )}

        {/* Exercise breakdown */}
        {exercises.map((exName) => {
          const exSets = sets.filter((s) => s.exercise_name === exName);
          return (
            <View key={exName} style={{ marginBottom: 20 }}>
              <Text style={{ color: theme.textPrimary, fontWeight: '700', fontSize: 16, marginBottom: 8 }}>{exName}</Text>
              <View style={{
                backgroundColor: theme.surfaceRaised,
                borderWidth: 1,
                borderColor: theme.border,
                borderRadius: 16,
                overflow: 'hidden',
              }}>
                <View style={{ flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: theme.border }}>
                  <Text style={{ color: theme.textMuted, fontSize: 12, width: 32 }}>#</Text>
                  <Text style={{ color: theme.textMuted, fontSize: 12, flex: 1 }}>Poids</Text>
                  <Text style={{ color: theme.textMuted, fontSize: 12, width: 64, textAlign: 'right' }}>Reps</Text>
                  <Text style={{ color: theme.textMuted, fontSize: 12, width: 64, textAlign: 'right' }}>Volume</Text>
                </View>
                {exSets.map((s, i) => (
                  <View key={i} style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    borderBottomWidth: i < exSets.length - 1 ? 1 : 0,
                    borderBottomColor: theme.border,
                  }}>
                    <Text style={{ color: theme.textMuted, fontSize: 14, width: 32 }}>{s.set_number}</Text>
                    <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Text style={{ color: theme.textPrimary, fontSize: 14, fontWeight: '700' }}>{s.weight_kg}kg</Text>
                      {s.is_pr && (
                        <View style={{ backgroundColor: theme.brand, borderRadius: 4, paddingHorizontal: 4 }}>
                          <Text style={{ color: theme.bg, fontSize: 12, fontWeight: '900' }}>PR</Text>
                        </View>
                      )}
                    </View>
                    <Text style={{ color: theme.textPrimary, fontSize: 14, width: 64, textAlign: 'right' }}>{s.reps}</Text>
                    <Text style={{ color: theme.textSecondary, fontSize: 14, width: 64, textAlign: 'right' }}>
                      {Math.round(s.reps * s.weight_kg)}kg
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}
