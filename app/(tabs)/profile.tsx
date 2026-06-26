import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert, Animated, Dimensions, Easing, Modal,
  Pressable, ScrollView, StyleSheet, Text, View,
} from 'react-native';
import Svg, {
  Circle, ClipPath, Defs, G, Line,
  LinearGradient as SvgGradient,
  Path, Rect, Stop, Text as SvgText,
} from 'react-native-svg';

const AnimatedRect = Animated.createAnimatedComponent(Rect);
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { GradientOrb } from '@/components/GradientOrb';
import { MuscleMap } from '@/components/MuscleMap';
import { useRecoveryScore } from '@/hooks/useRecoveryScore';
import { getMusclesForExercise } from '@/lib/muscleMapping';

// ── Constants ────────────────────────────────────────────────────────────────

const BRAND = '#C8F135';
const BG = '#0D1108';
const SURFACE = '#161D0F';
const TEXT_SEC = '#888888';
const TEXT_MUTED = '#555555';
const TEXT_DIM = '#444444';
const ACCENT_DARK = '#2A3A1A';
const { width: SW } = Dimensions.get('window');

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

const PUSH_MUSCLES = new Set(['Pectoraux', 'Épaules', 'Triceps']);
const PULL_MUSCLES = new Set(['Dos', 'Biceps', 'Lombaires']);
const LEGS_MUSCLES = new Set(['Quadriceps', 'Ischio-jambiers', 'Fessiers', 'Mollets', 'Adducteurs']);

// ── Types ────────────────────────────────────────────────────────────────────

interface SessionRow {
  date: string;
  sets: { exercise_name: string; reps: number; weight_kg: number }[] | null;
}
interface WeighIn { weight_kg: number; date: string }

// ── Utility functions ────────────────────────────────────────────────────────

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

