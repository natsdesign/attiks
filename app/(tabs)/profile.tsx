import { useEffect, useMemo, useState } from 'react';
import {
  Alert, Dimensions, Pressable, ScrollView, StyleSheet, Text, View,
} from 'react-native';
import Svg, { Circle, G, Line, Path, Rect, Text as SvgText } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { Icon, IconName } from '@/components/Icon';
import { MuscleMap } from '@/components/MuscleMap';
import { GradientOrb } from '@/components/GradientOrb';
import { useRecoveryScore } from '@/hooks/useRecoveryScore';
import { getMusclesForExercise } from '@/lib/muscleMapping';
import { MUSCLE_RED, MUSCLE_ORANGE } from '@/hooks/useMuscleRecovery';

const BRAND = '#C8F135';
const BG = '#0A0D06';
const SURFACE = '#161D0F';
const SURFACE_RAISED = '#1E2914';
const TEXT_SECONDARY = '#59644C';
const TEXT_MUTED = 'rgba(89,100,76,0.5)';
const { width: SW } = Dimensions.get('window');

const GRID_COLS = 10;
const GRID_GAP = 4;
const CELL = Math.floor((SW - 40 - GRID_GAP * (GRID_COLS - 1)) / GRID_COLS);

const CHART_W = SW - 40 - 32; // card padding 16 each side
const CHART_H = 130;
const CP = { t: 10, b: 24, l: 34, r: 4 }; // chart padding

// SVG muscle ID → French group name
const MUSCLE_GROUPS: Record<string, string> = {
  pec: 'Pectoraux', 'pec-2': 'Pectoraux',
  lats: 'Dos', trapezius: 'Dos', lumbar: 'Lombaires',
  'trapezius-front': 'Épaules',
  'delt-right': 'Épaules', 'delt-left': 'Épaules', delt: 'Épaules',
  biceps: 'Biceps', 'biceps-right': 'Biceps',
  triceps: 'Triceps',
  quadriceps: 'Quadriceps',
  harmstring: 'Ischio-jambiers',
  gluteus: 'Fessiers', 'gluteus-front': 'Fessiers',
  calves: 'Mollets', 'calves-front': 'Mollets',
  abs: 'Abdominaux', oblique: 'Abdominaux',
  adductor: 'Adducteurs', gracilis: 'Adducteurs',
};

interface SessionRow {
  date: string;
  sets: { exercise_name: string; reps: number; weight_kg: number }[] | null;
}

// ── Utility functions ────────────────────────────────────────────────────────

function dayVolumes(sessions: SessionRow[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const s of sessions) {
    const key = s.date.slice(0, 10);
    const vol = (s.sets ?? []).reduce((a, x) => a + x.reps * x.weight_kg, 0);
    map.set(key, (map.get(key) ?? 0) + vol);
  }
  return map;
}

function weeklyVolumes(sessions: SessionRow[]): { label: string; volume: number }[] {
  const weeks = Array.from({ length: 8 }, () => 0);
  const now = Date.now();
  for (const s of sessions) {
    const diff = Math.floor((now - new Date(s.date).getTime()) / 86_400_000);
    const w = Math.floor(diff / 7);
    if (w >= 0 && w < 8) {
      weeks[w] += (s.sets ?? []).reduce((a, x) => a + x.reps * x.weight_kg, 0);
    }
  }
  return weeks.reverse().map((volume, i) => ({ label: i === 7 ? 'Auj.' : `S-${7 - i}`, volume }));
}

function oneRMPoints(sessions: SessionRow[], exercise: string): { label: string; oneRM: number }[] {
  const exNorm = exercise.toLowerCase();
  const byDate = new Map<string, number>();
  for (const s of sessions) {
    const key = s.date.slice(0, 10);
    for (const set of s.sets ?? []) {
      if (!set.exercise_name.toLowerCase().includes(exNorm)) continue;
      if (set.reps <= 0 || set.weight_kg <= 0) continue;
      const est = set.weight_kg * (1 + set.reps / 30);
      if (!byDate.has(key) || byDate.get(key)! < est) byDate.set(key, est);
    }
  }
  return Array.from(byDate.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, oneRM]) => ({
      label: new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }),
      oneRM: Math.round(oneRM),
    }));
}

