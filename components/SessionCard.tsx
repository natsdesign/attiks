import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Session } from '@/lib/types';

const BRAND = '#C8F135';
const SURFACE = '#161D0F';
const SURFACE_RAISED = '#1E2914';
const TEXT_SECONDARY = '#59644C';
const TEXT_MUTED = 'rgba(89,100,76,0.5)';

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
  const date = new Date(session.date);
  const dateStr = date.toLocaleDateString('fr-FR', {
    weekday: 'short', day: 'numeric', month: 'short',
  });

  const totalSets = session.sets?.length ?? 0;
  const totalVolume = session.sets?.reduce((sum, s) => sum + s.weight_kg * s.reps, 0) ?? 0;
  const pr = session.sets?.find((s) => s.is_pr);

  return (
    <Pressable onPress={onPress} style={ss.card}>
      {/* top row */}
      <View style={ss.topRow}>
        <View style={{ flex: 1 }}>
          <Text style={ss.title}>
            {session.ppl_block ? PPL_LABELS[session.ppl_block] : 'Séance libre'}
          </Text>
          <Text style={ss.subtitle}>{dateStr}</Text>
        </View>
        {pr && (
          <View style={ss.prBadge}>
            <Text style={ss.prBadgeTxt}>PR</Text>
          </View>
        )}
        {session.type && !pr && (
          <View style={ss.typeBadge}>
            <Text style={ss.typeBadgeTxt}>{TYPE_LABELS[session.type]}</Text>
          </View>
        )}
      </View>

      {/* stats row */}
      <View style={ss.statsRow}>
        {totalVolume > 0 && (
          <View style={ss.stat}>
            <Text style={ss.statLabel}>Volume</Text>
            <Text style={ss.statValue}>{formatVolume(totalVolume)}</Text>
          </View>
        )}
        {session.duration_minutes != null && (
          <View style={ss.stat}>
            <Text style={ss.statLabel}>Durée</Text>
            <Text style={ss.statValue}>{session.duration_minutes}min</Text>
          </View>
        )}
        <View style={ss.stat}>
          <Text style={ss.statLabel}>Séries</Text>
          <Text style={ss.statValue}>{totalSets}</Text>
        </View>
      </View>

      {/* PR detail */}
      {pr && (
        <View style={ss.prRow}>
          <Text style={ss.prRowLabel}>PR · </Text>
          <Text style={ss.prRowValue} numberOfLines={1}>
            {pr.exercise_name} — {pr.weight_kg}kg × {pr.reps}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const ss = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(22,29,15,0.8)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(200,241,53,0.12)',
    padding: 14,
    marginBottom: 10,
  },

  topRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14 },

  title: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.72,
    textTransform: 'uppercase',
  },
  subtitle: {
    color: TEXT_SECONDARY,
    fontSize: 14,
    letterSpacing: -0.42,
    marginTop: 2,
  },

  prBadge: {
    backgroundColor: BRAND,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  prBadgeTxt: { color: '#0D1108', fontSize: 11, fontWeight: '800' },

  typeBadge: {
    backgroundColor: SURFACE_RAISED,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  typeBadgeTxt: { color: TEXT_MUTED, fontSize: 11, fontWeight: '600' },

  statsRow: { flexDirection: 'row', gap: 18 },
  stat: { gap: 4 },
  statLabel: {
    color: TEXT_MUTED,
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: -0.42,
  },
  statValue: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: -0.42,
  },

  prRow: { flexDirection: 'row', marginTop: 12, alignItems: 'center' },
  prRowLabel: { color: BRAND, fontSize: 11, fontWeight: '700' },
  prRowValue: { color: TEXT_SECONDARY, fontSize: 12, flex: 1 },
});
