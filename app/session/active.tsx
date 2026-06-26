import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert, KeyboardAvoidingView, Modal, Platform, Pressable,
  ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { GradientOrb } from '@/components/GradientOrb';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { Program, SessionExercise, ProgressionSuggestion, PRType } from '@/lib/types';
import { RestTimer } from '@/components/RestTimer';
import { SetInput, LastSetInfo } from '@/components/SetInput';
import { computeProgression } from '@/hooks/useLastWeight';
import { usePRDetector, detectPRTypes } from '@/hooks/usePRDetector';
import { ShareCardModal } from '@/components/ShareCardModal';
import type { ShareCardData } from '@/components/ShareCard';

type LastSessionSets = Record<string, LastSetInfo[]>;
type SuggestionCache = Record<string, ProgressionSuggestion[]>;

const BRAND = '#C8F135';
const BG = '#0D1108';
const SURFACE = '#161D0F';
const SURFACE_RAISED = '#1E2914';
const TEXT_SECONDARY = '#59644C';
const TEXT_MUTED = 'rgba(89,100,76,0.5)';
const CONTAINER_BG = 'rgba(22,29,15,0.2)';

const PR_NOTIF_LABELS: Record<PRType, string> = {
  absolu:  '🏆 PR ABSOLU',
  reps:    '💪 PR REPS',
  volume:  '🔥 PR VOLUME',
  streak:  '🌟 6 SÉANCES / SEMAINE',
};

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

async function sendPRNotification(exerciseName: string, types: PRType[]) {
  try {
    const { status } = await Notifications.getPermissionsAsync();
    const finalStatus =
      status !== 'granted'
        ? (await Notifications.requestPermissionsAsync()).status
        : status;
    if (finalStatus !== 'granted') return;
    await Notifications.scheduleNotificationAsync({
      content: {
        title: types.map((t) => PR_NOTIF_LABELS[t]).join(' + '),
        body: `${exerciseName} — record personnel !`,
        sound: true,
      },
      trigger: null,
    });
  } catch {
    // Notifications optionnelles
  }
}