function muscleDistrib(sessions: SessionRow[]): { label: string; percent: number }[] {
  const cutoff = Date.now() - 30 * 86_400_000;
  const counts: Record<string, number> = {};
  let total = 0;
  for (const s of sessions) {
    if (new Date(s.date).getTime() < cutoff) continue;
    for (const set of s.sets ?? []) {
      const groups = new Set(getMusclesForExercise(set.exercise_name).map((m) => MUSCLE_GROUPS[m]).filter(Boolean));
      for (const g of groups) { counts[g] = (counts[g] ?? 0) + 1; total++; }
    }
  }
  if (total === 0) return [];
  return Object.entries(counts)
    .map(([label, count]) => ({ label, percent: Math.round((count / total) * 100) }))
    .sort((a, b) => b.percent - a.percent)
    .slice(0, 8);
}

function topExercises(sessions: SessionRow[]): string[] {
  const counts: Record<string, number> = {};
  for (const s of sessions)
    for (const set of s.sets ?? []) counts[set.exercise_name] = (counts[set.exercise_name] ?? 0) + 1;
  return Object.entries(counts).sort(([, a], [, b]) => b - a).slice(0, 6).map(([n]) => n);
}

// ── Sub-components ──────────────────────────────────────────────────────────

function HeatmapGrid({ volumes }: { volumes: Map<string, number> }) {
  const now = Date.now();
  const days = Array.from({ length: 90 }, (_, i) =>
    new Date(now - (89 - i) * 86_400_000).toISOString().slice(0, 10)
  );
  const rows: string[][] = [];
  for (let i = 0; i < days.length; i += GRID_COLS) rows.push(days.slice(i, i + GRID_COLS));
  const maxVol = Math.max(...Array.from(volumes.values()), 1);

  function color(v: number) {
    if (v === 0) return '#1A2210';
    const r = v / maxVol;
    if (r < 0.3) return '#3A5219';
    if (r < 0.65) return '#7FAD1B';
    return BRAND;
  }

  return (
    <View style={{ gap: GRID_GAP }}>
      {rows.map((row, ri) => (
        <View key={ri} style={{ flexDirection: 'row', gap: GRID_GAP }}>
          {row.map((day) => (
            <View key={day} style={{ width: CELL, height: CELL, borderRadius: 3, backgroundColor: color(volumes.get(day) ?? 0) }} />
          ))}
        </View>
      ))}
    </View>
  );
}

function VolumeBarChart({ data }: { data: { label: string; volume: number }[] }) {
  const maxVol = Math.max(...data.map((d) => d.volume), 1);
  const innerW = CHART_W - CP.l - CP.r;
  const innerH = CHART_H - CP.t - CP.b;
  const n = data.length;
  const gap = 5;
  const bw = (innerW - gap * (n - 1)) / n;

  if (data.every((d) => d.volume === 0)) {
    return (
      <View style={[ss.emptyChart, { width: CHART_W }]}>
        <Text style={ss.emptyChartTxt}>Aucune données pour les 8 dernières semaines.</Text>
      </View>
    );
  }

  return (
    <Svg width={CHART_W} height={CHART_H}>
      {data.map((d, i) => {
        const bh = Math.max((d.volume / maxVol) * innerH, d.volume > 0 ? 3 : 0);
        const x = CP.l + i * (bw + gap);
        const y = CP.t + innerH - bh;
        return (
          <G key={i}>
            <Rect x={x} y={y} width={bw} height={bh} rx={3} fill={BRAND} opacity={0.75} />
            <SvgText x={x + bw / 2} y={CHART_H - 6} textAnchor="middle" fontSize={8} fill={TEXT_SECONDARY}>
              {d.label}
            </SvgText>
          </G>
        );
      })}
      <Line x1={CP.l - 2} y1={CP.t} x2={CP.l - 2} y2={CP.t + innerH} stroke="rgba(200,241,53,0.1)" strokeWidth={1} />
    </Svg>
  );
}

