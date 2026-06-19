import { useEffect, useState } from 'react';
import { Alert, Dimensions, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { Icon, IconName } from '@/components/Icon';

const SCREEN_W = Dimensions.get('window').width;
const GRID_PADDING = 40;
const GRID_COLS = 10;
const GRID_GAP = 6;
const CELL_SIZE = Math.floor((SCREEN_W - GRID_PADDING - GRID_GAP * (GRID_COLS - 1)) / GRID_COLS);

function ActivityGrid({ userId }: { userId: string }) {
  const [activeDays, setActiveDays] = useState<Set<string>>(new Set());

  useEffect(() => {
    const since = new Date();
    since.setDate(since.getDate() - 29);
    supabase
      .from('sessions')
      .select('date')
      .eq('user_id', userId)
      .gte('date', since.toISOString())
      .then(({ data }) => {
        if (!data) return;
        setActiveDays(new Set(data.map((s) => s.date.slice(0, 10))));
      });
  }, [userId]);

  const days = Array.from({ length: 30 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (29 - i));
    return d.toISOString().slice(0, 10);
  });

  const rows = [days.slice(0, 10), days.slice(10, 20), days.slice(20, 30)];

  return (
    <View style={{ marginBottom: 24 }}>
      <Text className="text-brand font-black text-lg uppercase tracking-widest mb-3">Activité</Text>
      <View style={{ gap: GRID_GAP }}>
        {rows.map((row, ri) => (
          <View key={ri} style={{ flexDirection: 'row', gap: GRID_GAP }}>
            {row.map((day) => (
              <View
                key={day}
                style={{
                  width: CELL_SIZE,
                  height: CELL_SIZE,
                  borderRadius: 4,
                  backgroundColor: activeDays.has(day) ? '#C8F135' : '#1A1A1A',
                }}
              />
            ))}
          </View>
        ))}
      </View>
    </View>
  );
}

export default function ProfileScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [pseudo, setPseudo] = useState('');
  const [heightCm, setHeightCm] = useState<number | null>(null);
  const [latestWeight, setLatestWeight] = useState<number | null>(null);
  const [sessionCount, setSessionCount] = useState(0);
  const [prCount, setPrCount] = useState(0);

  useEffect(() => {
    if (!user) return;

    supabase
      .from('user_profiles')
      .select('pseudo, height_cm')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setPseudo(data.pseudo ?? '');
          setHeightCm((data as any).height_cm ?? null);
        }
      });

    supabase
      .from('weigh_ins')
      .select('weight_kg')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .limit(1)
      .single()
      .then(({ data }) => { if (data) setLatestWeight(data.weight_kg); });

    supabase
      .from('sessions')
      .select('id', { count: 'exact' })
      .eq('user_id', user.id)
      .then(({ count }) => setSessionCount(count ?? 0));

    supabase
      .from('sets')
      .select('id, sessions!inner(user_id)', { count: 'exact' })
      .eq('sessions.user_id', user.id)
      .eq('is_pr', true)
      .then(({ count }) => setPrCount(count ?? 0));
  }, [user]);

  async function handleSignOut() {
    Alert.alert('Déconnexion', 'Tu es sûr de vouloir te déconnecter ?', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Déconnexion', style: 'destructive', onPress: () => supabase.auth.signOut() },
    ]);
  }

  const initials = (pseudo || user?.email || 'A').slice(0, 1).toUpperCase();

  const subtitle = [
    heightCm ? `${heightCm}cm` : null,
    latestWeight ? `${latestWeight}kg` : null,
  ]
    .filter(Boolean)
    .join(' - ');

  return (
    <SafeAreaView className="flex-1 bg-surface">
      <ScrollView className="flex-1 px-5" contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Header */}
        <View className="flex-row items-center pt-6 pb-6 gap-4">
          <View className="w-20 h-20 rounded-full bg-[#2a2a1a] border-2 border-brand items-center justify-center">
            <Text className="text-brand font-black text-3xl">{initials}</Text>
          </View>
          <View>
            <Text className="text-white font-black text-2xl">{pseudo || 'Athlète'}</Text>
            {subtitle ? (
              <Text className="text-text-muted text-sm mt-0.5">{subtitle}</Text>
            ) : null}
          </View>
        </View>

        {/* Stats */}
        <View className="flex-row gap-3 mb-6">
          {[
            { label: 'Séances', value: String(sessionCount) },
            { label: 'Records', value: String(prCount) },
          ].map(({ label, value }) => (
            <View
              key={label}
              className="flex-1 bg-surface-raised border border-surface-border rounded-2xl p-4 items-center"
            >
              <Text className="text-brand font-black text-3xl">{value}</Text>
              <Text className="text-text-muted text-xs mt-1">{label}</Text>
            </View>
          ))}
        </View>

        {/* Activity grid */}
        {user && <ActivityGrid userId={user.id} />}

        {/* Menu */}
        <View className="bg-surface-raised border border-surface-border rounded-2xl overflow-hidden mb-8">
          {(
            [
              { label: 'Mon profil', icon: 'pencil' },
              { label: 'Objectifs', icon: 'target' },
              { label: 'Pesée', icon: 'scales' },
            ] as { label: string; icon: IconName }[]
          ).map(({ label, icon }, i) => (
            <View key={label}>
              <Pressable className="flex-row items-center px-4 py-4 active:bg-surface-border">
                <Icon name={icon} size={20} color="#C8F135" />
                <Text className="text-white flex-1 font-medium ml-3">{label}</Text>
                <Icon name="caretRight" size={16} color="#444444" />
              </Pressable>
              {i < 2 && <View className="h-px bg-surface-border mx-4" />}
            </View>
          ))}
        </View>

        {/* Sign out */}
        <Pressable onPress={handleSignOut} className="items-center py-2">
          <Text className="text-text-muted text-base">Déconnexion</Text>
        </Pressable>

        {/* DEV ONLY — reset onboarding */}
        {__DEV__ && (
          <Pressable
            onPress={async () => {
              await AsyncStorage.removeItem('attiks_onboard_v1');
              router.replace('/(onboarding)/onboard');
            }}
            className="items-center py-3 mt-2"
          >
            <Text style={{ color: '#C8F13540', fontSize: 13 }}>🔁 Rejouer l'onboarding (dev)</Text>
          </Pressable>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