export default function ActiveSessionScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const { programId } = useLocalSearchParams<{ programId?: string }>();

  const [program, setProgram] = useState<Program | null>(null);
  const [exercises, setExercises] = useState<SessionExercise[]>([]);
  const [confirmedSets, setConfirmedSets] = useState<Set<string>>(new Set());
  const [lastSessionSets, setLastSessionSets] = useState<LastSessionSets>({});
  const [suggestions, setSuggestions] = useState<SuggestionCache>({});
  const [prBadges, setPRBadges] = useState<Record<string, PRType[]>>({});
  const [startTime] = useState(Date.now());
  const [elapsed, setElapsed] = useState(0);
  const [saving, setSaving] = useState(false);
  const [newExName, setNewExName] = useState('');
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Partage en fin de séance
  const [shareVisible, setShareVisible] = useState(false);
  const [shareData, setShareData] = useState<ShareCardData | null>(null);
  const [savedSessionId, setSavedSessionId] = useState<string | null>(null);

  const prData = usePRDetector(user?.id, exercises.map((e) => e.name));

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [startTime]);

  useEffect(() => {
    if (!programId || !user) return;

    supabase
      .from('programs')
      .select('*')
      .eq('id', programId)
      .eq('user_id', user.id)
      .single()
      .then(async ({ data }) => {
        if (!data) return;
        setProgram(data);

        const baseExercises: SessionExercise[] = data.exercises.map(
          (ex: { name: string; muscle_group: string }) => ({
            name: ex.name,
            muscle_group: ex.muscle_group,
            sets: [{ exercise_name: ex.name, set_number: 1, reps: '', weight_kg: '' }],
          })
        );

        const { data: recentSessions } = await supabase
          .from('sessions')
          .select('id')
          .eq('user_id', user.id)
          .eq('ppl_block', data.ppl_block)
          .eq('type', data.type)
          .order('date', { ascending: false })
          .limit(3);

        if (!recentSessions?.length) {
          setExercises(baseExercises);
          return;
        }

        const sessionIds = recentSessions.map((s) => s.id);
        const { data: allSets } = await supabase
          .from('sets')
          .select('session_id, exercise_name, set_number, reps, weight_kg')
          .in('session_id', sessionIds)
          .order('set_number', { ascending: true });

        if (!allSets) {
          setExercises(baseExercises);
          return;
        }

        type SessionMap = Record<string, Record<string, { reps: number; weight_kg: number }[]>>;
        const bySession: SessionMap = {};
        for (const s of allSets) {
          if (!bySession[s.session_id]) bySession[s.session_id] = {};
          if (!bySession[s.session_id][s.exercise_name]) bySession[s.session_id][s.exercise_name] = [];
          bySession[s.session_id][s.exercise_name].push({ reps: s.reps, weight_kg: s.weight_kg });
        }

        const n1 = bySession[sessionIds[0]] ?? {};
        const n2 = bySession[sessionIds[1]] ?? {};
        const n3 = bySession[sessionIds[2]] ?? {};

        setLastSessionSets(n1);

        const newSuggestions: SuggestionCache = {};
        for (const exName of Object.keys(n1)) {
          const result = computeProgression(n1[exName], n2[exName], n3[exName]);
          if (result) newSuggestions[exName] = result;
        }
        setSuggestions(newSuggestions);

        setExercises(
          baseExercises.map((ex) => {
            const prev = n1[ex.name];
            if (!prev?.length) return ex;
            return {
              ...ex,
              sets: prev.map((ls, idx) => ({
                exercise_name: ex.name,
                set_number: idx + 1,
                reps: String(ls.reps),
                weight_kg: String(ls.weight_kg),
              })),
            };
          })
        );
      });
  }, [programId, user]);

  function updateSet(exIdx: number, setIdx: number, field: 'reps' | 'weight_kg', value: string) {
    setExercises((prev) => {
      const next = [...prev];
      next[exIdx] = { ...next[exIdx], sets: [...next[exIdx].sets] };
      next[exIdx].sets[setIdx] = { ...next[exIdx].sets[setIdx], [field]: value };
      return next;
    });
  }

  function confirmSet(exIdx: number, setIdx: number) {
    const key = `${exIdx}-${setIdx}`;
    const set = exercises[exIdx].sets[setIdx];
    if (!set.reps || !set.weight_kg) return;

    const weight = parseFloat(set.weight_kg);
    const reps = parseInt(set.reps, 10);

    let sessionVolume = weight * reps;
    for (let ei = 0; ei < exercises.length; ei++) {
      for (let si = 0; si < exercises[ei].sets.length; si++) {
        if (!confirmedSets.has(`${ei}-${si}`)) continue;
        const s = exercises[ei].sets[si];
        sessionVolume += parseFloat(s.weight_kg) * parseInt(s.reps, 10);
      }
    }
    const isFirstSet = confirmedSets.size === 0;

    setConfirmedSets((prev) => new Set(prev).add(key));

    setExercises((prev) => {
      const next = [...prev];
      const ex = { ...next[exIdx], sets: [...next[exIdx].sets] };
      ex.sets.push({
        exercise_name: ex.name,
        set_number: ex.sets.length + 1,
        reps: set.reps,
        weight_kg: set.weight_kg,
      });
      next[exIdx] = ex;
      return next;
    });

    if (prData) {
      const detected = detectPRTypes(
        exercises[exIdx].name,
        weight,
        reps,
        sessionVolume,
        isFirstSet,
        prData,
      );
      if (detected.length > 0) {
        setPRBadges((prev) => ({ ...prev, [key]: detected }));
        sendPRNotification(exercises[exIdx].name, detected);
      }
    }
  }

  function addExercise() {
    if (!newExName.trim()) return;
    setExercises((prev) => [
      ...prev,
      {
        name: newExName.trim(),
        muscle_group: '',
        sets: [{ exercise_name: newExName.trim(), set_number: 1, reps: '', weight_kg: '' }],
      },
    ]);
    setNewExName('');
  }

  const finishSession = useCallback(async () => {
    if (!user) return;
    setSaving(true);

    const setsToSave: Array<{
      exercise_name: string;
      set_number: number;
      reps: number;
      weight_kg: number;
      is_pr: boolean;
      pr_type: string | null;
      rest_seconds: null;
    }> = [];

    for (let exIdx = 0; exIdx < exercises.length; exIdx++) {
      const ex = exercises[exIdx];
      for (let setIdx = 0; setIdx < ex.sets.length; setIdx++) {
        if (!confirmedSets.has(`${exIdx}-${setIdx}`)) continue;
        const s = ex.sets[setIdx];
        const badges = prBadges[`${exIdx}-${setIdx}`] ?? [];
        setsToSave.push({
          exercise_name: ex.name,
          set_number: s.set_number,
          reps: parseInt(s.reps, 10),
          weight_kg: parseFloat(s.weight_kg),
          is_pr: badges.length > 0,
          pr_type: badges[0] ?? null,
          rest_seconds: null,
        });
      }
    }

    if (setsToSave.length === 0) {
      Alert.alert('Séance vide', 'Confirme au moins une série avant de terminer.');
      setSaving(false);
      return;
    }

    const durationMinutes = Math.ceil(elapsed / 60);

    const { data: sessionData, error: sessionError } = await supabase
      .from('sessions')
      .insert({
        user_id: user.id,
        program_id: program?.id ?? null,
        date: new Date().toISOString(),
        duration_minutes: durationMinutes,
        type: program?.type ?? null,
        ppl_block: program?.ppl_block ?? null,
      })
      .select()
      .single();

    if (sessionError || !sessionData) {
      setSaving(false);
      Alert.alert('Erreur', 'Impossible de sauvegarder la séance.');
      return;
    }

    await supabase.from('sets').insert(
      setsToSave.map((s) => ({ ...s, session_id: sessionData.id }))
    );

    // Séances ces 7 derniers jours (incluant celle qui vient d'être sauvegardée)
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 6);
    weekAgo.setHours(0, 0, 0, 0);
    const { count: weekCount } = await supabase
      .from('sessions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('date', weekAgo.toISOString());

    const volumeTotal = setsToSave.reduce((sum, s) => sum + s.weight_kg * s.reps, 0);
    const firstPR = setsToSave.find((s) => s.is_pr);

    const sessionType = [
      program?.ppl_block?.toUpperCase(),
      program?.type?.toUpperCase(),
    ].filter(Boolean).join(' · ') || 'SÉANCE LIBRE';

    setSaving(false);
    setSavedSessionId(sessionData.id);
    setShareData({
      sessionType,
      volumeTotal,
      durationMinutes: Math.ceil(elapsed / 60),
      prInfo: firstPR
        ? { name: firstPR.exercise_name, value: `${firstPR.weight_kg}kg × ${firstPR.reps}` }
        : null,
      weekStreak: weekCount ?? 1,
    });
    setShareVisible(true);
  }, [user, exercises, confirmedSets, prBadges, elapsed, program, router]);

  function handleFinish() {
    Alert.alert(
      'Terminer la séance ?',
      `${Math.ceil(elapsed / 60)} min · ${confirmedSets.size} séries`,
      [
        { text: 'Continuer', style: 'cancel' },
        { text: 'Terminer', onPress: finishSession },
      ]
    );
  }

  function handleAbandon() {
    Alert.alert('Abandonner ?', '', [
      { text: 'Continuer', style: 'cancel' },
      { text: 'Abandonner', style: 'destructive', onPress: () => router.back() },
    ]);
  }

  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;
  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView style={ss.root} edges={['top']}>
      <GradientOrb />

      {/* ── Abandon + chrono (overlay) ───────────────────── */}
      <View style={ss.topOverlay} pointerEvents="box-none">
        <Pressable onPress={handleAbandon} style={ss.abandonBtn} hitSlop={12}>
          <Text style={ss.abandonTxt}>✕</Text>
        </Pressable>
        <View style={ss.chronoPill}>
          <Text style={ss.chronoTxt}>
            {mins}:{secs.toString().padStart(2, '0')}
          </Text>
        </View>
      </View>

      {/* ── Container principal ──────────────────────────── */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <View style={ss.container}>
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={ss.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Timer repos */}
            <RestTimer />

            {/* Exercices */}
            {exercises.map((ex, exIdx) => (
              <View key={exIdx} style={ss.exCard}>
                <View style={ss.exHeader}>
                  <Text style={ss.exName}>{ex.name}</Text>
                  {ex.muscle_group ? (
                    <Text style={ss.exMuscle}>{ex.muscle_group}</Text>
                  ) : null}
                </View>
                {ex.sets.map((set, setIdx) => (
                  <SetInput
                    key={setIdx}
                    setNumber={set.set_number}
                    reps={set.reps}
                    weight={set.weight_kg}
                    lastSetInfo={lastSessionSets[ex.name]?.[setIdx] ?? null}
                    suggestion={suggestions[ex.name]?.[setIdx] ?? null}
                    prTypes={prBadges[`${exIdx}-${setIdx}`]}
                    onRepsChange={(v) => updateSet(exIdx, setIdx, 'reps', v)}
                    onWeightChange={(v) => updateSet(exIdx, setIdx, 'weight_kg', v)}
                    onConfirm={() => confirmSet(exIdx, setIdx)}
                    isConfirmed={confirmedSets.has(`${exIdx}-${setIdx}`)}
                  />
                ))}
              </View>
            ))}

            {/* Ajouter un exercice */}
            <View style={ss.addExWrap}>
              <Text style={ss.addExLabel}>AJOUTER UN EXERCICE</Text>
              <View style={ss.addExRow}>
                <TextInput
                  style={ss.addExInput}
                  placeholder="Nom de l'exercice"
                  placeholderTextColor={TEXT_SECONDARY}
                  value={newExName}
                  onChangeText={setNewExName}
                  onSubmitEditing={addExercise}
                />
                <Pressable onPress={addExercise} style={ss.addExBtn}>
                  <Text style={ss.addExBtnTxt}>+</Text>
                </Pressable>
              </View>
            </View>

            <View style={{ height: 100 }} />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>

      {/* ── Bouton Terminer (Figma style) ────────────────── */}
      <View style={[ss.terminWrap, { bottom: insets.bottom + 14 }]}>
        <Pressable onPress={handleFinish} disabled={saving} style={ss.terminBtn}>
          <Text style={ss.terminTxt}>{saving ? '...' : 'Terminer la séance'}</Text>
        </Pressable>
      </View>

      {/* ── Modal partage ────────────────────────────────── */}
      <Modal visible={shareVisible} animationType="slide" presentationStyle="fullScreen">
        {shareData && savedSessionId && (
          <ShareCardModal
            data={shareData}
            onDismiss={() => {
              setShareVisible(false);
              router.replace(`/session/${savedSessionId}`);
            }}
          />
        )}
      </Modal>
    </SafeAreaView>
  );
}

