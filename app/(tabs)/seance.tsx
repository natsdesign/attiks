import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { GradientOrb } from '@/components/GradientOrb';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { Program, Session } from '@/lib/types';
import { SessionCard } from '@/components/SessionCard';
import { Icon } from '@/components/Icon';
import { useRecoveryScore } from '@/hooks/useRecoveryScore';

const BRAND = '#C8F135';
const BG = '#0A0D06';
const SURFACE = '#161D0F';
const SURFACE_RAISED = '#1E2914';
const TEXT_SECONDARY = '#59644C';
const TEXT_MUTED = 'rgba(89,100,76,0.5)';

const PPL_LABELS: Record<string, string> = {
  push: 'Push', pull: 'Pull', legs: 'Legs', full: 'Full Body',
};
const TYPE_LABELS: Record<string, string> = {
  force: 'Force', hypertrophie: 'Hypertrophie',
};

export default function SeanceScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [programs, setPrograms] = useState<Program[]>([]);
  const [recentSessions, setRecentSessions] = useState<Session[]>([]);
  const [pseudo, setPseudo] = useState('');
  const [selectedProgramId, setSelectedProgramId] = useState<string | null>(null);
  const { score, message } = useRecoveryScore(user?.id);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('user_profiles').select('pseudo').eq('id', user.id).single()
      .then(({ data }) => { if (data) setPseudo(data.pseudo ?? ''); });
    supabase
      .from('programs').select('*').eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        const list = data ?? [];
        setPrograms(list);
        if (list.length > 0) setSelectedProgramId(list[0].id);
      });
    supabase
      .from('sessions').select('*, sets(*)').eq('user_id', user.id)
      .order('date', { ascending: false }).limit(3)
      .then(({ data }) => setRecentSessions(data ?? []));
  }, [user]);

  const name = pseudo || 'Athlète';
  const dateStr = (() => {
    const s = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
    return s.charAt(0).toUpperCase() + s.slice(1);
  })();

  const selectedProgram = programs.find((p) => p.id === selectedProgramId) ?? null;

  return (
    <SafeAreaView style={ss.root}>
      <GradientOrb />

      <ScrollView contentContainerStyle={ss.scroll} showsVerticalScrollIndicator={false}>

        {/* ── HEADER ─────────────────────────────────────────── */}
        <View style={ss.header}>
          <Text style={ss.name}>{name.toUpperCase()}</Text>
          <Text style={ss.date}>{dateStr}</Text>
        </View>

        {/* ── RÉCUPÉRATION COMPACTE ────────────────────────── */}
        <View style={ss.section}>
          <View style={ss.recovCard}>
            <Text style={ss.recovLabel}>RÉCUPÉRATION GLOBALE</Text>
            <View style={ss.recovRow}>
              <Text style={ss.recovScore}>{score}%</Text>
              <Text style={ss.recovMsg}>{message}</Text>
            </View>
            <View style={ss.recovProgressOuter}>
              <View style={[ss.recovProgressFill, { width: `${score}%` as any }]} />
            </View>
            <Pressable
              onPress={() => router.push('/(tabs)/profile')}
              style={ss.recovLink}
            >
              <Text style={ss.recovLinkTxt}>Voir le détail</Text>
              <Icon name="caretRight" size={12} color={BRAND} />
            </Pressable>
          </View>
        </View>

        {/* ── DÉMARRER UNE SÉANCE ──────────────────────────── */}
        <View style={ss.section}>
          <Text style={ss.sectionLabel}>DÉMARRER</Text>
          <View style={ss.startCards}>

            {/* Séance libre */}
            <Pressable
              onPress={() => router.push('/session/active')}
              style={[ss.startCard, ss.startCardFree]}
            >
              <Icon name="barbell" size={26} color={BRAND} />
              <Text style={ss.startCardTitle}>Séance libre</Text>
              <Text style={ss.startCardSub}>Choisis tes exercices au fur et à mesure</Text>
            </Pressable>

            {/* Depuis un programme */}
            <Pressable
              onPress={() =>
                selectedProgram &&
                router.push({ pathname: '/session/active', params: { programId: selectedProgram.id } })
              }
              disabled={!selectedProgram}
              style={[ss.startCard, selectedProgram ? ss.startCardProg : ss.startCardProgEmpty]}
            >
              <Icon name="list" size={26} color={selectedProgram ? '#0D1108' : TEXT_MUTED} />
              <Text style={[ss.startCardTitle, selectedProgram && ss.startCardTitleDark]} numberOfLines={2}>
                {selectedProgram ? selectedProgram.name : 'Aucun programme'}
              </Text>
              <Text style={[ss.startCardSub, selectedProgram && ss.startCardSubDark]}>
                {selectedProgram
                  ? [PPL_LABELS[selectedProgram.ppl_block], TYPE_LABELS[selectedProgram.type]]
                      .filter(Boolean).join(' · ')
                  : "Crée-en un dans l'onglet Programme"}
              </Text>
            </Pressable>
          </View>

          {/* Sélecteur de programme (si plusieurs) */}
          {programs.length > 1 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={ss.progSelector}
              contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}
            >
              {programs.map((p) => (
                <Pressable
                  key={p.id}
                  onPress={() => setSelectedProgramId(p.id)}
                  style={[ss.progChip, selectedProgramId === p.id && ss.progChipActive]}
                >
                  <Text style={[ss.progChipTxt, selectedProgramId === p.id && ss.progChipTxtActive]}>
                    {p.name}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          )}
        </View>

        {/* ── SÉANCES RÉCENTES ────────────────────────────── */}
        {recentSessions.length > 0 && (
          <View style={ss.section}>
            <Text style={ss.sectionLabel}>RÉCENTES</Text>
            {recentSessions.map((s) => (
              <SessionCard key={s.id} session={s} onPress={() => router.push(`/session/${s.id}`)} />
            ))}
          </View>
        )}

        {/* ── ÉTAT VIDE ───────────────────────────────────── */}
        {programs.length === 0 && recentSessions.length === 0 && (
          <View style={ss.empty}>
            <Text style={{ fontSize: 40 }}>🏋️</Text>
            <Text style={ss.emptyTitle}>Bienvenue sur Attiks !</Text>
            <Text style={ss.emptySub}>
              Crée ton premier programme ou démarre une séance libre.
            </Text>
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

  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 4 },
  name: { color: '#FFFFFF', fontWeight: '900', fontSize: 38, letterSpacing: -0.8 },
  date: { color: TEXT_SECONDARY, fontSize: 14, letterSpacing: -0.42, marginTop: 2 },

  section: { paddingHorizontal: 20, marginTop: 20 },
  sectionLabel: {
    color: TEXT_MUTED,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 10,
  },

  /* Recovery card */
  recovCard: {
    backgroundColor: SURFACE,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(200,241,53,0.12)',
    padding: 16,
  },
  recovLabel: {
    color: TEXT_MUTED,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  recovRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  recovScore: { color: BRAND, fontSize: 52, fontWeight: '900', lineHeight: 58 },
  recovMsg: { color: 'rgba(255,255,255,0.7)', fontSize: 12, lineHeight: 17, flex: 1 },
  recovProgressOuter: {
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(200,241,53,0.12)',
    marginTop: 12,
    overflow: 'hidden',
  },
  recovProgressFill: { height: '100%', backgroundColor: BRAND, borderRadius: 2 },
  recovLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(200,241,53,0.08)',
    alignSelf: 'flex-start',
  },
  recovLinkTxt: { color: BRAND, fontSize: 12, fontWeight: '600' },

  /* Start cards */
  startCards: { flexDirection: 'row', gap: 10 },
  startCard: {
    flex: 1,
    borderRadius: 20,
    padding: 16,
    gap: 6,
    borderWidth: 1,
  },
  startCardFree: {
    backgroundColor: SURFACE_RAISED,
    borderColor: 'rgba(200,241,53,0.1)',
  },
  startCardProg: {
    backgroundColor: BRAND,
    borderColor: BRAND,
  },
  startCardProgEmpty: {
    backgroundColor: SURFACE,
    borderColor: 'rgba(200,241,53,0.06)',
  },
  startCardTitle: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
    letterSpacing: -0.3,
    lineHeight: 18,
  },
  startCardTitleDark: { color: '#0D1108' },
  startCardSub: {
    color: TEXT_SECONDARY,
    fontSize: 11,
    lineHeight: 15,
  },
  startCardSubDark: { color: 'rgba(13,17,8,0.7)' },

  /* Programme selector chips */
  progSelector: { marginHorizontal: -20, marginTop: 10 },
  progChip: {
    height: 32,
    borderRadius: 99,
    borderWidth: 1,
    borderColor: 'rgba(200,241,53,0.2)',
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progChipActive: {
    backgroundColor: 'rgba(200,241,53,0.1)',
    borderColor: BRAND,
  },
  progChipTxt: { color: TEXT_SECONDARY, fontSize: 12, fontWeight: '600' },
  progChipTxtActive: { color: BRAND },

  /* Empty state */
  empty: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
    gap: 12,
  },
  emptyTitle: { color: '#fff', fontWeight: '700', fontSize: 18 },
  emptySub: { color: TEXT_SECONDARY, fontSize: 13, textAlign: 'center', lineHeight: 19 },
});
