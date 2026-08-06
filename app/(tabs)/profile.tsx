import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator, Alert, Animated, Dimensions, Easing, Linking, Modal,
  Pressable, ScrollView, StyleSheet, Text, View,
} from 'react-native';
import { useTheme } from '@/lib/theme';
import Svg, {
  Circle, ClipPath, Defs, G,
  LinearGradient as SvgGradient,
  Path, Rect, Stop, Line as SvgLine,
} from 'react-native-svg';

const AnimatedRect = Animated.createAnimatedComponent(Rect);

import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { GradientOrb } from '@/components/GradientOrb';
import { MuscleMap } from '@/components/MuscleMap';
import { useRecoveryScore } from '@/hooks/useRecoveryScore';
import { getMusclesForExercise } from '@/lib/muscleMapping';
import RevenueCatUI from 'react-native-purchases-ui';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';

const PRIVACY_POLICY_URL = 'https://natsdesign.github.io/attiks/confidentialite.html';

const { width: SW } = Dimensions.get('window');
const SECTION_PAD = 16;
const PANTIN_HEIGHT = Math.round((SW - 32) * 0.9 / 0.9963);

const CHART_W     = SW - SECTION_PAD * 2;
const CHART_H     = 170;
const CHART_INNER = CHART_H - 24;

// Heatmap — petits carrés arrondis style contribution graph
const DOT_SIZE = 9;
const GRID_GAP = 3;
const GRID_W   = SW - 32;
const COLS     = Math.floor((GRID_W + GRID_GAP) / (DOT_SIZE + GRID_GAP));
const ROWS     = 7;

const DEMO_DATA = [
  { label: '', oneRM: 90 }, { label: '', oneRM: 92 },
  { label: '', oneRM: 95 }, { label: '', oneRM: 98 },
  { label: '', oneRM: 100 }, { label: '', oneRM: 103 },
  { label: '', oneRM: 107 },
];

// ── Types ────────────────────────────────────────────────────────────────────

type TabMode = 'profil' | 'progres';

interface SessionRow {
  date: string;
  sets: { exercise_name: string; reps: number; weight_kg: number }[] | null;
}

// ── Utilities ────────────────────────────────────────────────────────────────

function topExercises(sessions: SessionRow[]): string[] {
  const counts: Record<string, number> = {};
  for (const s of sessions)
    for (const set of s.sets ?? [])
      counts[set.exercise_name] = (counts[set.exercise_name] ?? 0) + 1;
  return Object.entries(counts).sort(([, a], [, b]) => b - a).slice(0, 6).map(([n]) => n);
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
  const weekMap = new Map<string, number>();
  for (const s of sessions) {
    const d = new Date(s.date);
    const dow = d.getDay();
    const diffToMon = dow === 0 ? -6 : 1 - dow;
    const monday = new Date(d);
    monday.setDate(d.getDate() + diffToMon);
    const key = monday.toISOString().slice(0, 10);
    const vol = (s.sets ?? []).reduce((a, x) => a + x.reps * x.weight_kg, 0);
    weekMap.set(key, (weekMap.get(key) ?? 0) + vol);
  }

  const now = new Date();
  const dow = now.getDay();
  const diffToMon = dow === 0 ? -6 : 1 - dow;
  const curMonday = new Date(now);
  curMonday.setDate(now.getDate() + diffToMon);

  const result: { label: string; volume: number }[] = [];
  for (let i = 7; i >= 0; i--) {
    const monday = new Date(curMonday);
    monday.setDate(curMonday.getDate() - i * 7);
    const key = monday.toISOString().slice(0, 10);
    const label = i === 0
      ? '●'
      : String(monday.getDate());
    result.push({ label, volume: weekMap.get(key) ?? 0 });
  }
  return result;
}

