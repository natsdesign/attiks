import { useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { Session } from '@/lib/types';
import { SessionCard } from '@/components/SessionCard';
import { GradientOrb } from '@/components/GradientOrb';
import { useTheme } from '@/lib/theme';

export default function HistoryScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
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

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
      <GradientOrb />
      <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 }}>
        <Text style={{ color: theme.textPrimary, fontSize: 24, fontWeight: '900' }}>Historique</Text>
      </View>

      <ScrollView style={{ flex: 1, paddingHorizontal: 20, paddingTop: 8 }} contentContainerStyle={{ paddingBottom: bottomPad }}>
        {loading ? (
          <Text style={{ color: theme.textMuted, fontSize: 14, textAlign: 'center', paddingVertical: 40 }}>
            Chargement…
          </Text>
        ) : sessions.length === 0 ? (
          <View style={{ alignItems: 'center', paddingVertical: 80 }}>
            <Text style={{ fontSize: 48, marginBottom: 16 }}>📊</Text>
            <Text style={{ color: theme.textMuted, fontSize: 14 }}>Aucune séance pour l'instant.</Text>
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
