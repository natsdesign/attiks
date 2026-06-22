import { useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { supabase } from '@/lib/supabase';
import type { Session, Set } from '@/lib/types';
import { GradientOrb } from '@/components/GradientOrb';

const PPL_LABELS: Record<string, string> = {
  push: 'Push', pull: 'Pull', legs: 'Legs', full: 'Full Body',
};

export default function SessionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
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
      <SafeAreaView style={{ flex: 1, backgroundColor: '#0A0D06', alignItems: 'center', justifyContent: 'center' }}>
        <GradientOrb />
        <Text className="text-text-secondary">Chargement…</Text>
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
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0A0D06' }} edges={['bottom']}>
      <GradientOrb />
      <ScrollView className="flex-1 px-5" contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Header */}
        <View className="pt-4 pb-6">
          <Text className="text-text-primary font-black text-2xl">
            {session.ppl_block ? PPL_LABELS[session.ppl_block] : 'Séance libre'}
          </Text>
          <Text className="text-text-secondary text-sm mt-1 capitalize">{dateStr}</Text>
        </View>

        {/* Stats */}
        <View className="flex-row gap-3 mb-6">
          {[
            { label: 'Durée', value: session.duration_minutes ? `${session.duration_minutes}min` : '—' },
            { label: 'Séries', value: String(sets.length) },
            { label: 'Volume', value: `${Math.round(totalVolume)}kg` },
          ].map(({ label, value }) => (
            <View key={label} className="flex-1 bg-surface-raised border border-surface-border rounded-2xl p-3 items-center">
              <Text className="text-text-secondary text-xs mb-1">{label}</Text>
              <Text className="text-text-primary font-bold text-xl">{value}</Text>
            </View>
          ))}
        </View>

        {/* PRs */}
        {prs.length > 0 && (
          <View className="bg-brand/10 border border-brand/30 rounded-2xl p-4 mb-6">
            <Text className="text-brand text-xs font-bold uppercase tracking-widest mb-2">
              🏆 Records personnels
            </Text>
            {prs.map((pr, i) => (
              <Text key={i} className="text-text-primary text-sm font-medium">
                {pr.exercise_name} — {pr.weight_kg}kg × {pr.reps}
              </Text>
            ))}
          </View>
        )}

        {/* Exercise breakdown */}
        {exercises.map((exName) => {
          const exSets = sets.filter((s) => s.exercise_name === exName);
          return (
            <View key={exName} className="mb-5">
              <Text className="text-text-primary font-bold text-base mb-2">{exName}</Text>
              <View className="bg-surface-raised border border-surface-border rounded-2xl overflow-hidden">
                <View className="flex-row px-4 py-2 border-b border-surface-border">
                  <Text className="text-text-muted text-xs w-8">#</Text>
                  <Text className="text-text-muted text-xs flex-1">Poids</Text>
                  <Text className="text-text-muted text-xs w-16 text-right">Reps</Text>
                  <Text className="text-text-muted text-xs w-16 text-right">Volume</Text>
                </View>
                {exSets.map((s, i) => (
                  <View key={i} className={`flex-row items-center px-4 py-3 ${i < exSets.length - 1 ? 'border-b border-surface-border' : ''}`}>
                    <Text className="text-text-muted text-sm w-8">{s.set_number}</Text>
                    <View className="flex-1 flex-row items-center gap-1">
                      <Text className="text-text-primary text-sm font-bold">{s.weight_kg}kg</Text>
                      {s.is_pr && (
                        <View className="bg-brand rounded px-1">
                          <Text className="text-black text-xs font-black">PR</Text>
                        </View>
                      )}
                    </View>
                    <Text className="text-text-primary text-sm w-16 text-right">{s.reps}</Text>
                    <Text className="text-text-secondary text-sm w-16 text-right">
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