const ss = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },


  /* overlay abandon + chrono */
  topOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 10,
    zIndex: 10,
  },
  abandonBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(22,29,15,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  abandonTxt: { color: TEXT_SECONDARY, fontSize: 14, fontWeight: '600' },
  chronoPill: {
    backgroundColor: 'rgba(22,29,15,0.7)',
    borderRadius: 99,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  chronoTxt: {
    color: BRAND,
    fontWeight: '700',
    fontSize: 14,
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.3,
  },

  /* container principal */
  container: {
    flex: 1,
    backgroundColor: CONTAINER_BG,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    overflow: 'hidden',
    marginTop: 54,  // espace pour l'overlay abandon/chrono
  },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 20,
    gap: 26,
    alignItems: 'center',
  },

  /* exercise card */
  exCard: {
    backgroundColor: 'rgba(22,29,15,0.6)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(200,241,53,0.07)',
    padding: 16,
    width: '100%',
  },
  exHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  exName: { color: '#FFFFFF', fontWeight: '800', fontSize: 18 },
  exMuscle: { color: TEXT_MUTED, fontSize: 12 },

  /* ajouter un exercice */
  addExWrap: { width: '100%', gap: 8 },
  addExLabel: {
    color: TEXT_MUTED,
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: -0.42,
  },
  addExRow: { flexDirection: 'row', gap: 8 },
  addExInput: {
    flex: 1,
    backgroundColor: CONTAINER_BG,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BRAND,
    paddingHorizontal: 14,
    paddingVertical: 14,
    color: TEXT_SECONDARY,
    fontSize: 14,
  },
  addExBtn: {
    width: 52,
    height: 52,
    backgroundColor: SURFACE,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BRAND,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addExBtnTxt: { color: BRAND, fontWeight: '800', fontSize: 22, lineHeight: 24 },

  /* bouton terminer (Figma style) */
  terminWrap: {
    position: 'absolute',
    left: 20,
    right: 20,
  },
  terminBtn: {
    borderRadius: 40,
    backgroundColor: 'rgba(200,241,53,0.4)',
    borderWidth: 1,
    borderColor: BRAND,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    shadowColor: BRAND,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.04,
    shadowRadius: 5.5,
    elevation: 8,
  },
  terminTxt: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
    letterSpacing: -0.64,
  },
});
