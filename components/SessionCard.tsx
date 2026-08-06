import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Session } from '@/lib/types';
import { useTheme } from '@/lib/theme';

interface SessionCardProps {
  session: Session;
  onPress: () => void;
}

const PPL_LABELS: Record<string, string> = {
  push: 'Push',
  pull: 'Pull',
  legs: 'Legs',
  full: 'Full Body',
};

const TYPE_LABELS: Record<string, string> = {
  force: 'Force',
  hypertrophie: 'Hypertrophie',
};

function formatVolume(kg: number): string {
  if (kg >= 1000) return `${(kg / 1000).toFixed(1)}t`;
  return `${Math.round(kg)}kg`;
}

export function SessionCard({ session, onPress }: SessionCardProps) {
  const { theme } = useTheme();

  const date = new Date(session.date);
  const dateStr = date.toLocaleDateString('fr-FR', {
    weekday: 'short', day: 'numeric', month: 'short',
  });

  const totalSets = session.sets?.length ?? 0;
  const totalVolume = session.sets?.reduce((sum, s) => sum + s.weight_kg * s.reps, 0) ?? 0;
  const pr = session.sets?.find((s) => s.is_pr);

  return (
    <Pressable onPress={onPress} style={[ss.card, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
      {/* top row */}
      <View style={ss.topRow}>
        <View style={{ flex: 1 }}>
          <Text style={[ss.title, { color: theme.textPrimary }]}>
            {session.ppl_block ? PPL_LABELS[session.ppl_block] : 'Séance libre'}
          </Text>
          <Text style={[ss.subtitle, { color: theme.textSecondary }]}>{dateStr}</Text>
        </View>
        {pr && (
          <View style={[ss.prBadge, { backgroundColor: theme.brand }]}>
            <Text style={[ss.prBadgeTxt, { color: theme.bg }]}>PR</Text>
          </View>
        )}
        {session.type && !pr && (
          <View style={[ss.typeBadge, { backgroundColor: theme.surfaceRaised }]}>
            <Text style={[ss.typeBadgeTxt, { color: theme.textMuted }]}>{TYPE_LABELS[session.type]}</Text>
          </View>
        )}
      </View>

      {/* stats row */}
      <View style={ss.statsRow}>
        {totalVolume > 0 && (
          <View style={ss.stat}>
            <Text style={[ss.statLabel, { color: theme.textMuted }]}>Volume</Text>
            <Text style={[ss.statValue, { color: theme.textPrimary }]}>{formatVolume(totalVolume)}</Text>
          </View>
        )}
        {session.duration_minutes != null && (
          <View style={ss.stat}>
            <Text style={[ss.statLabel, { color: theme.textMuted }]}>Durée</Text>
            <Text style={[ss.statValue, { color: theme.textPrimary }]}>{session.duration_minutes}min</Text>
          </View>
        )}
        <View style={ss.stat}>
          <Text style={[ss.statLabel, { color: theme.textMuted }]}>Séries</Text>
          <Text style={[ss.statValue, { color: theme.textPrimary }]}>{totalSets}</Text>
        </View>
      </View>

      {/* PR detail */}
      {pr && (
        <View style={ss.prRow}>
          <Text style={[ss.prRowLabel, { color: theme.brand }]}>PR · </Text>
          <Text style={[ss.prRowValue, { color: theme.textSecondary }]} numberOfLines={1}>
            {pr.exercise_name} — {pr.weight_kg}kg × {pr.reps}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const ss = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
  },
  topRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14 },
  title: { fontSize: 22, fontWeight: '900', letterSpacing: -0.72, textTransform: 'uppercase' },
  subtitle: { fontSize: 14, letterSpacing: -0.42, marginTop: 2 },
  prBadge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start' },
  prBadgeTxt: { fontSize: 11, fontWeight: '800' },
  typeBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start' },
  typeBadgeTxt: { fontSize: 11, fontWeight: '600' },
  statsRow: { flexDirection: 'row', gap: 18 },
  stat: { gap: 4 },
  statLabel: { fontSize: 14, fontWeight: '700', textTransform: 'uppercase', letterSpacing: -0.42 },
  statValue: { fontSize: 14, fontWeight: '700', letterSpacing: -0.42 },
  prRow: { flexDirection: 'row', marginTop: 12, alignItems: 'center' },
  prRowLabel: { fontSize: 11, fontWeight: '700' },
  prRowValue: { fontSize: 12, flex: 1 },
});
