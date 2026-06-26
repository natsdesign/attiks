import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated, Easing, Pressable, ScrollView,
  StyleSheet, Text, View,
} from 'react-native';
import Svg, { Line } from 'react-native-svg';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { Program } from '@/lib/types';
import { useRecoveryScore } from '@/hooks/useRecoveryScore';
import { GradientOrb } from '@/components/GradientOrb';
import { Icon } from '@/components/Icon';

// ── Tokens (valeurs exactes Figma 145:1175) ───────────────────────────────────

const BG           = '#0D1108';
const CARD_BG      = 'rgba(22,29,15,0.1)';
const CARD_BORDER  = '#2A2A2A';
const BRAND        = '#C8F135';
const TEXT_WHITE   = '#FFFFFF';
const TEXT_OLIVE   = '#59644C';
const TEXT_MUTED   = 'rgba(89,100,76,0.5)';
const TEXT_DIM     = 'rgba(255,255,255,0.7)';
const PILL_BG      = 'rgba(200,241,53,0.1)';
const ANTON        = 'Anton_400Regular';

// ── Gauge circulaire en pointillés ────────────────────────────────────────────

const GAUGE_SIZE   = 133;
const TICK_COUNT   = 44;
const TICK_R_OUTER = GAUGE_SIZE / 2 - 4;
const TICK_R_INNER = TICK_R_OUTER - 9;
const CX           = GAUGE_SIZE / 2;
const CY           = GAUGE_SIZE / 2;

function RecoveryGauge({ score }: { score: number }) {
  const activeTicks = Math.round((score / 100) * TICK_COUNT);
  return (
    <Svg width={GAUGE_SIZE} height={GAUGE_SIZE}>
      {Array.from({ length: TICK_COUNT }).map((_, i) => {
        const angle = (i / TICK_COUNT) * Math.PI * 2 - Math.PI / 2;
        const x1 = CX + TICK_R_INNER * Math.cos(angle);
        const y1 = CY + TICK_R_INNER * Math.sin(angle);
        const x2 = CX + TICK_R_OUTER * Math.cos(angle);
        const y2 = CY + TICK_R_OUTER * Math.sin(angle);
        const active = i < activeTicks;
        return (
          <Line key={i}
            x1={x1.toFixed(2)} y1={y1.toFixed(2)}
            x2={x2.toFixed(2)} y2={y2.toFixed(2)}
            stroke={active ? BRAND : '#2A2A2A'}
            strokeWidth={2}
            strokeLinecap="round"
          />
        );
      })}
    </Svg>
  );
}

// ── Meta pill (durée / exercices) ─────────────────────────────────────────────

function MetaPill({ icon, label }: { icon: 'clock' | 'barbell'; label: string }) {
  return (
    <View style={ss.pill}>
      <Icon name={icon} size={14} color={TEXT_DIM} />
      <Text style={ss.pillTxt}>{label}</Text>
    </View>
  );
}

// ── Utilitaires ───────────────────────────────────────────────────────────────

function formatDuration(exerciseCount: number): string {
  const min = exerciseCount * 12;
  if (min >= 60) return `${Math.round(min / 60)}h${min % 60 > 0 ? (min % 60) : ''}`;
  return `${min}min`;
}

function todayLabel(): string {
  const s = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long',
  });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ── Écran principal ───────────────────────────────────────────────────────────

