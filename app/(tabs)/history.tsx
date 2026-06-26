import { useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { Session } from '@/lib/types';
import { SessionCard } from '@/components/SessionCard';
import { GradientOrb } from '@/components/GradientOrb';

export default function HistoryScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const bottomPad = 65 + insets.bottom + 20;
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('sessions')
      .select('*, sets(*)')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .then(({ data }) => {
        setSessions(data ?? []);
        setLoading(false);
      });
  }, [user]);

  const totalVolume = sessions.reduce(
    (acc, s) => acc + (s.sets ?? []).reduce((a, set) => a + set.reps * set.weight_kg, 0),
    0
  );
  const totalPRs = sessions.reduce((acc, s) => acc + (s.sets ?? []).filter((set) => set.is_pr).length, 0);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0D1108' }}>
      <GradientOrb />
      <View className="px-5 pt-4 pb-2">
        <Text className="text-text-primary text-2xl font-black">Historique</Text>
      </View>

      {sessions.length > 0 && (
        <View className="flex-row gap-3 px-5 pb-4">
          {[
            { label: 'Séances', value: String(sessions.length) },
            { label: 'Volume total', value: `${Math.round(totalVolume / 1000)}t` },
            { label: 'Records (PR)', value: String(totalPRs) },
          ].map(({ label, value }) => (
            <View key={label} className="flex-1 bg-surface-raised border border-surface-border rounded-2xl p-3 items-center">
              <Text className="text-text-secondary text-xs mb-1">{label}</Text>
              <Text className="text-brand font-black text-xl">{value}</Text>
            </View>
          ))}
        </View>
      )}

      <ScrollView className="flex-1 px-5" contentContainerStyle={{ paddingBottom: bottomPad }}>
        {loading ? (
          <Text className="text-text-muted text-sm text-center py-10">Chargement…</Text>
        ) : sessions.length === 0 ? (
          <View className="items-center py-20">
            <Text className="text-5xl mb-4">📊</Text>
            <Text className="text-text-muted text-sm">Aucune séance pour l'instant.</Text>
          </View>
        ) : (
          sessions.map((s) => (
            <SessionCard key={s.id} session={s} onPress={() => router.push(`/session/${s.id}`)} />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