function smoothPath(pts: { x: number; y: number }[]): string {
  if (pts.length < 2) return '';
  let d = `M${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`;
  for (let i = 1; i < pts.length; i++) {
    const p0 = pts[Math.max(0, i - 2)];
    const p1 = pts[i - 1];
    const p2 = pts[i];
    const p3 = pts[Math.min(pts.length - 1, i + 1)];
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
  }
  return d;
}

function fmtKg(vol: number): string {
  if (vol >= 1000) return `${(vol / 1000).toFixed(1).replace('.', ',')}t`;
  return `${Math.round(vol)} kg`;
}

const MUSCLE_GROUPS: { label: string; ids: string[] }[] = [
  { label: 'Pectoraux', ids: ['pec', 'pec-2'] },
  { label: 'Dos', ids: ['lats', 'trapezius', 'trapezius-front', 'lumbar'] },
  { label: 'Épaules', ids: ['delt', 'delt-left', 'delt-right'] },
  { label: 'Bras', ids: ['biceps', 'biceps-right', 'triceps'] },
  { label: 'Jambes', ids: ['quadriceps', 'harmstring', 'gluteus', 'gluteus-front', 'adductor', 'gracilis', 'calves', 'calves-front'] },
  { label: 'Abdos', ids: ['abs', 'oblique'] },
];

interface MuscleGroupVolume {
  label: string;
  volume: number;
  exercises: { name: string; volume: number }[];
}

function muscleGroupBreakdown(sessions: SessionRow[]): MuscleGroupVolume[] {
  const groupExerciseVol: Record<string, Record<string, number>> = {};
  for (const g of MUSCLE_GROUPS) groupExerciseVol[g.label] = {};

  for (const s of sessions) {
    for (const set of s.sets ?? []) {
      const vol = set.reps * set.weight_kg;
      if (vol <= 0) continue;
      const muscles = getMusclesForExercise(set.exercise_name);
      for (const g of MUSCLE_GROUPS) {
        if (muscles.some(m => g.ids.includes(m))) {
          groupExerciseVol[g.label][set.exercise_name] =
            (groupExerciseVol[g.label][set.exercise_name] ?? 0) + vol;
        }
      }
    }
  }

  return MUSCLE_GROUPS
    .map(g => {
      const exercises = Object.entries(groupExerciseVol[g.label])
        .map(([name, volume]) => ({ name, volume }))
        .sort((a, b) => b.volume - a.volume);
      const volume = exercises.reduce((sum, e) => sum + e.volume, 0);
      return { label: g.label, volume, exercises };
    })
    .sort((a, b) => b.volume - a.volume);
}

// ── Charts ───────────────────────────────────────────────────────────────────

