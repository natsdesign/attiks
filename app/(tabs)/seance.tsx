import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated, Easing, PanResponder, Pressable, ScrollView,
  StyleSheet, Text, View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { Program } from '@/lib/types';
import { useRecoveryScore } from '@/hooks/useRecoveryScore';
import { GradientOrb } from '@/components/GradientOrb';
import { Icon } from '@/components/Icon';
import { Mascot, mascotStateForScore } from '@/components/Mascot';
import { GlassCard, GlassButton } from '@/components/glass';
import { useTheme, Theme } from '@/lib/theme';

const MASCOT_SIZE = 150;
const RING_SIZE = 174;
const WEEKDAY_LABELS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven'];
const SWIPE_THRESHOLD_RATIO = 0.62;
const HANDLE_SIZE = 39;

// Couleurs reprises telles quelles du fichier Figma (node 346:158) — pas les
// tokens de lib/theme.ts, qui restent inchangés tant que le reste de l'app
// n'a pas suivi la même refonte.
const FIG = {
  screenBg: '#050C0C',
  pillBg: '#070E0F',
  streakChipBg: 'rgba(20,28,26,0.4)',
  progThumbBg: '#1B261D',
  badgeBg: '#D2E150',
  badgeTxt: '#05090C',
  ctaBorder: '#C8F135',
  ring: '#C8F135',
};

// ── Utilitaires date / streak ───────────────────────────────────────────────

function toDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function startOfWeekMonday(d: Date): Date {
  const day = d.getDay(); // 0 = dimanche .. 6 = samedi
  const diff = (day === 0 ? -6 : 1) - day;
  const monday = new Date(d);
  monday.setDate(d.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function computeStreak(sessionDateKeys: Set<string>): number {
  const oneDay = 24 * 60 * 60 * 1000;
  let cursor = new Date();
  cursor.setHours(0, 0, 0, 0);

  if (!sessionDateKeys.has(toDateKey(cursor))) {
    cursor = new Date(cursor.getTime() - oneDay);
    if (!sessionDateKeys.has(toDateKey(cursor))) return 0;
  }

  let streak = 0;
  while (sessionDateKeys.has(toDateKey(cursor))) {
    streak += 1;
    cursor = new Date(cursor.getTime() - oneDay);
  }
  return streak;
}

function formatDuration(exerciseCount: number): string {
  const min = exerciseCount * 12;
  if (min >= 60) return `${Math.round(min / 60)}h${min % 60 > 0 ? (min % 60) : ''}`;
  return `${min}min`;
}

function recoveryBadge(score: number, theme: Theme): { label: string; color: string } {
  if (score >= 85) return { label: 'Excellente', color: FIG.badgeBg };
  if (score >= 65) return { label: 'Bonne', color: theme.recoveryMid };
  return { label: 'Fatiguée', color: theme.recoveryFatigued };
}

// ── CTA swipe — remplace le lien texte "Séance libre" ───────────────────────
// PanResponder + Animated (RN pur, pas de Reanimated — crash en Expo Go).

// Ressort façon iOS (UIKit spring : damping ratio ~0.86, réponse rapide)
// plutôt que le `bounciness` par défaut de RN qui rebondit de façon trop
// mécanique. useNativeDriver: true partout — tout tourne sur le thread UI,
// aucun à-coup lié au JS.
const IOS_SPRING = { damping: 22, mass: 0.7, stiffness: 340, useNativeDriver: true } as const;

function SwipeToStart({ label, onComplete }: { label: string; onComplete: () => void }) {
  const [trackWidth, setTrackWidth] = useState(0);
  const pan = useRef(new Animated.Value(0)).current;
  const grabScale = useRef(new Animated.Value(1)).current;
  const maxDragRef = useRef(0);

  const maxDrag = Math.max(1, trackWidth - HANDLE_SIZE - 8);
  maxDragRef.current = maxDrag;

  const springBack = useCallback(() => {
    Animated.parallel([
      Animated.spring(pan, { toValue: 0, ...IOS_SPRING }),
      Animated.spring(grabScale, { toValue: 1, ...IOS_SPRING }),
    ]).start();
  }, [pan, grabScale]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 4 && Math.abs(g.dx) > Math.abs(g.dy),
      onPanResponderGrant: () => {
        Animated.spring(grabScale, { toValue: 1.12, ...IOS_SPRING }).start();
      },
      onPanResponderMove: (_, g) => {
        const x = Math.min(Math.max(g.dx, 0), maxDragRef.current);
        pan.setValue(x);
      },
      onPanResponderRelease: (_, g) => {
        if (g.dx >= maxDragRef.current * SWIPE_THRESHOLD_RATIO) {
          Animated.parallel([
            Animated.timing(pan, {
              toValue: maxDragRef.current, duration: 180,
              easing: Easing.out(Easing.cubic), useNativeDriver: true,
            }),
            Animated.spring(grabScale, { toValue: 1, ...IOS_SPRING }),
          ]).start(() => {
            onComplete();
            pan.setValue(0);
          });
        } else {
          springBack();
        }
      },
      onPanResponderTerminate: springBack,
    })
  ).current;

  return (
    <View style={ss.swipeTrack} onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}>
      <BlurView intensity={35} tint="light" style={StyleSheet.absoluteFill} />
      <LinearGradient
        colors={['rgba(122,196,97,0.5)', 'rgba(215,228,78,0.5)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={StyleSheet.absoluteFill}
      />
      {/* reflet verre — lumière diagonale en haut à gauche */}
      <LinearGradient
        colors={['rgba(255,255,255,0.4)', 'rgba(255,255,255,0)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.7, y: 1 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      <Animated.Text
        style={[
          ss.swipeLabel,
          {
            opacity: pan.interpolate({ inputRange: [0, maxDrag * 0.7, maxDrag], outputRange: [1, 0.4, 0], extrapolate: 'clamp' }),
            transform: [{
              translateX: pan.interpolate({ inputRange: [0, maxDrag], outputRange: [0, 14], extrapolate: 'clamp' }),
            }],
          },
        ]}
      >
        {label}
      </Animated.Text>
      <Animated.View
        {...panResponder.panHandlers}
        style={[ss.swipeHandle, { transform: [{ translateX: pan }, { scale: grabScale }] }]}
      >
        <Icon name="caretRight" size={13} color="#050C0C" />
        <View style={{ marginLeft: -9 }}>
          <Icon name="caretRight" size={13} color="#050C0C" />
        </View>
      </Animated.View>
    </View>
  );
}

// ── Écran principal ───────────────────────────────────────────────────────────

export default function SeanceScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { score, message } = useRecoveryScore(user?.id);

  const [pseudo, setPseudo] = useState('');
  const [programs, setPrograms] = useState<Program[]>([]);
  const [sessionDateKeys, setSessionDateKeys] = useState<Set<string>>(new Set());
  const todayProgram = programs[0] ?? null;

  // Fondu d'entrée léger — pas de mise en scène
  const anims = useRef(Array.from({ length: 4 }, () => new Animated.Value(0))).current;
  useEffect(() => {
    Animated.stagger(60, anims.map(a =>
      Animated.timing(a, {
        toValue: 1,
        duration: 280,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      })
    )).start();
  }, []);

  const sect = (i: number) => ({
    opacity: anims[i],
    transform: [{ translateY: anims[i].interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }],
  });

  useFocusEffect(
    useCallback(() => {
      if (!user) return;
      supabase.from('user_profiles').select('pseudo').eq('id', user.id).single()
        .then(({ data }) => { if (data) setPseudo(data.pseudo ?? ''); });
      supabase.from('programs').select('*').eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .then(({ data }) => setPrograms(data ?? []));
      supabase.from('sessions').select('date')
        .eq('user_id', user.id)
        .order('date', { ascending: false })
        .limit(60)
        .then(({ data }) => {
          const keys = new Set((data ?? []).map(row => toDateKey(new Date(row.date))));
          setSessionDateKeys(keys);
        });
    }, [user])
  );

  const name = pseudo || 'Athlète';
  const initial = name.charAt(0).toUpperCase();
  const exerciseCount = todayProgram?.exercises?.length ?? 0;
  const streak = computeStreak(sessionDateKeys);
  const badge = recoveryBadge(score, theme);

  const monday = startOfWeekMonday(new Date());
  const todayKey = toDateKey(new Date());
  const weekDays = WEEKDAY_LABELS.map((label, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const key = toDateKey(d);
    return { key, label, done: sessionDateKeys.has(key), isToday: key === todayKey };
  });

  const ss2 = getStyles(theme);

  return (
    <SafeAreaView style={ss2.root}>
      <GradientOrb />

      <ScrollView
        contentContainerStyle={[ss2.scroll, { paddingBottom: 120 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >

        {/* ── SEMAINE + STREAK + AVATAR ───────────────────────────────── */}
        <Animated.View style={[ss2.weekRow, sect(0)]}>
          <View style={ss2.dayPills}>
            {weekDays.map((d) => (
              <View key={d.key} style={[ss2.dayPill, d.isToday && ss2.dayPillToday]}>
                <Text style={ss2.dayLabel}>{d.label}</Text>
                <View style={[ss2.dayCheck, d.done && ss2.dayCheckDone]}>
                  {d.done && <Icon name="check" size={13} color={theme.bg} />}
                </View>
              </View>
            ))}
          </View>
          <View style={ss2.headerRight}>
            <View style={ss2.streakChip}>
              <Icon name="flame" size={15} color={theme.brand} />
              <Text style={ss2.streakTxt}>{streak}</Text>
            </View>
            <View style={ss2.avatarCircle}>
              <Text style={ss2.avatarInitial}>{initial}</Text>
            </View>
          </View>
        </Animated.View>

        {/* ── CARTE RÉCUPÉRATION ──────────────────────────────────── */}
        {/* Colonne mascotte à largeur fixe + carte texte en flex:1 — la
            largeur du texte est garantie par flexbox, jamais grignotée par
            l'anneau (contrairement à un positionnement absolute qui les
            faisait se chevaucher). Seul le débordement vertical (marginTop
            négatif) casse le cadre, sans jamais toucher le texte. */}
        <Animated.View style={sect(1)}>
          <View style={ss2.recovRow}>
            <View style={ss2.mascotCol}>
              <Svg width={RING_SIZE} height={RING_SIZE} style={StyleSheet.absoluteFill}>
                <Defs>
                  <RadialGradient id="ringGlow" cx="50%" cy="50%" r="50%">
                    <Stop offset="45%" stopColor={FIG.ring} stopOpacity={0} />
                    <Stop offset="100%" stopColor={FIG.ring} stopOpacity={0.28} />
                  </RadialGradient>
                </Defs>
                {/* halo diffus */}
                <Circle cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={RING_SIZE / 2} fill="url(#ringGlow)" />
                {/* anneau épais simulé en 3 couches (SVG RN ne fait pas de vrai blur fiable) */}
                <Circle
                  cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={RING_SIZE / 2 - 6}
                  stroke={FIG.ring} strokeWidth={20} fill="none" opacity={0.12}
                />
                <Circle
                  cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={RING_SIZE / 2 - 6}
                  stroke={FIG.ring} strokeWidth={11} fill="none" opacity={0.3}
                />
                <Circle
                  cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={RING_SIZE / 2 - 6}
                  stroke={FIG.ring} strokeWidth={4.5} fill="none" opacity={1}
                />
              </Svg>
              <Mascot state={mascotStateForScore(score)} size={MASCOT_SIZE} />
            </View>
            <GlassCard style={ss2.recovCard} contentStyle={ss2.recovCardContent}>
              <Text style={ss2.recovLabel}>Récupération</Text>
              <Text style={ss2.recovScore}>{score}%</Text>
              <View style={[ss2.badge, { backgroundColor: badge.color }]}>
                <Text style={ss2.badgeTxt}>{badge.label}</Text>
              </View>
              <Text style={ss2.recovMsg}>{message}</Text>
            </GlassCard>
          </View>
        </Animated.View>

        {/* ── CARTE SÉANCE DU JOUR ────────────────────────────────── */}
        <Animated.View style={sect(2)}>
          <GlassCard contentStyle={ss2.progRow}>
            {todayProgram ? (
              <>
                <View style={ss2.progThumb}>
                  <Icon name="barbell" size={26} color={FIG.ctaBorder} />
                </View>
                <View style={ss2.progTextBlock}>
                  <Text style={ss2.progLabel}>Séance du jour</Text>
                  <Text style={ss2.progName} numberOfLines={1}>{todayProgram.name}</Text>
                  {exerciseCount > 0 && (
                    <Text style={ss2.progMeta}>
                      {exerciseCount} exercices · {formatDuration(exerciseCount)}
                    </Text>
                  )}
                </View>
                <GlassButton
                  label="Commencer"
                  icon="caretRight"
                  onPress={() =>
                    router.push({
                      pathname: '/session/active',
                      params: { programId: todayProgram.id },
                    })
                  }
                />
              </>
            ) : (
              <>
                <View style={ss2.progThumb}>
                  <Icon name="barbell" size={26} color={theme.textMuted} />
                </View>
                <View style={ss2.progTextBlock}>
                  <Text style={ss2.progLabel}>Séance du jour</Text>
                  <Text style={[ss2.progName, { opacity: 0.45 }]}>Aucun programme</Text>
                </View>
                <GlassButton label="Créer" icon="caretRight" onPress={() => router.push('/(tabs)/programs')} />
              </>
            )}
          </GlassCard>
        </Animated.View>

        {/* ── SÉANCE LIBRE (swipe) ─────────────────────────────────── */}
        <Animated.View style={[ss2.swipeWrap, sect(3)]}>
          <SwipeToStart
            label="Swipe pour démarrer une séance libre"
            onComplete={() => router.push('/session/active')}
          />
        </Animated.View>

      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles statiques (indépendants du thème) ─────────────────────────────────

const ss = StyleSheet.create({
  swipeTrack: {
    paddingVertical: 15,
    borderRadius: 999,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  swipeLabel: {
    fontFamily: 'Inter',
    fontWeight: '600',
    fontSize: 14,
    color: '#050C0C',
    letterSpacing: -0.35,
  },
  swipeHandle: {
    position: 'absolute',
    left: 4,
    width: HANDLE_SIZE,
    height: HANDLE_SIZE,
    borderRadius: HANDLE_SIZE / 2,
    backgroundColor: 'rgba(5,12,12,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

// ── Styles dépendants du thème ────────────────────────────────────────────────

function getStyles(theme: Theme) {
  return StyleSheet.create({
    root:   { flex: 1, backgroundColor: FIG.screenBg },
    scroll: { paddingHorizontal: 20, paddingTop: 50, gap: 26 },

    // ── Semaine / streak / avatar ────────────────────────────────────────
    weekRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
    dayPills: { flexDirection: 'row', gap: 7 },
    // Le Figma utilise un `drop-shadow` CSS très fin (0.5px de halo marque +
    // 1px net sur le bord du haut) plutôt qu'une vraie bordure — on
    // approxime avec un liseré discret, légèrement plus marqué en haut.
    dayPill: {
      width: 46, height: 64, borderRadius: 12,
      backgroundColor: FIG.pillBg,
      alignItems: 'center', justifyContent: 'center', gap: 7,
      borderWidth: 1, borderColor: 'rgba(200,241,53,0.16)',
      borderTopWidth: 1, borderTopColor: 'rgba(200,241,53,0.4)',
    },
    // "Aujourd'hui" : sur le Figma c'est une lueur *inset* (inset box-shadow),
    // que RN ne sait pas faire nativement — on s'en approche avec une lueur
    // externe douce + un léger lavis de couleur au lieu d'une bordure pleine.
    dayPillToday: {
      backgroundColor: 'rgba(200,241,53,0.07)',
      borderColor: 'rgba(200,241,53,0.5)',
      borderTopColor: FIG.ring,
      shadowColor: FIG.ring, shadowOpacity: 0.55, shadowRadius: 5, shadowOffset: { width: 0, height: 0 },
    },
    dayLabel: {
      fontFamily: 'Inter', fontWeight: '600', fontSize: 12,
      color: theme.textPrimary, letterSpacing: -0.3,
    },
    dayCheck: {
      width: 21, height: 21, borderRadius: 11,
      borderWidth: 1.6, borderColor: 'rgba(200,241,53,0.5)',
      alignItems: 'center', justifyContent: 'center',
    },
    dayCheckDone: { backgroundColor: theme.brand, borderColor: theme.brand },

    headerRight: { flexDirection: 'row', alignItems: 'center', gap: 9 },
    streakChip: {
      flexDirection: 'row', alignItems: 'center', gap: 5,
      backgroundColor: FIG.streakChipBg,
      paddingHorizontal: 10, paddingVertical: 8, borderRadius: 9,
    },
    streakTxt: { fontFamily: 'Inter', fontWeight: '500', fontSize: 13, color: theme.textPrimary },
    avatarCircle: {
      width: 42, height: 42, borderRadius: 21,
      borderWidth: 1.5, borderColor: theme.brand,
      alignItems: 'center', justifyContent: 'center',
      backgroundColor: FIG.pillBg,
    },
    avatarInitial: { fontFamily: 'Inter', fontWeight: '700', fontSize: 16, color: theme.brand },

    // ── Récupération ──────────────────────────────────────────────────────
    recovRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 4 },
    mascotCol: {
      width: RING_SIZE, height: RING_SIZE,
      marginTop: -46, marginBottom: -14, marginRight: -14,
      alignItems: 'center', justifyContent: 'center',
      zIndex: 2,
    },
    recovCard: { flex: 1, zIndex: 1 },
    recovCardContent: {
      padding: 18, paddingLeft: 28, minHeight: 160, justifyContent: 'center', gap: 8,
    },
    recovLabel: { fontFamily: 'Inter', fontWeight: '600', fontSize: 12, color: theme.textPrimary, letterSpacing: -0.36 },
    recovScore: {
      fontFamily: 'Anton', fontSize: 42, color: theme.textPrimary, letterSpacing: -1,
      marginTop: -4,
    },
    badge: { alignSelf: 'flex-start', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
    badgeTxt: { fontFamily: 'Inter', fontWeight: '600', fontSize: 10, color: FIG.badgeTxt, letterSpacing: -0.3 },
    recovMsg: { fontFamily: 'Inter', fontWeight: '500', fontSize: 12, color: 'rgba(255,255,255,0.7)', lineHeight: 16 },

    // ── Séance du jour ───────────────────────────────────────────────────
    progRow: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14 },
    progThumb: {
      width: 56, height: 56, borderRadius: 10,
      backgroundColor: FIG.progThumbBg,
      alignItems: 'center', justifyContent: 'center',
    },
    progTextBlock: { flex: 1, gap: 4 },
    progLabel: { fontFamily: 'Inter', fontWeight: '600', fontSize: 10, color: theme.textPrimary, letterSpacing: -0.3 },
    progName: { fontFamily: 'Inter', fontWeight: '700', fontSize: 16, color: theme.textPrimary, letterSpacing: -0.3 },
    progMeta: { fontFamily: 'Inter', fontWeight: '500', fontSize: 11, color: 'rgba(255,255,255,0.55)' },

    // ── Swipe CTA ─────────────────────────────────────────────────────────
    swipeWrap: { marginTop: 2 },
  });
}