function weeklyVolumes(sessions: SessionRow[]): { label: string; volume: number; isCurrent: boolean }[] {
  const weeks = Array.from({ length: 8 }, () => 0);
  const now = Date.now();
  for (const s of sessions) {
    const diff = Math.floor((now - new Date(s.date).getTime()) / 86_400_000);
    const w = Math.floor(diff / 7);
    if (w >= 0 && w < 8) weeks[w] += (s.sets ?? []).reduce((a, x) => a + x.reps * x.weight_kg, 0);
  }
  return weeks.reverse().map((volume, i) => ({
    label: i === 7 ? 'Auj.' : `S-${7 - i}`,
    volume,
    isCurrent: i === 7,
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

function countActiveWeeks(sessions: SessionRow[]): number {
  const weeks = new Set<string>();
  for (const s of sessions) {
    const d = new Date(s.date);
    const day = d.getDay() || 7;
    const thu = new Date(d);
    thu.setDate(d.getDate() + (4 - day));
    const y = thu.getFullYear();
    const jan1 = new Date(y, 0, 1);
    const w = Math.ceil(((thu.getTime() - jan1.getTime()) / 86400000 + 1) / 7);
    weeks.add(`${y}-W${w}`);
  }
  return weeks.size;
}

function pplDistrib(sessions: SessionRow[]): { label: string; mainMuscle: string; muscles: string[]; percent: number }[] {
  const cutoff = Date.now() - 30 * 86_400_000;
  const counts = { push: 0, pull: 0, legs: 0 };
  let total = 0;
  for (const s of sessions) {
    if (new Date(s.date).getTime() < cutoff) continue;
    for (const set of s.sets ?? []) {
      const groups = new Set(getMusclesForExercise(set.exercise_name).map(m => MUSCLE_GROUPS[m]).filter(Boolean));
      for (const g of groups) {
        if (PUSH_MUSCLES.has(g)) { counts.push++; total++; break; }
        if (PULL_MUSCLES.has(g)) { counts.pull++; total++; break; }
        if (LEGS_MUSCLES.has(g)) { counts.legs++; total++; break; }
      }
    }
  }
  const t = total || 1;
  return [
    { label: 'PUSH', mainMuscle: 'Pectoraux', muscles: ['Épaules', 'Triceps'], percent: Math.round((counts.push / t) * 100) },
    { label: 'PULL', mainMuscle: 'Dos', muscles: ['Biceps', 'Trapèzes'], percent: Math.round((counts.pull / t) * 100) },
    { label: 'LEGS', mainMuscle: 'Quadriceps', muscles: ['Ischio', 'Fessiers'], percent: Math.round((counts.legs / t) * 100) },
  ];
}

// ── Chart dimensions ─────────────────────────────────────────────────────────

const SECTION_PAD = 20;
const CARD_PAD = 16;
const CHART_W = SW - SECTION_PAD * 2 - CARD_PAD * 2; // inside card
const VOL_W = SW - SECTION_PAD * 2;                   // no card
const CP = { t: 20, b: 28, l: 36, r: 8 };

// 1RM premium chart
const ORM_CARD_PAD = 20;
const ORM_W = SW - SECTION_PAD * 2 - ORM_CARD_PAD * 2;
const ORM_H = 170;
const ORM_PAD = { t: 14, b: 32, l: 0, r: 0 };
const ORM_INNER_H = ORM_H - ORM_PAD.t - ORM_PAD.b;

const GRID_WEEKS = 12;
const GRID_DAYS = 7;
const GRID_GAP = 3;
const GRID_CELL = Math.floor((VOL_W - (GRID_WEEKS - 1) * GRID_GAP) / GRID_WEEKS);

// ── Utilities ────────────────────────────────────────────────────────────────

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

// ── Sub-components ───────────────────────────────────────────────────────────

function SL({ children }: { children: string }) {
  return <Text style={ss.sectionLabel}>{children}</Text>;
}

function VSep() {
  return <View style={ss.vSep} />;
}

function OneRMAreaChart({ data }: { data: { label: string; oneRM: number }[] }) {
  const revealAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    revealAnim.setValue(0);
    if (data.length < 2) return;
    Animated.timing(revealAnim, {
      toValue: ORM_W + 4,
      duration: 1000,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [data]);

  if (data.length < 2) {
    return (
      <View style={ss.cardPremium}>
        <View style={{ height: 80, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: TEXT_MUTED, fontSize: 12 }}>Pas assez de données sur cet exercice</Text>
        </View>
      </View>
    );
  }

  const first = data[0];
  const last = data[data.length - 1];
  const delta = last.oneRM - first.oneRM;
  const deltaLabel = `${delta >= 0 ? '+' : ''}${delta} kg depuis ${first.label}`;

  const minV = Math.min(...data.map(d => d.oneRM));
  const maxV = Math.max(...data.map(d => d.oneRM));
  const padding = (maxV - minV || 10) * 0.12;
  const lo = minV - padding;
  const hi = maxV + padding;
  const span = hi - lo;

  const pts = data.map((d, i) => ({
    x: (i / (data.length - 1)) * ORM_W,
    y: ORM_PAD.t + ((hi - d.oneRM) / span) * ORM_INNER_H,
    label: d.label,
    oneRM: d.oneRM,
  }));

  const linePath = smoothPath(pts);
  const lastPt = pts[pts.length - 1];
  const areaPath =
    `${linePath} ` +
    `L${lastPt.x.toFixed(1)},${(ORM_PAD.t + ORM_INNER_H).toFixed(1)} ` +
    `L${pts[0].x.toFixed(1)},${(ORM_PAD.t + ORM_INNER_H).toFixed(1)} Z`;

  // 4 evenly-spaced X labels
  const xIndices = new Set<number>([0, data.length - 1]);
  const step = Math.max(1, Math.floor((data.length - 1) / 3));
  for (let i = step; i < data.length - 1; i += step) xIndices.add(i);

  // Floating tooltip above last point
  const TT_W = 80;
  const TT_H = 36;
  const TT_X = Math.max(0, Math.min(lastPt.x - TT_W / 2, ORM_W - TT_W));
  const TT_Y = Math.max(2, lastPt.y - TT_H - 12);

  return (
    <View style={ss.cardPremium}>
      {/* ── Header ── */}
      <Text style={ss.ormValue}>{last.oneRM} kg</Text>
      <Text style={ss.ormDelta}>{deltaLabel}</Text>

      {/* ── Chart ── */}
      <View style={{ marginTop: 14 }}>
        <Svg width={ORM_W} height={ORM_H}>
          <Defs>
            <SvgGradient id="ormGrad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={BRAND} stopOpacity="0.30" />
              <Stop offset="1" stopColor={BRAND} stopOpacity="0" />
            </SvgGradient>
            <ClipPath id="ormReveal">
              <AnimatedRect x={-2} y={0} width={revealAnim} height={ORM_H + 10} />
            </ClipPath>
          </Defs>

          {/* Subtle grid lines */}
          {[0, 0.33, 0.66, 1].map((t, i) => (
            <Line key={i}
              x1={0} y1={ORM_PAD.t + t * ORM_INNER_H}
              x2={ORM_W} y2={ORM_PAD.t + t * ORM_INNER_H}
              stroke="rgba(255,255,255,0.03)" strokeWidth={1}
            />
          ))}

          {/* Animated chart body */}
          <G clipPath="url(#ormReveal)">
            <Path d={areaPath} fill="url(#ormGrad)" />
            <Path d={linePath} stroke={BRAND} strokeWidth={2.5}
                  fill="none" strokeLinecap="round" strokeLinejoin="round" />

            {/* Glow halo */}
            <Circle cx={lastPt.x} cy={lastPt.y} r={18}
                    fill="rgba(200,241,53,0.12)" />
            {/* Live dot */}
            <Circle cx={lastPt.x} cy={lastPt.y} r={5} fill="#FFFFFF" />

            {/* Tooltip connector */}
            <Line
              x1={lastPt.x} y1={TT_Y + TT_H}
              x2={lastPt.x} y2={lastPt.y - 6}
              stroke="rgba(200,241,53,0.22)" strokeWidth={1}
              strokeDasharray="2 3"
            />
            {/* Tooltip card */}
            <Rect x={TT_X} y={TT_Y} width={TT_W} height={TT_H} rx={9}
                  fill="#1A2510" />
            <Rect x={TT_X} y={TT_Y} width={TT_W} height={TT_H} rx={9}
                  fill="none" stroke="rgba(200,241,53,0.18)" strokeWidth={0.5} />
            <SvgText x={TT_X + TT_W / 2} y={TT_Y + 13}
                     textAnchor="middle" fontSize={9} fill={TEXT_DIM}>
              {last.label}
            </SvgText>
            <SvgText x={TT_X + TT_W / 2} y={TT_Y + 27}
                     textAnchor="middle" fontSize={12} fontWeight="bold" fill="#FFFFFF">
              {last.oneRM} kg
            </SvgText>
          </G>

          {/* X-axis labels — always visible */}
          {pts.map((p, i) => {
            if (!xIndices.has(i)) return null;
            const anchor = i === 0 ? 'start' : i === data.length - 1 ? 'end' : 'middle';
            return (
              <SvgText key={i} x={p.x} y={ORM_H - 6}
                       textAnchor={anchor} fontSize={10} fill={TEXT_DIM}>
                {p.label}
              </SvgText>
            );
          })}
        </Svg>
      </View>
    </View>
  );
}

function ActivityGrid({ volumes }: { volumes: Map<string, number> }) {
  const numDays = GRID_WEEKS * GRID_DAYS;
  const start = new Date(Date.now() - (numDays - 1) * 86_400_000);
  const maxVol = Math.max(...Array.from(volumes.values()), 1);

  function color(date: string): string {
    const v = volumes.get(date) ?? 0;
    if (v === 0) return '#1A1A1A';
    const r = v / maxVol;
    if (r < 0.25) return '#4A5E1A';
    if (r < 0.6)  return '#7A9A1A';
    return BRAND;
  }

  const weeks: string[][] = Array.from({ length: GRID_WEEKS }, (_, wi) =>
    Array.from({ length: GRID_DAYS }, (_, di) => {
      const d = new Date(start.getTime() + (wi * 7 + di) * 86_400_000);
      return d.toISOString().slice(0, 10);
    })
  );

  return (
    <View style={{ flexDirection: 'row', gap: GRID_GAP }}>
      {weeks.map((week, wi) => (
        <View key={wi} style={{ gap: GRID_GAP }}>
          {week.map(date => (
            <View
              key={date}
              style={{ width: GRID_CELL, height: GRID_CELL, borderRadius: 2, backgroundColor: color(date) }}
            />
          ))}
        </View>
      ))}
    </View>
  );
}

function VolumeBarChart({ data }: { data: { label: string; volume: number; isCurrent: boolean }[] }) {
  const H = 140;
  const innerH = H - 8 - 32;
  const n = data.length;
  const gap = 6;
  const bw = (VOL_W - gap * (n - 1)) / n;
  const maxVol = Math.max(...data.map(d => d.volume), 1);

  if (data.every(d => d.volume === 0)) {
    return (
      <View style={{ height: H, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: TEXT_MUTED, fontSize: 12 }}>Aucune donnée ces 8 semaines</Text>
      </View>
    );
  }

  return (
    <Svg width={VOL_W} height={H}>
      {data.map((d, i) => {
        const bh = Math.max((d.volume / maxVol) * innerH, d.volume > 0 ? 4 : 0);
        const x = i * (bw + gap);
        const y = 8 + innerH - bh;
        const fill = d.isCurrent ? BRAND : ACCENT_DARK;
        return (
          <G key={i}>
            <Rect x={x} y={y} width={bw} height={bh} rx={4} ry={4} fill={fill} />
            <SvgText x={x + bw / 2} y={H - 16} textAnchor="middle" fontSize={8} fill={d.isCurrent ? BRAND : TEXT_DIM}>
              {d.label}
            </SvgText>
            {d.volume > 0 && (
              <SvgText x={x + bw / 2} y={H - 4} textAnchor="middle" fontSize={7} fill={TEXT_DIM}>
                {d.volume >= 1000 ? `${Math.round(d.volume / 1000)}t` : `${Math.round(d.volume)}kg`}
              </SvgText>
            )}
          </G>
        );
      })}
    </Svg>
  );
}

function PplTiles({ data }: { data: { label: string; mainMuscle: string; muscles: string[]; percent: number }[] }) {
  const tileW = (SW - SECTION_PAD * 2 - 10 * 2) / 3;
  return (
    <View style={{ flexDirection: 'row', gap: 10 }}>
      {data.map(item => (
        <View key={item.label} style={[ss.pplTile, { width: tileW }]}>
          <Text style={ss.pplLabel}>{item.label}</Text>
          <Text style={ss.pplPercent}>{item.percent}%</Text>
          <Text style={ss.pplMain}>{item.mainMuscle}</Text>
          {item.muscles.map(m => (
            <Text key={m} style={ss.pplMuscle}>{m}</Text>
          ))}
        </View>
      ))}
    </View>
  );
}

function WeightMiniChart({ data }: { data: WeighIn[] }) {
  const H = 120;
  const WCP = { t: 12, b: 24, l: 32, r: 8 };
  const innerW = CHART_W - WCP.l - WCP.r;
  const innerH = H - WCP.t - WCP.b;

  if (data.length < 2) {
    return (
      <View style={{ height: H, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: TEXT_MUTED, fontSize: 12 }}>Ajoute des pesées pour voir ta courbe</Text>
      </View>
    );
  }

  const weights = data.map(d => d.weight_kg);
  const minW = Math.min(...weights) - 1;
  const maxW = Math.max(...weights) + 1;
  const range = maxW - minW || 1;

  const pts = data.map((d, i) => ({
    x: WCP.l + (i / (data.length - 1)) * innerW,
    y: WCP.t + ((maxW - d.weight_kg) / range) * innerH,
    date: d.date,
  }));

  const lineD = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const areaD = `${lineD} L${pts[pts.length - 1].x.toFixed(1)},${(WCP.t + innerH).toFixed(1)} L${pts[0].x.toFixed(1)},${(WCP.t + innerH).toFixed(1)} Z`;
  const step = Math.max(1, Math.floor(data.length / 3));

  return (
    <Svg width={CHART_W} height={H}>
      <Defs>
        <SvgGradient id="wgt" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={BRAND} stopOpacity="0.15" />
          <Stop offset="1" stopColor={BRAND} stopOpacity="0" />
        </SvgGradient>
      </Defs>
      <SvgText x={0} y={WCP.t + 6} fontSize={9} fill={TEXT_DIM}>{Math.round(maxW)}kg</SvgText>
      <SvgText x={0} y={WCP.t + innerH} fontSize={9} fill={TEXT_DIM}>{Math.round(minW)}kg</SvgText>
      <Path d={areaD} fill="url(#wgt)" />
      <Path d={lineD} stroke={BRAND} strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      {pts.map((p, i) => (
        <Circle key={i} cx={p.x} cy={p.y} r={3} fill={BG} stroke={BRAND} strokeWidth={1.5} />
      ))}
      {pts.map((p, i) => {
        if (i % step !== 0 && i !== data.length - 1) return null;
        const label = new Date(p.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
        return (
          <SvgText key={i} x={p.x} y={H - 4} textAnchor="middle" fontSize={8} fill={TEXT_DIM}>
            {label}
          </SvgText>
        );
      })}
    </Svg>
  );
}

function SettingsModal({ visible, onClose, onSignOut }: {
  visible: boolean; onClose: () => void; onSignOut: () => void;
}) {
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: SURFACE }}>
        <View style={ss.modalHeader}>
          <Text style={ss.modalTitle}>Paramètres</Text>
          <Pressable onPress={onClose}>
            <Text style={{ color: TEXT_MUTED, fontSize: 15 }}>Fermer</Text>
          </Pressable>
        </View>
        <View style={{ paddingHorizontal: 20, paddingTop: 16, gap: 1 }}>
          {(['Mon profil', 'Objectifs'] as const).map(label => (
            <Pressable key={label} style={ss.settingsRow}>
              <Text style={ss.settingsRowLabel}>{label}</Text>
              <Text style={{ color: '#444', fontSize: 18 }}>›</Text>
            </Pressable>
          ))}
        </View>
        <Pressable onPress={onSignOut} style={{ alignItems: 'center', paddingVertical: 20, marginTop: 24 }}>
          <Text style={{ color: '#FF3B30', fontSize: 15, fontWeight: '500' }}>Déconnexion</Text>
        </Pressable>
      </SafeAreaView>
    </Modal>
  );
}

// ── Main screen ──────────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { muscleColors } = useRecoveryScore(user?.id);
  const bottomPad = 65 + insets.bottom + 20;

  const [pseudo, setPseudo] = useState('');
  const [heightCm, setHeightCm] = useState<number | null>(null);
  const [latestWeight, setLatestWeight] = useState<number | null>(null);
  const [weightHistory, setWeightHistory] = useState<WeighIn[]>([]);
  const [sessionCount, setSessionCount] = useState(0);
  const [prCount, setPrCount] = useState(0);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [selectedEx, setSelectedEx] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  const sectionAnims = useRef(Array.from({ length: 7 }, () => new Animated.Value(0))).current;

  const dayVols   = useMemo(() => dayVolumes(sessions), [sessions]);
  const weekVols  = useMemo(() => weeklyVolumes(sessions), [sessions]);
  const topEx     = useMemo(() => topExercises(sessions), [sessions]);
  const oneRM     = useMemo(() => selectedEx ? oneRMPoints(sessions, selectedEx) : [], [sessions, selectedEx]);
  const ppl       = useMemo(() => pplDistrib(sessions), [sessions]);
  const weekCount = useMemo(() => countActiveWeeks(sessions), [sessions]);

  useEffect(() => {
    Animated.stagger(80, sectionAnims.map(a =>
      Animated.timing(a, { toValue: 1, duration: 450, easing: Easing.out(Easing.cubic), useNativeDriver: true })
    )).start();
  }, []);

  useEffect(() => {
    if (!user) return;

    supabase.from('user_profiles').select('pseudo, height_cm').eq('id', user.id).single()
      .then(({ data }) => {
        if (data) { setPseudo(data.pseudo ?? ''); setHeightCm((data as any).height_cm ?? null); }
      });

    supabase.from('weigh_ins').select('weight_kg, date').eq('user_id', user.id)
      .order('date', { ascending: false }).limit(1).single()
      .then(({ data }) => { if (data) setLatestWeight(data.weight_kg); });

    supabase.from('weigh_ins').select('weight_kg, date').eq('user_id', user.id)
      .order('date', { ascending: true }).limit(20)
      .then(({ data }) => { if (data) setWeightHistory(data); });

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

  function handleSignOut() {
    Alert.alert('Déconnexion', 'Tu es sûr de vouloir te déconnecter ?', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Déconnexion', style: 'destructive', onPress: () => supabase.auth.signOut() },
    ]);
  }

  const initials = (pseudo || user?.email || 'A').slice(0, 1).toUpperCase();
  const subtitle = [heightCm ? `${heightCm} cm` : null, latestWeight ? `${latestWeight} kg` : null].filter(Boolean).join(' · ');

  const sect = (i: number) => ({
    opacity: sectionAnims[i],
    transform: [{ translateY: sectionAnims[i].interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }],
  });

  return (
    <SafeAreaView style={ss.root}>
      <GradientOrb />
      <SettingsModal visible={showSettings} onClose={() => setShowSettings(false)} onSignOut={handleSignOut} />

      <ScrollView contentContainerStyle={[ss.scroll, { paddingBottom: bottomPad }]} showsVerticalScrollIndicator={false}>

        {/* ── 1. HEADER ────────────────────────────────────── */}
        <Animated.View style={[ss.section, sect(0)]}>
          <View style={ss.headerRow}>
            <View style={ss.avatar}>
              <Text style={ss.avatarTxt}>{initials}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={ss.headerName}>{pseudo || 'Athlète'}</Text>
              {!!subtitle && <Text style={ss.headerSub}>{subtitle}</Text>}
            </View>
            <Pressable onPress={() => setShowSettings(true)} style={ss.settingsBtn}>
              <Text style={{ color: TEXT_MUTED, fontSize: 22, lineHeight: 26 }}>⚙</Text>
            </Pressable>
          </View>

          <View style={ss.statsRow}>
            <View style={ss.statItem}>
              <Text style={ss.statValue}>{sessionCount}</Text>
              <Text style={ss.statLabel}>SÉANCES</Text>
            </View>
            <VSep />
            <View style={ss.statItem}>
              <Text style={ss.statValue}>{prCount}</Text>
              <Text style={ss.statLabel}>RECORDS</Text>
            </View>
            <VSep />
            <View style={ss.statItem}>
              <Text style={ss.statValue}>{weekCount}</Text>
              <Text style={ss.statLabel}>SEMAINES</Text>
            </View>
          </View>
        </Animated.View>

        {/* ── 2. RÉCUPÉRATION MUSCULAIRE ───────────────────── */}
        <Animated.View style={[ss.section, sect(1)]}>
          <SL>RÉCUPÉRATION MUSCULAIRE</SL>
        </Animated.View>
        <MuscleMap muscleColors={muscleColors} />

        {/* ── 3. PROGRESSION 1RM ───────────────────────────── */}
        <Animated.View style={[ss.section, sect(2)]}>
          <SL>PROGRESSION · 1RM ESTIMÉ</SL>
          {topEx.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={ss.pillScroll}
              contentContainerStyle={ss.pillContent}
            >
              {topEx.map(ex => (
                <Pressable
                  key={ex}
                  onPress={() => setSelectedEx(ex)}
                  style={[ss.pill, selectedEx === ex && ss.pillActive]}
                >
                  <Text style={[ss.pillTxt, selectedEx === ex && ss.pillTxtActive]}>{ex}</Text>
                </Pressable>
              ))}
            </ScrollView>
          )}
          <OneRMAreaChart data={oneRM} />
        </Animated.View>

        {/* ── 4. RÉGULARITÉ ────────────────────────────────── */}
        <Animated.View style={[ss.section, sect(3)]}>
          <SL>RÉGULARITÉ</SL>
          <ActivityGrid volumes={dayVols} />
          <View style={{ flexDirection: 'row', gap: 16, marginTop: 10 }}>
            {[
              { color: '#1A1A1A', label: 'Repos' },
              { color: '#4A5E1A', label: 'Léger' },
              { color: '#7A9A1A', label: 'Moyen' },
              { color: BRAND,     label: 'Intense' },
            ].map(({ color, label }) => (
              <View key={label} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                <View style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: color }} />
                <Text style={{ color: TEXT_DIM, fontSize: 10, fontWeight: '600' }}>{label}</Text>
              </View>
            ))}
          </View>
          {sessions.length > 0 && (
            <Text style={[ss.gridStat, { marginTop: 8 }]}>
              {(sessions.length / (weekCount || 1)).toFixed(1)} séances / semaine en moyenne
            </Text>
          )}
        </Animated.View>

        {/* ── 5. VOLUME ────────────────────────────────────── */}
        <Animated.View style={[ss.section, sect(4)]}>
          <SL>VOLUME · 8 SEMAINES</SL>
          <VolumeBarChart data={weekVols} />
        </Animated.View>

        {/* ── 6. RÉPARTITION PPL ───────────────────────────── */}
        <Animated.View style={[ss.section, sect(5)]}>
          <SL>GROUPES MUSCULAIRES · 30J</SL>
          <PplTiles data={ppl} />
        </Animated.View>

        {/* ── 7. PESÉE ─────────────────────────────────────── */}
        <Animated.View style={[ss.section, sect(6)]}>
          <SL>POIDS CORPOREL</SL>
          <View style={ss.card}>
            <WeightMiniChart data={weightHistory} />
          </View>
          <Pressable style={ss.addWeightBtn}>
            <Text style={ss.addWeightTxt}>+ Ajouter une pesée</Text>
          </Pressable>
        </Animated.View>

        {__DEV__ && (
          <Pressable
            onPress={async () => {
              await AsyncStorage.removeItem('attiks_onboard_v1');
              router.replace('/(onboarding)/onboard');
            }}
            style={{ alignItems: 'center', paddingVertical: 12 }}
          >
            <Text style={{ color: '#C8F13530', fontSize: 11 }}>🔁 Rejouer l'onboarding (dev)</Text>
          </Pressable>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const ss = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  scroll: {},
  section: { paddingHorizontal: SECTION_PAD, marginTop: 28 },
  sectionLabel: {
    color: TEXT_MUTED, fontSize: 11, fontWeight: '700',
    letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 14,
  },

  // Header
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: 'rgba(200,241,53,0.1)',
    borderWidth: 2, borderColor: BRAND,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarTxt: { color: BRAND, fontWeight: '900', fontSize: 20 },
  headerName: { color: '#fff', fontWeight: '700', fontSize: 20, letterSpacing: -0.4 },
  headerSub: { color: TEXT_SEC, fontSize: 13, marginTop: 2 },
  settingsBtn: { padding: 6 },

  statsRow: {
    flexDirection: 'row', alignItems: 'center',
    marginTop: 20, paddingVertical: 16,
    borderTopWidth: 0.5, borderBottomWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { color: '#fff', fontWeight: '700', fontSize: 22, letterSpacing: -0.5 },
  statLabel: { color: TEXT_MUTED, fontSize: 10, fontWeight: '600', letterSpacing: 0.8, marginTop: 3 },
  vSep: { width: 0.5, height: 28, backgroundColor: '#2A2A2A' },

  // Cards
  card: { backgroundColor: SURFACE, borderRadius: 16, padding: CARD_PAD },
  cardPremium: { backgroundColor: SURFACE, borderRadius: 20, padding: ORM_CARD_PAD },

  // 1RM premium header
  ormValue: {
    color: '#FFFFFF', fontWeight: '900', fontSize: 40,
    letterSpacing: -1.5, lineHeight: 44,
  },
  ormDelta: { color: BRAND, fontSize: 13, fontWeight: '600', marginTop: 2 },

  // Exercise pills
  pillScroll: { marginHorizontal: -SECTION_PAD, marginBottom: 12 },
  pillContent: { paddingHorizontal: SECTION_PAD, gap: 8 },
  pill: {
    height: 30, borderRadius: 99, paddingHorizontal: 14,
    borderWidth: 1, borderColor: 'rgba(200,241,53,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  pillActive: { backgroundColor: BRAND, borderColor: BRAND },
  pillTxt: { color: TEXT_MUTED, fontSize: 12, fontWeight: '600' },
  pillTxtActive: { color: BG, fontWeight: '700' },

  // Activity
  gridStat: { color: TEXT_MUTED, fontSize: 12 },

  // PPL tiles
  pplTile: { backgroundColor: SURFACE, borderRadius: 12, padding: 12 },
  pplLabel: { color: TEXT_MUTED, fontSize: 10, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' },
  pplPercent: { color: BRAND, fontWeight: '900', fontSize: 26, marginTop: 4, letterSpacing: -1 },
  pplMain: { color: TEXT_SEC, fontSize: 12, marginTop: 6 },
  pplMuscle: { color: TEXT_DIM, fontSize: 11, marginTop: 2 },

  // Weight
  addWeightBtn: {
    marginTop: 10, alignSelf: 'center',
    paddingVertical: 8, paddingHorizontal: 20,
    borderRadius: 99, borderWidth: 1,
    borderColor: 'rgba(200,241,53,0.2)',
  },
  addWeightTxt: { color: TEXT_MUTED, fontSize: 12, fontWeight: '600' },

  // Settings modal
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 0.5, borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  modalTitle: { color: '#fff', fontWeight: '700', fontSize: 17 },
  settingsRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: SURFACE, borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 14, marginBottom: 1,
  },
  settingsRowLabel: { color: '#fff', fontSize: 15 },
});