function OneRMLineChart({ data }: { data: { label: string; oneRM: number }[] }) {
  if (data.length < 2) {
    return (
      <View style={[ss.emptyChart, { width: CHART_W }]}>
        <Text style={ss.emptyChartTxt}>Pas assez de données sur cet exercice.</Text>
      </View>
    );
  }

  const min1rm = Math.min(...data.map((d) => d.oneRM));
  const max1rm = Math.max(...data.map((d) => d.oneRM));
  const range = max1rm - min1rm || 1;
  const innerW = CHART_W - CP.l - CP.r;
  const innerH = CHART_H - CP.t - CP.b;

  const pts = data.map((d, i) => ({
    x: CP.l + (i / (data.length - 1)) * innerW,
    y: CP.t + ((max1rm - d.oneRM) / range) * innerH,
  }));

  const pathD = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const step = Math.max(1, Math.floor(data.length / 4));

  return (
    <Svg width={CHART_W} height={CHART_H}>
      {/* Axes */}
      <Line x1={CP.l - 2} y1={CP.t} x2={CP.l - 2} y2={CP.t + innerH} stroke="rgba(200,241,53,0.1)" strokeWidth={1} />
      <Line x1={CP.l - 2} y1={CP.t + innerH} x2={CHART_W - CP.r} y2={CP.t + innerH} stroke="rgba(200,241,53,0.1)" strokeWidth={1} />
      {/* Y labels */}
      <SvgText x={0} y={CP.t + 8} fontSize={9} fill={TEXT_MUTED}>{max1rm}kg</SvgText>
      <SvgText x={0} y={CP.t + innerH + 1} fontSize={9} fill={TEXT_MUTED}>{min1rm}kg</SvgText>
      {/* Line */}
      <Path d={pathD} stroke={BRAND} strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      {/* Points + X labels */}
      {pts.map((p, i) => (
        <G key={i}>
          <Circle cx={p.x} cy={p.y} r={3.5} fill={BRAND} />
          {(i % step === 0 || i === data.length - 1) && (
            <SvgText x={p.x} y={CHART_H - 6} textAnchor="middle" fontSize={8} fill={TEXT_SECONDARY}>
              {data[i].label}
            </SvgText>
          )}
        </G>
      ))}
    </Svg>
  );
}