function OrmMountainChart({ data }: { data: { label: string; oneRM: number }[] }) {
  const { theme } = useTheme();
  const revealAnim = useRef(new Animated.Value(0)).current;
  const isDemo = data.length < 2;
  const renderData = isDemo ? DEMO_DATA : data;

  useEffect(() => {
    revealAnim.setValue(0);
    Animated.timing(revealAnim, {
      toValue: CHART_W + 4,
      duration: 800,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [data]);

  const minV = Math.min(...renderData.map(d => d.oneRM));
  const maxV = Math.max(...renderData.map(d => d.oneRM));
  const pad  = (maxV - minV || 10) * 0.15;
  const lo   = minV - pad;
  const hi   = maxV + pad;
  const span = hi - lo;

  const pts = renderData.map((d, i) => ({
    x: (i / (renderData.length - 1)) * CHART_W,
    y: 8 + ((hi - d.oneRM) / span) * CHART_INNER,
  }));

  const linePath = smoothPath(pts);
  const last = pts[pts.length - 1];
  const areaPath =
    `${linePath} ` +
    `L${last.x.toFixed(1)},${(8 + CHART_INNER).toFixed(1)} ` +
    `L${pts[0].x.toFixed(1)},${(8 + CHART_INNER).toFixed(1)} Z`;

  return (
    <View style={{ marginTop: 14 }}>
      <Svg width={CHART_W} height={CHART_H}>
        <Defs>
          <SvgGradient id="mtnGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={theme.brand} stopOpacity={isDemo ? '0.10' : '0.45'} />
            <Stop offset="0.6" stopColor={theme.brand} stopOpacity={isDemo ? '0.04' : '0.12'} />
            <Stop offset="1" stopColor={theme.brand} stopOpacity="0" />
          </SvgGradient>
          <ClipPath id="mtnReveal">
            <AnimatedRect x={-2} y={0} width={revealAnim} height={CHART_H + 10} />
          </ClipPath>
        </Defs>
        <G clipPath="url(#mtnReveal)">
          <Path d={areaPath} fill="url(#mtnGrad)" />
          <Path
            d={linePath}
            stroke={theme.brand}
            strokeWidth={isDemo ? 1.5 : 2.5}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={isDemo ? '6 4' : undefined}
            opacity={isDemo ? 0.35 : 1}
          />
          {!isDemo && (
            <>
              <Circle cx={last.x} cy={last.y} r={16} fill={theme.brand + '18'} />
              <Circle cx={last.x} cy={last.y} r={8} fill={theme.brand + '30'} />
              <Circle cx={last.x} cy={last.y} r={4} fill="#FFFFFF" />
            </>
          )}
        </G>
      </Svg>
      {isDemo && (
        <View style={{
          position: 'absolute',
          top: 0, left: 0, right: 0, bottom: 0,
          justifyContent: 'center', alignItems: 'center',
        }}>
          <Text style={{ color: theme.textSecondary, fontSize: 12, textAlign: 'center' }}>
            Continue à logger pour voir ta vraie progression
          </Text>
        </View>
      )}
    </View>
  );
}

function WeeklyVolumeChart({ weeks }: { weeks: { label: string; volume: number }[] }) {
  const { theme } = useTheme();
  const revealAnim = useRef(new Animated.Value(CHART_H + 4)).current;

  useEffect(() => {
    revealAnim.setValue(CHART_H + 4);
    Animated.timing(revealAnim, {
      toValue: 0,
      duration: 750,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [weeks.length]);

  if (!weeks.length) return null;

  const BAR_GAP = 6;
  const barW    = (CHART_W - BAR_GAP * (weeks.length - 1)) / weeks.length;
  const maxVol  = Math.max(...weeks.map(w => w.volume), 1);
  const BASE_Y  = 8 + CHART_INNER;

  // Horizontal grid lines
  const gridLines = [0.25, 0.5, 0.75, 1].map(f => ({
    y: 8 + CHART_INNER * (1 - f),
    vol: Math.round(maxVol * f),
  }));

  return (
    <View style={{ marginTop: 14 }}>
      <Svg width={CHART_W} height={CHART_H}>
        <Defs>
          <SvgGradient id="volGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0"    stopColor={theme.brand} stopOpacity="0.90" />
            <Stop offset="0.55" stopColor={theme.brand} stopOpacity="0.45" />
            <Stop offset="1"    stopColor={theme.brand} stopOpacity="0.06" />
          </SvgGradient>
          <ClipPath id="volReveal">
            <AnimatedRect x={-2} y={revealAnim} width={CHART_W + 4} height={CHART_H + 10} />
          </ClipPath>
        </Defs>

        {/* Grid lines */}
        {gridLines.map(gl => (
          <SvgLine
            key={gl.y}
            x1={0} y1={gl.y.toFixed(1)}
            x2={CHART_W} y2={gl.y.toFixed(1)}
            stroke="#FFFFFF"
            strokeOpacity="0.04"
            strokeWidth="1"
          />
        ))}

        <G clipPath="url(#volReveal)">
          {weeks.map((w, i) => {
            const barH   = Math.max((w.volume / maxVol) * CHART_INNER, w.volume > 0 ? 5 : 0);
            const x      = i * (barW + BAR_GAP);
            const y      = BASE_Y - barH;
            const isCurr = i === weeks.length - 1;
            return (
              <Rect
                key={i}
                x={x} y={w.volume > 0 ? y : BASE_Y - 3}
                width={barW}
                height={w.volume > 0 ? barH : 3}
                rx={5}
                fill={w.volume > 0 ? 'url(#volGrad)' : '#1E1E1E'}
                opacity={isCurr ? 1 : w.volume > 0 ? 0.6 : 1}
              />
            );
          })}

          {/* Dot on current week bar */}
          {weeks[weeks.length - 1]?.volume > 0 && (() => {
            const i = weeks.length - 1;
            const barH = (weeks[i].volume / maxVol) * CHART_INNER;
            const cx = i * (barW + BAR_GAP) + barW / 2;
            const cy = BASE_Y - barH;
            return (
              <>
                <Circle cx={cx} cy={cy} r={12} fill={theme.brand + '20'} />
                <Circle cx={cx} cy={cy} r={4} fill={theme.brand} />
              </>
            );
          })()}
        </G>
      </Svg>

      {/* Week labels */}
      <View style={{ flexDirection: 'row', marginTop: 5 }}>
        {weeks.map((w, i) => (
          <View
            key={i}
            style={{
              width: barW,
              marginRight: i < weeks.length - 1 ? BAR_GAP : 0,
              alignItems: 'center',
            }}
          >
            <Text style={{
              color: i === weeks.length - 1 ? theme.brand : theme.textMuted,
              fontSize: 10,
              fontWeight: i === weeks.length - 1 ? '900' : '400',
            }}>
              {w.label}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function ActivityDots({ volumes }: { volumes: Map<string, number> }) {
  const { theme, mode } = useTheme();
  const numDays = COLS * ROWS;
  const start   = new Date(Date.now() - (numDays - 1) * 86_400_000);
  const maxVol  = Math.max(...Array.from(volumes.values()), 1);

  function dotColor(date: string): string {
    const v = volumes.get(date) ?? 0;
    if (v === 0) return mode === 'dark' ? '#1C1C1C' : '#E8E8E8';
    const r = v / maxVol;
    if (r < 0.25) return 'rgba(200,241,53,0.20)';
    if (r < 0.60) return 'rgba(200,241,53,0.42)';
    return 'rgba(200,241,53,0.72)';
  }

  const dates = Array.from({ length: numDays }, (_, i) => {
    const d = new Date(start.getTime() + i * 86_400_000);
    return d.toISOString().slice(0, 10);
  });

  return (
    <View style={{
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: GRID_GAP,
      width: GRID_W,
      marginTop: 14,
    }}>
      {dates.map(date => (
        <View
          key={date}
          style={{
            width: DOT_SIZE,
            height: DOT_SIZE,
            borderRadius: 2,
            backgroundColor: dotColor(date),
          }}
        />
      ))}
    </View>
  );
}

function MuscleVolumeAccordion({ groups }: { groups: MuscleGroupVolume[] }) {
  const { theme } = useTheme();
  const [openLabel, setOpenLabel] = useState<string | null>(null);

  return (
    <View style={{ marginTop: 14, gap: 8 }}>
      {groups.map(g => {
        const isOpen = openLabel === g.label;
        return (
          <View
            key={g.label}
            style={{
              borderRadius: 12, borderWidth: 1, borderColor: theme.border,
              backgroundColor: theme.surface, overflow: 'hidden',
            }}
          >
            <Pressable
              onPress={() => setOpenLabel(isOpen ? null : g.label)}
              style={{
                flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                paddingHorizontal: 16, paddingVertical: 14,
              }}
            >
              <Text style={{ color: theme.textPrimary, fontSize: 14, fontWeight: '600' }}>{g.label}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Text style={{ color: theme.textMuted, fontSize: 13 }}>
                  {g.volume > 0 ? fmtKg(g.volume) : '—'}
                </Text>
                <Text style={{ color: theme.textMuted, fontSize: 12 }}>{isOpen ? '▲' : '▼'}</Text>
              </View>
            </Pressable>
            {isOpen && (
              <View style={{ paddingHorizontal: 16, paddingBottom: 14, gap: 8 }}>
                {g.exercises.length === 0 ? (
                  <Text style={{ color: theme.textMuted, fontSize: 12 }}>Pas encore de données</Text>
                ) : g.exercises.map(e => (
                  <View key={e.name} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ color: theme.textSecondary, fontSize: 13, flex: 1, marginRight: 8 }}>{e.name}</Text>
                    <Text style={{ color: theme.textSecondary, fontSize: 13 }}>{fmtKg(e.volume)}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

function SettingsModal({ visible, onClose, onSignOut }: {
  visible: boolean; onClose: () => void; onSignOut: () => void;
}) {
  const { theme } = useTheme();
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  const handleDeleteAccount = () => {
    Alert.alert(
      'Supprimer mon compte',
      'Cette action est définitive : ton profil, tes séances et ton historique seront supprimés sans possibilité de récupération.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Confirmer la suppression',
              'Es-tu sûr ? Cette dernière étape est irréversible.',
              [
                { text: 'Annuler', style: 'cancel' },
                {
                  text: 'Supprimer définitivement',
                  style: 'destructive',
                  onPress: async () => {
                    setDeleting(true);
                    const { error } = await supabase.functions.invoke('delete-account');
                    if (error) {
                      setDeleting(false);
                      Alert.alert('Erreur', "La suppression a échoué. Réessaie ou contacte le support.");
                      return;
                    }
                    await supabase.auth.signOut();
                    setDeleting(false);
                  },
                },
              ],
            );
          },
        },
      ],
    );
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.surface }}>
        <View style={[ss.modalHeader, { borderBottomColor: theme.border }]}>
          <Text style={[ss.modalTitle, { color: theme.textPrimary }]}>Paramètres</Text>
          <Pressable onPress={onClose}>
            <Text style={{ color: theme.textMuted, fontSize: 15 }}>Fermer</Text>
          </Pressable>
        </View>
        <View style={{ paddingHorizontal: 20, paddingTop: 16 }}>
          {(['Mon profil', 'Objectifs'] as const).map(label => (
            <Pressable key={label} style={[ss.settingsRow, { backgroundColor: theme.surface }]}>
              <Text style={[ss.settingsRowLabel, { color: theme.textPrimary }]}>{label}</Text>
              <Text style={{ color: theme.textMuted, fontSize: 18 }}>›</Text>
            </Pressable>
          ))}
          <Pressable
            style={[ss.settingsRow, { backgroundColor: theme.surface }]}
            onPress={() => Linking.openURL(PRIVACY_POLICY_URL)}
          >
            <Text style={[ss.settingsRowLabel, { color: theme.textPrimary }]}>Politique de confidentialité</Text>
            <Text style={{ color: theme.textMuted, fontSize: 18 }}>›</Text>
          </Pressable>
          {/* Outils de dev — à retirer avant App Store */}
          <Pressable
            style={[ss.settingsRow, { backgroundColor: theme.surface }]}
            onPress={() => RevenueCatUI.presentPaywall()}
          >
            <Text style={[ss.settingsRowLabel, { color: theme.textPrimary }]}>Tester le paywall</Text>
            <Text style={{ color: theme.textMuted, fontSize: 18 }}>›</Text>
          </Pressable>
          <Pressable
            style={[ss.settingsRow, { backgroundColor: theme.surface }]}
            onPress={async () => {
              await AsyncStorage.removeItem('attiks_onboard_v1');
              onClose();
              router.replace('/(onboarding)/onboard');
            }}
          >
            <Text style={[ss.settingsRowLabel, { color: theme.textPrimary }]}>Relancer l'onboarding</Text>
            <Text style={{ color: theme.textMuted, fontSize: 18 }}>›</Text>
          </Pressable>
        </View>
        <Pressable onPress={onSignOut} style={{ alignItems: 'center', paddingVertical: 20, marginTop: 24 }}>
          <Text style={{ color: theme.danger, fontSize: 15, fontWeight: '500' }}>Déconnexion</Text>
        </Pressable>
        <Pressable
          onPress={handleDeleteAccount}
          disabled={deleting}
          style={{ alignItems: 'center', paddingVertical: 20, flexDirection: 'row', justifyContent: 'center', gap: 8 }}
        >
          {deleting && <ActivityIndicator size="small" color={theme.textMuted} />}
          <Text style={{ color: theme.textMuted, fontSize: 13, fontWeight: '500' }}>Supprimer mon compte</Text>
        </Pressable>
      </SafeAreaView>
    </Modal>
  );
}

// ── Main screen ──────────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { score, muscleColors } = useRecoveryScore(user?.id);

  const [tabMode, setTabMode] = useState<TabMode>('profil');
  const [pseudo, setPseudo] = useState('');
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [selectedEx, setSelectedEx] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  const sectionAnims = useRef(Array.from({ length: 5 }, () => new Animated.Value(0))).current;
  const tabAnim      = useRef(new Animated.Value(0)).current;

  const topEx      = useMemo(() => topExercises(sessions), [sessions]);
  const oneRM      = useMemo(() => selectedEx ? oneRMPoints(sessions, selectedEx) : [], [sessions, selectedEx]);
  const dayVols    = useMemo(() => dayVolumes(sessions), [sessions]);
  const weekVols   = useMemo(() => weeklyVolumes(sessions), [sessions]);
  const muscleGroups = useMemo(() => muscleGroupBreakdown(sessions), [sessions]);

  const currentWeekVol = weekVols.length > 0 ? weekVols[weekVols.length - 1].volume : 0;
  const prevWeekVol    = weekVols.length >= 2 ? weekVols[weekVols.length - 2].volume : 0;
  const weekVolDelta   = currentWeekVol - prevWeekVol;

  const currentORM = oneRM.length > 0 ? oneRM[oneRM.length - 1].oneRM : null;
  const deltaORM   = oneRM.length >= 2 ? currentORM! - oneRM[0].oneRM : null;

  useEffect(() => {
    Animated.stagger(70, sectionAnims.map(a =>
      Animated.timing(a, { toValue: 1, duration: 420, easing: Easing.out(Easing.cubic), useNativeDriver: true })
    )).start();
  }, []);

  useEffect(() => {
    Animated.timing(tabAnim, {
      toValue: tabMode === 'profil' ? 0 : 1,
      duration: 200,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [tabMode]);

  useEffect(() => {
    if (!user) return;

    supabase.from('user_profiles').select('pseudo').eq('id', user.id).single()
      .then(({ data }) => { if (data) setPseudo(data.pseudo ?? ''); });

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

  function handleSignOut() {
    Alert.alert('Déconnexion', 'Tu es sûr de vouloir te déconnecter ?', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Déconnexion', style: 'destructive', onPress: () => supabase.auth.signOut() },
    ]);
  }

  const sect = (i: number) => ({
    opacity: sectionAnims[i],
    transform: [{ translateY: sectionAnims[i].interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }],
  });

  return (
    <SafeAreaView style={[ss.root, { backgroundColor: theme.bg }]}>
      <GradientOrb />
      <SettingsModal visible={showSettings} onClose={() => setShowSettings(false)} onSignOut={handleSignOut} />

      <ScrollView
        contentContainerStyle={{ paddingBottom: 120 + insets.bottom }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── HEADER ─────────────────────────────────────────── */}
        <Animated.View style={[ss.section, sect(0)]}>
          <View style={ss.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={[ss.headerName, { color: theme.textPrimary }]}>{pseudo || 'Athlète'}</Text>
            </View>
            <Pressable onPress={() => setShowSettings(true)} hitSlop={12}>
              <Text style={[ss.settingsIcon, { color: theme.textMuted }]}>⚙</Text>
            </Pressable>
          </View>

          {/* ── Tab switcher ── */}
          <View style={ss.tabBar}>
            {([['profil', 'Profil'], ['progres', 'Progrès']] as [TabMode, string][]).map(([key, label]) => (
              <Pressable
                key={key}
                onPress={() => setTabMode(key)}
                style={[
                  ss.tabBtn,
                  { backgroundColor: tabMode === key ? theme.brand + '1A' : 'transparent' },
                ]}
                hitSlop={8}
              >
                <Text style={[
                  ss.tabLabel,
                  { color: tabMode === key ? theme.brand : theme.textMuted },
                ]}>
                  {label}
                </Text>
              </Pressable>
            ))}
          </View>
        </Animated.View>

        {/* ═══════════════════════════════════════════════════
            TAB PROFIL — Recovery + Muscle Map
        ═══════════════════════════════════════════════════ */}
        {tabMode === 'profil' && (
          <Animated.View style={sect(1)}>
            <View style={ss.section}>
              <Text style={[ss.recoveryBig, { color: theme.textPrimary }]}>
                Recovery <Text style={{ color: theme.brand }}>{score}%</Text>
              </Text>
            </View>
            <View style={ss.pantinWrapper}>
              <MuscleMap muscleColors={muscleColors} height={PANTIN_HEIGHT} />
            </View>
            <View style={{ paddingHorizontal: SECTION_PAD }}>
              <Text style={[ss.sectionSub, { color: theme.textMuted, marginTop: 6 }]}>
                VOLUME PAR GROUPE MUSCULAIRE
              </Text>
              <MuscleVolumeAccordion groups={muscleGroups} />
            </View>
          </Animated.View>
        )}

        {/* ═══════════════════════════════════════════════════
            TAB PROGRÈS — Volume + 1RM + Activity
        ═══════════════════════════════════════════════════ */}
        {tabMode === 'progres' && (
          <>
            {/* ── Volume hebdomadaire ── */}
            <Animated.View style={[ss.section, { marginTop: 24 }, sect(2)]}>
              <Text style={[ss.ormBig, { color: theme.textPrimary }]}>
                {currentWeekVol > 0 ? fmtKg(currentWeekVol) : '— kg'}
              </Text>
              {weekVolDelta !== 0 && prevWeekVol > 0 && (
                <Text style={[ss.ormDelta, {
                  color: weekVolDelta >= 0 ? theme.brand : theme.danger,
                }]}>
                  {weekVolDelta >= 0 ? '+' : ''}{fmtKg(weekVolDelta)} vs semaine dernière
                </Text>
              )}
              <Text style={[ss.sectionSub, { color: theme.textMuted, marginTop: 6 }]}>
                VOLUME HEBDOMADAIRE
              </Text>
              <WeeklyVolumeChart weeks={weekVols} />
            </Animated.View>

            {/* ── Divider ── */}
            <View style={[ss.divider, { backgroundColor: theme.border }]} />

            {/* ── 1RM progression ── */}
            <Animated.View style={[ss.section, sect(3)]}>
              <Text style={[ss.ormBig, { color: theme.textPrimary }]}>
                {currentORM != null ? `${currentORM} KG` : '— KG'}
              </Text>
              {deltaORM != null && (
                <Text style={[ss.ormDelta, {
                  color: deltaORM >= 0 ? theme.brand : theme.danger,
                }]}>
                  {deltaORM >= 0 ? '+' : ''}{deltaORM} kg depuis {oneRM[0].label}
                </Text>
              )}
              <Text style={[ss.sectionSub, { color: theme.textMuted, marginTop: 6 }]}>
                RECORD ESTIMÉ (1RM)
              </Text>
              <OrmMountainChart data={oneRM} />

              {topEx.length > 0 && (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={ss.pillScroll}
                  contentContainerStyle={ss.pillContent}
                >
                  {topEx.map(ex => {
                    const active = selectedEx === ex;
                    return (
                      <Pressable
                        key={ex}
                        onPress={() => setSelectedEx(ex)}
                        style={[ss.pill,
                          active
                            ? { borderColor: theme.brand, backgroundColor: theme.surfaceRaised }
                            : { borderColor: 'transparent', backgroundColor: 'transparent' },
                        ]}
                      >
                        <Text style={[ss.pillTxt, { color: active ? theme.brand : theme.textMuted }]}>
                          {ex}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              )}
            </Animated.View>

            {/* ── Divider ── */}
            <View style={[ss.divider, { backgroundColor: theme.border }]} />

            {/* ── Activity heatmap ── */}
            <Animated.View style={[ss.section, sect(4)]}>
              <Text style={[ss.sectionBig, { color: theme.textPrimary }]}>Activité</Text>
              <Text style={[ss.sectionSub, { color: theme.textMuted }]}>RÉGULARITÉ — 13 DERNIÈRES SEMAINES</Text>
              <ActivityDots volumes={dayVols} />
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 14 }}>
                <Text style={{ color: theme.textMuted, fontSize: 10 }}>Moins</Text>
                {['#1C1C1C', 'rgba(200,241,53,0.20)', 'rgba(200,241,53,0.42)', 'rgba(200,241,53,0.72)'].map((c, i) => (
                  <View key={i} style={{ width: DOT_SIZE, height: DOT_SIZE, borderRadius: 2, backgroundColor: c }} />
                ))}
                <Text style={{ color: theme.textMuted, fontSize: 10 }}>Plus</Text>
              </View>

            </Animated.View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const ss = StyleSheet.create({
  root: { flex: 1 },
  section: { paddingHorizontal: SECTION_PAD, marginTop: 20 },
  pantinWrapper: { paddingHorizontal: SECTION_PAD, marginTop: 14 },
  divider: { height: 1, marginHorizontal: SECTION_PAD, marginTop: 28, marginBottom: 4, opacity: 0.6 },

  headerRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  headerName: { fontFamily: 'Anton_400Regular', fontSize: 46, letterSpacing: -1, textTransform: 'uppercase' },
  settingsIcon: { fontSize: 20, paddingTop: 4 },

  tabBar: { flexDirection: 'row', gap: 8, marginTop: 20 },
  tabBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  tabLabel: { fontSize: 14, fontWeight: '700', letterSpacing: -0.2 },

  sectionBig: { fontWeight: '700', fontSize: 18, letterSpacing: -0.3 },
  recoveryBig: { fontFamily: 'Anton_400Regular', fontSize: 36, letterSpacing: -1, textTransform: 'uppercase' },
  sectionSub: {
    fontSize: 10, fontWeight: '700',
    letterSpacing: 1.5, textTransform: 'uppercase', marginTop: 2,
  },

  ormBig: { fontFamily: 'Anton_400Regular', fontSize: 52, letterSpacing: -1 },
  ormDelta: { fontSize: 12, fontWeight: '600', marginTop: 6 },

  pillScroll: { marginTop: 14, marginHorizontal: -SECTION_PAD },
  pillContent: { paddingHorizontal: SECTION_PAD, gap: 8 },
  pill: {
    height: 28, borderRadius: 99, paddingHorizontal: 12,
    borderWidth: 1, alignItems: 'center', justifyContent: 'center',
  },
  pillTxt: { fontSize: 12, fontWeight: '600' },

  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 0.5,
  },
  modalTitle: { fontWeight: '700', fontSize: 17 },
  settingsRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, marginBottom: 1,
  },
  settingsRowLabel: { fontSize: 15 },
});
