import { useEffect, useState } from 'react';
import { Dimensions, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { Session, Program } from '@/lib/types';
import { SessionCard } from '@/components/SessionCard';
import { MuscleMap } from '@/components/MuscleMap';
import { useMuscleRecovery, MUSCLE_RED, MUSCLE_ORANGE } from '@/hooks/useMuscleRecovery';

const BRAND = '#C8F135';
const BG = '#0A0D06';
const { width: SCREEN_W } = Dimensions.get('window');
const SURFACE = '#161D0F';
const SURFACE_RAISED = '#1E2914';
const TEXT_SECONDARY = '#59644C';
const TEXT_MUTED = 'rgba(89,100,76,0.5)';
const LEGEND_GREEN = '#BDD02F';

const PPL_LABELS: Record<string, string> = {
  push: 'Push', pull: 'Pull', legs: 'Legs', full: 'Full Body',
};
const TYPE_LABELS: Record<string, string> = {
  force: 'Force', hypertrophie: 'Hypertrophie',
};

function computeRecoveryScore(muscleColors: Record<string, string>): number {
  const muscles = Object.values(muscleColors);
  if (muscles.length === 0) return 95;
  const redCount = muscles.filter((c) => c === MUSCLE_RED).length;
  const orangeCount = muscles.filter((c) => c === MUSCLE_ORANGE).length;
  return Math.max(30, Math.round(95 - redCount * 8 - orangeCount * 4));
}

function recoveryMessage(score: number): string {
  if (score >= 85) return 'Corps bien récupéré, tu peux pousser';
  if (score >= 65) return 'Récupération en cours, reste raisonnable';
  return 'Corps fatigué, séance légère conseillée';
}

export default function HomeScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [programs, setPrograms] = useState<Program[]>([]);
  const [recentSessions, setRecentSessions] = useState<Session[]>([]);
  const [pseudo, setPseudo] = useState('');
  const muscleColors = useMuscleRecovery(user?.id);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('user_profiles').select('pseudo').eq('id', user.id).single()
      .then(({ data }) => { if (data) setPseudo(data.pseudo ?? ''); });
    supabase
      .from('programs').select('*').eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => setPrograms(data ?? []));
    supabase
      .from('sessions').select('*, sets(*)').eq('user_id', user.id)
      .order('date', { ascending: false }).limit(3)
      .then(({ data }) => setRecentSessions(data ?? []));
  }, [user]);

  const name = pseudo || 'Athlète';
  const initials = name.charAt(0).toUpperCase();
  const score = computeRecoveryScore(muscleColors);

  const subtitle = (() => {
    if (programs.length > 0) {
      const p = programs[0];
      const parts = [
        p.ppl_block ? PPL_LABELS[p.ppl_block] : null,
        p.type ? TYPE_LABELS[p.type] : null,
        "Aujourd'hui",
      ].filter(Boolean);
      return parts.join(' · ');
    }
    const s = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
    return s.charAt(0).toUpperCase() + s.slice(1);
  })();

  return (
    <SafeAreaView style={ss.root}>
      <ScrollView contentContainerStyle={ss.scroll} showsVerticalScrollIndicator={false}>

        {/* ── TOP GLOW ────────────────────────────────────────── */}
        <Svg
          width={SCREEN_W}
          height={300}
          style={ss.glow}
          pointerEvents="none"
        >
          <Defs>
            <RadialGradient id="topGlow" cx="50%" cy="0%" rx="50%" ry="50%">
              <Stop offset="0%" stopColor="#C8F135" stopOpacity="0.22" />
              <Stop offset="60%" stopColor="#C8F135" stopOpacity="0.06" />
              <Stop offset="100%" stopColor="#C8F135" stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Circle cx={SCREEN_W / 2} cy={0} r={280} fill="url(#topGlow)" />
        </Svg>

        {/* ── HEADER ─────────────────────────────────────────── */}
        <View style={ss.header}>
          <View style={ss.avatar} />
          <View style={ss.headerInfo}>
            <Text style={ss.heroName}>{name.toUpperCase()}</Text>
            <Text style={ss.heroSub}>{subtitle}</Text>
          </View>
        </View>

        {/* ── HERO CARD — RÉCUPÉRATION ─────────────────────── */}
        <View style={ss.section}>
          <View style={ss.heroCard}>
            <Text style={ss.recovLabel}>RÉCUPÉRATION</Text>

            <View style={ss.recovTopRow}>
              <Text style={ss.recovScore}>{score}%</Text>
              <Text style={ss.recovMsg}>{recoveryMessage(score)}</Text>
            </View>

            <View style={ss.recovPantins}>
              <MuscleMap muscleColors={muscleColors} compact />
            </View>

            <View style={ss.legend}>
              <View style={[ss.legendDot, { backgroundColor: MUSCLE_RED }]} />
              <Text style={ss.legendTxt}>Fatigué</Text>
              <View style={[ss.legendDot, { backgroundColor: MUSCLE_ORANGE }]} />
              <Text style={ss.legendTxt}>En récup.</Text>
              <View style={[ss.legendDot, { backgroundColor: LEGEND_GREEN }]} />
              <Text style={ss.legendTxt}>Prêt</Text>
            </View>
          </View>
        </View>

        {/* ── CTA SÉANCE ──────────────────────────────────── */}
        <Pressable onPress={() => router.push('/session/active')} style={ss.ctaWrap}>
          <View style={ss.cta}>
            <Text style={ss.ctaIcon}>＋</Text>
            <Text style={ss.ctaTxt}>Commencer la séance</Text>
          </View>
        </Pressable>

        {/* ── PROGRAMMES ──────────────────────────────────── */}
        {programs.length > 0 && (
          <View style={ss.section}>
            <Text style={ss.sectionLabel}>Mes programmes</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginHorizontal: -20 }}
              contentContainerStyle={{ paddingHorizontal: 20, gap: 10 }}
            >
              {programs.map((p) => (
                <Pressable
                  key={p.id}
                  onPress={() =>
                    router.push({ pathname: '/session/active', params: { programId: p.id } })
                  }
                  style={ss.progCard}
                >
                  <View style={ss.progAccent} />
                  <View style={ss.progBody}>
                    <Text style={ss.progTag}>{p.ppl_block ? PPL_LABELS[p.ppl_block] : ''}</Text>
                    <Text style={ss.progName} numberOfLines={1}>{p.name}</Text>
                    <Text style={ss.progType}>{p.type ? TYPE_LABELS[p.type] : ''}</Text>
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}

        {/* ── SÉANCES RÉCENTES ────────────────────────────── */}
        {recentSessions.length > 0 && (
          <View style={ss.section}>
            <Text style={ss.sectionLabel}>Séances récentes</Text>
            {recentSessions.map((s) => (
              <SessionCard
                key={s.id}
                session={s}
                onPress={() => router.push(`/session/${s.id}`)}
              />
            ))}
          </View>
        )}

        {/* ── ÉTAT VIDE ───────────────────────────────────── */}
        {programs.length === 0 && recentSessions.length === 0 && (
          <View style={ss.empty}>
            <View style={ss.emptyIcon}>
              <Text style={{ fontSize: 36 }}>🏋️</Text>
            </View>
            <Text style={ss.emptyTitle}>Bienvenue sur Attiks !</Text>
            <Text style={ss.emptySub}>
              Crée ton premier programme ou démarre une séance libre.
            </Text>
            <Pressable
              onPress={() => router.push('/(tabs)/programs')}
              style={ss.emptyBtn}
            >
              <Text style={{ color: '#0D1108', fontWeight: '700', fontSize: 14 }}>
                Créer un programme
              </Text>
            </Pressable>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const ss = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  scroll: { paddingBottom: 16 },
  glow: { position: 'absolute', top: 0, left: 0 },

  /* header */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  avatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: BRAND,
    flexShrink: 0,
  },
  headerInfo: { gap: 2 },
  heroName: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 38,
    letterSpacing: -0.8,
    lineHeight: 42,
  },
  heroSub: { color: TEXT_SECONDARY, fontSize: 14, letterSpacing: -0.42 },

  /* section */
  section: { paddingHorizontal: 20, marginTop: 20 },
  sectionLabel: {
    color: TEXT_MUTED,
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: -0.42,
    textTransform: 'uppercase',
    marginBottom: 10,
  },

  /* hero recovery card */
  heroCard: {
    backgroundColor: 'rgba(22,29,15,0.8)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(200,241,53,0.12)',
    padding: 20,
  },
  recovLabel: {
    color: TEXT_MUTED,
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: -0.42,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  recovTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 12,
  },
  recovScore: {
    color: BRAND,
    fontSize: 70,
    fontWeight: '900',
    lineHeight: 76,
  },
  recovMsg: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '400',
    flex: 1,
    lineHeight: 20,
    letterSpacing: -0.42,
  },
  recovPantins: {
    alignItems: 'center',
    marginBottom: 12,
  },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendTxt: {
    color: '#FFFFFF',
    fontSize: 10,
    letterSpacing: -0.3,
    marginRight: 10,
  },

  /* CTA */
  ctaWrap: { marginHorizontal: 20, marginTop: 16 },
  cta: {
    height: 52,
    borderRadius: 40,
    backgroundColor: 'rgba(200,241,53,0.4)',
    borderWidth: 1,
    borderColor: BRAND,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  ctaIcon: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '400',
    lineHeight: 20,
  },
  ctaTxt: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
    letterSpacing: -0.64,
  },

  /* programme cards */
  progCard: {
    backgroundColor: SURFACE,
    borderRadius: 20,
    width: 160,
    overflow: 'hidden',
  },
  progAccent: {
    height: 3,
    backgroundColor: BRAND,
    opacity: 0.5,
  },
  progBody: { padding: 14 },
  progTag: {
    color: BRAND,
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  progName: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
    lineHeight: 19,
  },
  progType: { color: TEXT_MUTED, fontSize: 11, marginTop: 3 },

  /* empty state */
  empty: { alignItems: 'center', paddingVertical: 64, paddingHorizontal: 24 },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: SURFACE,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: { color: '#fff', fontWeight: '700', fontSize: 19, marginBottom: 8 },
  emptySub: {
    color: TEXT_SECONDARY,
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 19,
  },
  emptyBtn: {
    backgroundColor: BRAND,
    borderRadius: 999,
    paddingHorizontal: 28,
    paddingVertical: 14,
  },
});