export default function SeanceScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { score, message } = useRecoveryScore(user?.id);

  const [pseudo, setPseudo] = useState('');
  const [programs, setPrograms] = useState<Program[]>([]);
  const todayProgram = programs[0] ?? null;

  // Stagger d'entrée (opacity + translateY)
  const anims = useRef(Array.from({ length: 4 }, () => new Animated.Value(0))).current;
  useEffect(() => {
    Animated.stagger(80, anims.map(a =>
      Animated.timing(a, {
        toValue: 1,
        duration: 350,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      })
    )).start();
  }, []);

  const sect = (i: number) => ({
    opacity: anims[i],
    transform: [{ translateY: anims[i].interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }],
  });

  useFocusEffect(
    useCallback(() => {
      if (!user) return;
      supabase.from('user_profiles').select('pseudo').eq('id', user.id).single()
        .then(({ data }) => { if (data) setPseudo(data.pseudo ?? ''); });
      supabase.from('programs').select('*').eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .then(({ data }) => setPrograms(data ?? []));
    }, [user])
  );

  const name = (pseudo || 'Athlète').toUpperCase();
  const exerciseCount = todayProgram?.exercises?.length ?? 0;

  return (
    <SafeAreaView style={ss.root}>
      <GradientOrb />

      <ScrollView
        contentContainerStyle={[ss.scroll, { paddingBottom: 120 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >

        {/* ── 1. HEADER ───────────────────────────────────────────── */}
        <Animated.View style={[ss.header, sect(0)]}>
          <Text style={ss.name}>{name}</Text>
          <Text style={ss.date}>{todayLabel()}</Text>
        </Animated.View>

        {/* ── 2. RÉCUPÉRATION ─────────────────────────────────────── */}
        <Animated.View style={[ss.section, sect(1)]}>
          <View style={ss.card}>
            {/* Colonne gauche */}
            <View style={ss.recovLeft}>
              <View>
                <Text style={ss.cardLabel}>RÉCUPÉRATION</Text>
                <Text style={ss.recovScore}>{score}%</Text>
              </View>
              <Text style={ss.recovMsg}>{message}</Text>
            </View>

            {/* Gauge circulaire */}
            <View style={ss.gaugeWrap}>
              <RecoveryGauge score={score} />
            </View>
          </View>
        </Animated.View>

        {/* ── 3. PROGRAMME DU JOUR ────────────────────────────────── */}
        <Animated.View style={[ss.section, sect(2)]}>
          {todayProgram ? (
            <View style={[ss.card, ss.cardCol]}>
              {/* Infos programme */}
              <View style={ss.progInfo}>
                <View>
                  <Text style={ss.cardLabel}>PROGRAMME DU JOUR</Text>
                  <Text style={ss.progName} numberOfLines={1}>
                    {todayProgram.name.toUpperCase()}
                  </Text>
                </View>
                <View style={ss.pills}>
                  {exerciseCount > 0 && (
                    <MetaPill icon="clock" label={formatDuration(exerciseCount)} />
                  )}
                  {exerciseCount > 0 && (
                    <MetaPill icon="barbell" label={String(exerciseCount)} />
                  )}
                </View>
              </View>

              {/* CTA principal */}
              <Pressable
                style={ss.ctaBtn}
                onPress={() =>
                  router.push({
                    pathname: '/session/active',
                    params: { programId: todayProgram.id },
                  })
                }
              >
                <Text style={ss.ctaTxt}>Commencer la séance</Text>
              </Pressable>
            </View>
          ) : (
            // Pas de programme → card vide
            <Pressable
              style={[ss.card, ss.cardCol, { gap: 20 }]}
              onPress={() => router.push('/(tabs)/programs')}
            >
              <View style={ss.progInfo}>
                <Text style={ss.cardLabel}>PROGRAMME DU JOUR</Text>
                <Text style={[ss.progName, { color: TEXT_MUTED }]}>AUCUN</Text>
              </View>
              <Pressable
                style={[ss.ctaBtn, ss.ctaBtnOutline]}
                onPress={() => router.push('/(tabs)/programs')}
              >
                <Text style={[ss.ctaTxt, { color: '#0D1108' }]}>Créer mon programme →</Text>
              </Pressable>
            </Pressable>
          )}
        </Animated.View>

        {/* ── 4. SÉANCE LIBRE ─────────────────────────────────────── */}
        <Animated.View style={[ss.freeLink, sect(3)]}>
          <Pressable onPress={() => router.push('/session/active')}>
            <Text style={ss.freeTxt}>ou démarrer une séance libre</Text>
          </Pressable>
        </Animated.View>

      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles (valeurs pixel-perfect Figma) ──────────────────────────────────────

const ss = StyleSheet.create({
  root:   { flex: 1, backgroundColor: BG },
  scroll: { paddingHorizontal: 20, paddingTop: 10 },

  // Header (Frame 33 — y:60)
  header: { marginTop: 50 },
  name: {
    fontFamily: ANTON,
    fontSize: 70,
    color: TEXT_WHITE,
    letterSpacing: -1.4,
    lineHeight: 86,
  },
  date: {
    fontFamily: 'Inter',
    fontSize: 14,
    color: TEXT_OLIVE,
    letterSpacing: -0.42,
    marginTop: 2,
  },

  // Sections gap: 16px
  section: { marginTop: 16 },

  // Card de base (Frame 31 / Frame 56)
  card: {
    backgroundColor: CARD_BG,
    borderWidth: 0.5,
    borderColor: '#2A2A2A',
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    gap: 6,
    overflow: 'hidden',
  },
  cardCol: { flexDirection: 'column', gap: 30 },

  // Label section interne (12px SemiBold muted)
  cardLabel: {
    fontFamily: 'Inter',
    fontWeight: '600',
    fontSize: 12,
    color: TEXT_MUTED,
    letterSpacing: -0.36,
    marginBottom: 0,
  },

  // Récupération — colonne gauche 197px
  recovLeft: {
    width: 197,
    gap: 12,
    justifyContent: 'space-between',
  },
  recovScore: {
    fontFamily: ANTON,
    fontSize: 50,
    color: BRAND,
    letterSpacing: -1.5,
    lineHeight: 66,
    width: 100,
  },
  recovMsg: {
    fontFamily: 'Inter',
    fontSize: 12,
    color: TEXT_DIM,
    letterSpacing: -0.36,
    lineHeight: 17,
    flex: 1,
  },
  gaugeWrap: { alignSelf: 'center' },

  // Programme du jour
  progInfo: { gap: 4 },
  progName: {
    fontFamily: ANTON,
    fontSize: 50,
    color: BRAND,
    letterSpacing: -1.5,
    lineHeight: 65,
  },

  // Pills durée / exercices
  pills: { flexDirection: 'row', gap: 4, marginTop: 0 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: PILL_BG,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  pillTxt: {
    fontFamily: 'Inter',
    fontSize: 12,
    color: TEXT_DIM,
    letterSpacing: -0.36,
  },

  // CTA bouton solide #C8F135
  ctaBtn: {
    backgroundColor: BRAND,
    borderWidth: 1,
    borderColor: BRAND,
    borderRadius: 40,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    // Glow shadow (5 couches Figma)
    shadowColor: BRAND,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.04,
    shadowRadius: 5.5,
    elevation: 4,
  },
  ctaBtnOutline: {
    backgroundColor: '#C8F135',
    borderWidth: 0,
    borderRadius: 12,
    height: 52,
  },
  ctaTxt: {
    fontFamily: 'Inter',
    fontWeight: '700',
    fontSize: 16,
    color: BG,
    letterSpacing: -0.64,
  },

  // "ou démarrer une séance libre"
  freeLink: { marginTop: 16, alignItems: 'center' },
  freeTxt: {
    fontFamily: 'Inter',
    fontWeight: '600',
    fontSize: 14,
    color: TEXT_MUTED,
    letterSpacing: -0.42,
    textAlign: 'center',
  },
});