// ── Main screen ─────────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const { score, muscleColors } = useRecoveryScore(user?.id);

  const [pseudo, setPseudo] = useState('');
  const [heightCm, setHeightCm] = useState<number | null>(null);
  const [latestWeight, setLatestWeight] = useState<number | null>(null);
  const [sessionCount, setSessionCount] = useState(0);
  const [prCount, setPrCount] = useState(0);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [selectedEx, setSelectedEx] = useState<string | null>(null);

  const dayVols = useMemo(() => dayVolumes(sessions), [sessions]);
  const weekVols = useMemo(() => weeklyVolumes(sessions), [sessions]);
  const topEx = useMemo(() => topExercises(sessions), [sessions]);
  const oneRM = useMemo(() => (selectedEx ? oneRMPoints(sessions, selectedEx) : []), [sessions, selectedEx]);
  const distrib = useMemo(() => muscleDistrib(sessions), [sessions]);

  const fatiguedGroups = useMemo(() => {
    const map = new Map<string, typeof MUSCLE_RED | typeof MUSCLE_ORANGE>();
    for (const [id, color] of Object.entries(muscleColors)) {
      const group = MUSCLE_GROUPS[id];
      if (!group) continue;
      if (color === MUSCLE_RED || !map.has(group)) map.set(group, color);
    }
    return Array.from(map.entries()).sort(([, a], [, b]) =>
      a === MUSCLE_RED && b !== MUSCLE_RED ? -1 : b === MUSCLE_RED && a !== MUSCLE_RED ? 1 : 0
    );
  }, [muscleColors]);

  useEffect(() => {
    if (!user) return;

    supabase.from('user_profiles').select('pseudo, height_cm').eq('id', user.id).single()
      .then(({ data }) => {
        if (data) { setPseudo(data.pseudo ?? ''); setHeightCm((data as any).height_cm ?? null); }
      });

    supabase.from('weigh_ins').select('weight_kg').eq('user_id', user.id)
      .order('date', { ascending: false }).limit(1).single()
      .then(({ data }) => { if (data) setLatestWeight(data.weight_kg); });

    supabase.from('sessions').select('id', { count: 'exact' }).eq('user_id', user.id)
      .then(({ count }) => setSessionCount(count ?? 0));

    supabase.from('sets').select('id, sessions!inner(user_id)', { count: 'exact' })
      .eq('sessions.user_id', user.id).eq('is_pr', true)
      .then(({ count }) => setPrCount(count ?? 0));

    const since = new Date();
    since.setDate(since.getDate() - 90);
    supabase.from('sessions')
      .select('date, sets(exercise_name, reps, weight_kg)')
      .eq('user_id', user.id)
      .gte('date', since.toISOString())
      .order('date', { ascending: true })
      .then(({ data }) => {
        const list = (data ?? []) as SessionRow[];
        setSessions(list);
        const top = topExercises(list);
        if (top.length > 0) setSelectedEx(top[0]);
      });
  }, [user]);

  async function handleSignOut() {
    Alert.alert('Déconnexion', 'Tu es sûr de vouloir te déconnecter ?', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Déconnexion', style: 'destructive', onPress: () => supabase.auth.signOut() },
    ]);
  }

  const initials = (pseudo || user?.email || 'A').slice(0, 1).toUpperCase();
  const subtitle = [heightCm ? `${heightCm} cm` : null, latestWeight ? `${latestWeight} kg` : null].filter(Boolean).join(' · ');

  return (
    <SafeAreaView style={ss.root}>
      <GradientOrb />
      <ScrollView contentContainerStyle={ss.scroll} showsVerticalScrollIndicator={false}>

        {/* ── HEADER ───────────────────────────────────────── */}
        <View style={ss.header}>
          <View style={ss.avatar}>
            <Text style={ss.avatarTxt}>{initials}</Text>
          </View>
          <View style={ss.headerInfo}>
            <Text style={ss.headerName}>{pseudo || 'Athlète'}</Text>
            {!!subtitle && <Text style={ss.headerSub}>{subtitle}</Text>}
          </View>
        </View>

        {/* ── STATS RAPIDES ───────────────────────────────── */}
        <View style={ss.statsRow}>
          {[
            { label: 'Séances', value: String(sessionCount) },
            { label: 'Records', value: String(prCount) },
          ].map(({ label, value }) => (
            <View key={label} style={ss.statCard}>
              <Text style={ss.statValue}>{value}</Text>
              <Text style={ss.statLabel}>{label}</Text>
            </View>
          ))}
        </View>

        {/* ── RÉCUPÉRATION MUSCULAIRE ──────────────────────── */}
        <View style={ss.section}>
          <Text style={ss.sectionLabel}>RÉCUPÉRATION MUSCULAIRE</Text>
          <View style={ss.card}>
            <MuscleMap muscleColors={muscleColors} />
            {fatiguedGroups.length > 0 ? (
              <View style={ss.muscleList}>
                {fatiguedGroups.map(([group, color]) => (
                  <View key={group} style={ss.muscleRow}>
                    <View style={[ss.muscleDot, { backgroundColor: color }]} />
                    <Text style={ss.muscleLabel}>{group}</Text>
                    <Text style={ss.muscleTime}>
                      {color === MUSCLE_RED ? '< 24h restantes' : '24–36h restantes'}
                    </Text>
                  </View>
                ))}
              </View>
            ) : (
              <View style={ss.muscleAllGood}>
                <Text style={ss.muscleAllGoodTxt}>Tous les muscles sont prêts</Text>
              </View>
            )}
          </View>
        </View>

        {/* ── ACTIVITÉ 90 JOURS ───────────────────────────── */}
        <View style={ss.section}>
          <Text style={ss.sectionLabel}>ACTIVITÉ · 90 JOURS</Text>
          <View style={ss.card}>
            <HeatmapGrid volumes={dayVols} />
            <View style={ss.heatLegend}>
              {[['#1A2210', 'Repos'], ['#3A5219', 'Léger'], ['#7FAD1B', 'Moyen'], [BRAND, 'Intense']] .map(([c, l]) => (
                <View key={l} style={ss.heatLegendItem}>
                  <View style={[ss.heatDot, { backgroundColor: c as string }]} />
                  <Text style={ss.heatLegendTxt}>{l}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* ── 1RM ESTIMÉ ──────────────────────────────────── */}
        <View style={ss.section}>
          <Text style={ss.sectionLabel}>1RM ESTIMÉ</Text>
          <View style={ss.card}>
            {topEx.length > 0 ? (
              <>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={ss.chipScroll}
                  contentContainerStyle={{ gap: 8, paddingBottom: 14 }}
                >
                  {topEx.map((ex) => (
                    <Pressable
                      key={ex}
                      onPress={() => setSelectedEx(ex)}
                      style={[ss.chip, selectedEx === ex && ss.chipActive]}
                    >
                      <Text style={[ss.chipTxt, selectedEx === ex && ss.chipTxtActive]} numberOfLines={1}>
                        {ex}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
                <OneRMLineChart data={oneRM} />
              </>
            ) : (
              <View style={ss.emptyChart}>
                <Text style={ss.emptyChartTxt}>Lance ta première séance pour voir ta progression.</Text>
              </View>
            )}
          </View>
        </View>

        {/* ── VOLUME HEBDOMADAIRE ──────────────────────────── */}
        <View style={ss.section}>
          <Text style={ss.sectionLabel}>VOLUME HEBDOMADAIRE</Text>
          <View style={ss.card}>
            <VolumeBarChart data={weekVols} />
          </View>
        </View>

        {/* ── RÉPARTITION MUSCULAIRE ──────────────────────── */}
        {distrib.length > 0 && (
          <View style={ss.section}>
            <Text style={ss.sectionLabel}>RÉPARTITION · 30 JOURS</Text>
            <View style={ss.card}>
              {distrib.map((d) => (
                <View key={d.label} style={ss.distRow}>
                  <Text style={ss.distLabel}>{d.label}</Text>
                  <View style={ss.distBarOuter}>
                    <View style={[ss.distBarInner, { width: `${d.percent}%` as any }]} />
                  </View>
                  <Text style={ss.distPct}>{d.percent}%</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ── PARAMÈTRES ──────────────────────────────────── */}
        <View style={ss.section}>
          <Text style={ss.sectionLabel}>PARAMÈTRES</Text>
          <View style={[ss.card, { padding: 0, overflow: 'hidden' }]}>
            {([
              { label: 'Mon profil', icon: 'pencil' },
              { label: 'Objectifs', icon: 'target' },
              { label: 'Pesée', icon: 'scales' },
            ] as { label: string; icon: IconName }[]).map(({ label, icon }, i) => (
              <View key={label}>
                <Pressable style={ss.menuItem}>
                  <Icon name={icon} size={18} color={BRAND} />
                  <Text style={ss.menuLabel}>{label}</Text>
                  <Icon name="caretRight" size={14} color="#444" />
                </Pressable>
                {i < 2 && <View style={ss.menuDivider} />}
              </View>
            ))}
          </View>
        </View>

        {/* Déconnexion */}
        <Pressable onPress={handleSignOut} style={ss.signOut}>
          <Text style={ss.signOutTxt}>Déconnexion</Text>
        </Pressable>

        {__DEV__ && (
          <Pressable
            onPress={async () => {
              await AsyncStorage.removeItem('attiks_onboard_v1');
              router.replace('/(onboarding)/onboard');
            }}
            style={{ alignItems: 'center', paddingVertical: 12 }}
          >
            <Text style={{ color: '#C8F13540', fontSize: 12 }}>🔁 Rejouer l'onboarding (dev)</Text>
          </Pressable>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const ss = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  scroll: { paddingBottom: 16 },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 20, paddingBottom: 8, gap: 16,
  },
  avatar: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: 'rgba(200,241,53,0.12)',
    borderWidth: 2, borderColor: BRAND,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarTxt: { color: BRAND, fontWeight: '900', fontSize: 28 },
  headerInfo: { flex: 1 },
  headerName: { color: '#fff', fontWeight: '900', fontSize: 26, letterSpacing: -0.5 },
  headerSub: { color: TEXT_MUTED, fontSize: 13, marginTop: 3 },

  statsRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 10, marginTop: 4 },
  statCard: {
    flex: 1, backgroundColor: SURFACE, borderRadius: 16,
    borderWidth: 1, borderColor: 'rgba(200,241,53,0.08)',
    padding: 14, alignItems: 'center',
  },
  statValue: { color: BRAND, fontWeight: '900', fontSize: 28 },
  statLabel: { color: TEXT_MUTED, fontSize: 10, fontWeight: '600', textTransform: 'uppercase', marginTop: 2, letterSpacing: 0.6 },

  section: { paddingHorizontal: 20, marginTop: 20 },
  sectionLabel: {
    color: TEXT_MUTED, fontSize: 11, fontWeight: '700',
    letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 10,
  },
  card: {
    backgroundColor: SURFACE, borderRadius: 16,
    borderWidth: 1, borderColor: 'rgba(200,241,53,0.08)', padding: 16,
  },

  muscleList: { marginTop: 14, gap: 7 },
  muscleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  muscleDot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  muscleLabel: { color: '#fff', fontSize: 13, flex: 1 },
  muscleTime: { color: TEXT_MUTED, fontSize: 11 },
  muscleAllGood: { marginTop: 14, alignItems: 'center', paddingVertical: 6 },
  muscleAllGoodTxt: { color: TEXT_SECONDARY, fontSize: 13 },

  heatLegend: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 12 },
  heatLegendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  heatDot: { width: 8, height: 8, borderRadius: 2 },
  heatLegendTxt: { color: TEXT_MUTED, fontSize: 9, fontWeight: '600' },

  chipScroll: { marginHorizontal: -16, paddingHorizontal: 16 },
  chip: {
    height: 28, borderRadius: 99, borderWidth: 1,
    borderColor: 'rgba(200,241,53,0.2)', paddingHorizontal: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  chipActive: { backgroundColor: 'rgba(200,241,53,0.1)', borderColor: BRAND },
  chipTxt: { color: TEXT_SECONDARY, fontSize: 11, fontWeight: '600' },
  chipTxtActive: { color: BRAND },

  emptyChart: { height: CHART_H, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  emptyChartTxt: { color: TEXT_MUTED, fontSize: 12, textAlign: 'center', lineHeight: 18 },

  distRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 9 },
  distLabel: { color: TEXT_SECONDARY, fontSize: 11, width: 110 },
  distBarOuter: { flex: 1, height: 5, backgroundColor: SURFACE_RAISED, borderRadius: 3, overflow: 'hidden' },
  distBarInner: { height: '100%', backgroundColor: BRAND, borderRadius: 3 },
  distPct: { color: TEXT_MUTED, fontSize: 10, width: 28, textAlign: 'right' },

  menuItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14, gap: 12,
  },
  menuLabel: { color: '#fff', flex: 1, fontSize: 15, fontWeight: '500' },
  menuDivider: { height: 1, backgroundColor: 'rgba(200,241,53,0.06)', marginHorizontal: 16 },

  signOut: { alignItems: 'center', paddingVertical: 14, marginTop: 4 },
  signOutTxt: { color: TEXT_MUTED, fontSize: 14 },
});
