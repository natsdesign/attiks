import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import RevenueCatUI from 'react-native-purchases-ui';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { usePostHog } from 'posthog-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { MuscleMap } from '@/components/MuscleMap';
import { LogoAttiks } from '@/components/LogoAttiks';
import { GradientOrb } from '@/components/GradientOrb';
import { MUSCLE_RED, MUSCLE_ORANGE, MuscleColors } from '@/hooks/useMuscleRecovery';

type Goal = 'masse' | 'force' | 'les_deux';
type Level = 'debutant' | 'intermediaire' | 'confirme' | 'expert';
type Gender = 'homme' | 'femme';
type Equipment = 'salle_complete' | 'petite_salle' | 'domicile' | 'specifique';
type Structure = 'ppl' | 'full_body' | 'haut_bas' | 'je_sais_pas';

const BRAND = '#C8F135';
const BG = '#0D1108';
const CARD_BG = 'rgba(22,29,15,0.85)';
const TEXT_MUTED = '#888888';
const CARD_BORDER = 'rgba(200,241,53,0.22)';
const CTA_BORDER  = 'rgba(200,241,53,0.45)';

const STEP_PROGRESS: Record<number, number> = {
  2: 0.11, 3: 0.22, 4: 0.33, 5: 0.44, 6: 0.55,
  7: 0.66, 8: 0.77, 9: 0.88, 11: 0.95,
};

const STEP_NUM: Record<number, string> = {
  2: '1', 3: '2', 4: '3', 5: '4', 6: '5',
  7: '6', 8: '7', 9: '8', 11: '9',
};

const DEMO_MUSCLE_COLORS: MuscleColors = {
  pec: MUSCLE_RED,
  'pec-2': MUSCLE_RED,
  triceps: MUSCLE_ORANGE,
  'delt-right': MUSCLE_ORANGE,
  'delt-left': MUSCLE_ORANGE,
};

const GEN_STEPS = [
  'Analyse de ton profil...',
  'Calibrage des charges...',
  'Construction du split...',
  'Programme prêt !',
];

const PREVIEW_EXERCISES: Record<Structure, string[]> = {
  ppl: ['Développé couché barre', 'Écarté haltères', 'Dips'],
  full_body: ['Squat', 'Développé couché barre', 'Rowing'],
  haut_bas: ['Développé couché barre', 'Tirage Vertical', 'Élévation latérale'],
  je_sais_pas: ['Squat', 'Développé couché barre', 'Rowing'],
};

// Pas de barre/haltères à la maison — on garde le même trio, quelle que soit la structure choisie.
const HOME_EXERCISES = ['Pompe', 'Fentes en marche', 'Dips'];

function previewExercisesFor(structure: Structure | null, equipment: Equipment | null): string[] {
  if (equipment === 'domicile') return HOME_EXERCISES;
  return PREVIEW_EXERCISES[structure ?? 'je_sais_pas'];
}

export default function OnboardScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const posthog = usePostHog();

  const [step, setStep] = useState(0);

  // Suivi générique par numéro d'étape : indépendant du contenu de l'écran,
  // donc pas besoin d'y toucher quand on modifie/réordonne le design d'une étape.
  useEffect(() => {
    posthog?.capture('onboarding_step_viewed', { step, step_label: STEP_NUM[step] ?? null });
  }, [step]);

  // ── Form state ───────────────────────────────────────────────
  const [firstName, setFirstName] = useState('');
  const [goal, setGoal] = useState<Goal | null>(null);
  const [level, setLevel] = useState<Level | null>(null);
  const [gender, setGender] = useState<Gender | null>(null);
  const [age, setAge] = useState('');
  const [heightCm, setHeightCm] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [hasCharges, setHasCharges] = useState<boolean | null>(null);
  const [benchKg, setBenchKg] = useState('');
  const [squatKg, setSquatKg] = useState('');
  const [deadliftKg, setDeadliftKg] = useState('');
  const [daysPerWeek, setDaysPerWeek] = useState<number | null>(null);
  const [structure, setStructure] = useState<Structure | null>(null);
  const [equipment, setEquipment] = useState<Equipment | null>(null);

  // ── Animation refs ───────────────────────────────────────────
  const mainProgress = useRef(new Animated.Value(0)).current;
  const welcomeFade = useRef(new Animated.Value(0)).current;
  const welcomeScale = useRef(new Animated.Value(1.1)).current;
  const welcomeSlide = useRef(new Animated.Value(20)).current;
  const welcomeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const genTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [genStepIndex, setGenStepIndex] = useState(0);
  const [paywallPending, setPaywallPending] = useState(false);
  const [exerciseGifs, setExerciseGifs] = useState<Record<string, string>>({});

  useEffect(() => {
    if (step === 6) setHasCharges(null);
  }, [step]);

  useEffect(() => {
    if (step in STEP_PROGRESS) {
      Animated.timing(mainProgress, {
        toValue: STEP_PROGRESS[step],
        duration: 300,
        useNativeDriver: false,
      }).start();
    }
  }, [step]);

  useEffect(() => {
    if (step !== 1) return;
    welcomeFade.setValue(0);
    welcomeScale.setValue(1.1);
    welcomeSlide.setValue(20);
    Animated.parallel([
      Animated.timing(welcomeScale, {
        toValue: 1.0,
        duration: 2000,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.delay(300),
        Animated.parallel([
          Animated.timing(welcomeFade, {
            toValue: 1,
            duration: 800,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(welcomeSlide, {
            toValue: 0,
            duration: 800,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ]),
      ]),
    ]).start();
    welcomeTimerRef.current = setTimeout(() => setStep(2), 3000);
    return () => { if (welcomeTimerRef.current) clearTimeout(welcomeTimerRef.current); };
  }, [step]);

  useEffect(() => {
    if (step !== 11) return;
    setGenStepIndex(0);
    let i = 0;
    const tick = () => {
      i += 1;
      setGenStepIndex(i);
      if (i < GEN_STEPS.length) {
        genTimerRef.current = setTimeout(tick, 700);
      } else {
        genTimerRef.current = setTimeout(() => next(), 600);
      }
    };
    genTimerRef.current = setTimeout(tick, 700);
    return () => { if (genTimerRef.current) clearTimeout(genTimerRef.current); };
  }, [step]);

  useEffect(() => {
    if (step !== 12) return;
    const terms = previewExercisesFor(structure, equipment);
    Promise.all(
      terms.map((term) =>
        supabase
          .from('exercises_library')
          .select('gif_url')
          .ilike('name_fr', `%${term}%`)
          .not('gif_url', 'is', null)
          .limit(1)
          .maybeSingle()
          .then(({ data }) => [term, data?.gif_url as string | undefined] as const)
      )
    ).then((results) => {
      const map: Record<string, string> = {};
      for (const [term, url] of results) if (url) map[term] = url;
      setExerciseGifs(map);
    });
  }, [step, structure, equipment]);

  useEffect(() => {
    if (step !== 13) return;
    setPaywallPending(true);
    RevenueCatUI.presentPaywall().finally(() => {
      setPaywallPending(false);
      finish();
    });
  }, [step]);

  const next = () => setStep(s => s + 1);
  const back = () => {
    if (step === 2) setStep(0);
    else setStep(s => s - 1);
  };

  const firstNameValid = firstName.trim().length >= 2;
  const measurementsValid = parseFloat(heightCm) > 100 && parseFloat(weightKg) > 20;


  async function finish() {
    posthog?.capture('onboarding_completed', { goal, level, equipment, structure, days_per_week: daysPerWeek });
    await AsyncStorage.setItem('attiks_onboard_v1', 'done');
    if (user) {
      const name = firstName.trim() || null;
      await supabase.from('user_profiles').upsert({
        id: user.id,
        email: user.email ?? '',
        first_name: name,
        pseudo: name,
        gender,
        age_years: parseInt(age) >= 12 ? parseInt(age) : null,
        height_cm: parseFloat(heightCm) > 100 ? parseFloat(heightCm) : null,
        weight_kg: parseFloat(weightKg) > 20 ? parseFloat(weightKg) : null,
        bench_press_kg: hasCharges && parseFloat(benchKg) > 0 ? parseFloat(benchKg) : null,
        squat_kg: hasCharges && parseFloat(squatKg) > 0 ? parseFloat(squatKg) : null,
        deadlift_kg: hasCharges && parseFloat(deadliftKg) > 0 ? parseFloat(deadliftKg) : null,
        training_days: daysPerWeek,
        training_structure: structure,
        equipment_type: equipment,
        diet_goal: { goal, level, daysPerWeek, equipment, structure },
      });
    }
    router.replace('/(tabs)');
  }

  // ════════════════════════════════════════════════════════════
  // ÉCRANS SPÉCIAUX (plein écran, sans barre de progression)
  // ════════════════════════════════════════════════════════════

  // ── Écran 1 — Prénom ─────────────────────────────────────────
  if (step === 0) {
    return (
      <View style={{ flex: 1, backgroundColor: BG }}>
        <GradientOrb />
        <SafeAreaView style={{ flex: 1, paddingHorizontal: 28 }}>
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            <View style={{ flex: 1, justifyContent: 'center' }}>
              <Image
                source={require('../../assets/attiks-mascot.webp')}
                style={{ width: 190, height: 190, alignSelf: 'center', marginBottom: 24 }}
                resizeMode="contain"
              />
              <Text style={{
                color: '#fff', fontWeight: '900', fontSize: 44, lineHeight: 42,
                letterSpacing: -1.5, textTransform: 'uppercase', marginBottom: 10,
              }}>
                Comment on{'\n'}t'appelle ?
              </Text>
              <Text style={{ color: TEXT_MUTED, fontSize: 14, lineHeight: 20, marginBottom: 40 }}>
                On va personnaliser toute ton expérience à partir de ça.
              </Text>
              <View style={{
                backgroundColor: CARD_BG,
                borderWidth: 1,
                borderColor: 'rgba(200,241,53,0.35)',
                borderRadius: 16,
                paddingHorizontal: 20,
                height: 64,
                justifyContent: 'center',
              }}>
                <TextInput
                  style={{ color: '#fff', fontSize: 24, fontWeight: '900', letterSpacing: -0.5 }}
                  placeholder="Ton prénom"
                  placeholderTextColor="rgba(200,241,53,0.2)"
                  value={firstName}
                  onChangeText={setFirstName}
                  autoFocus
                  returnKeyType="done"
                  onSubmitEditing={() => { if (firstNameValid) next(); }}
                  autoCapitalize="words"
                />
              </View>
            </View>
            <Pressable
              onPress={next}
              disabled={!firstNameValid}
              style={{
                height: 60,
                borderRadius: 40,
                backgroundColor: firstNameValid ? 'rgba(200,241,53,0.4)' : 'rgba(200,241,53,0.06)',
                borderWidth: 1,
                borderColor: firstNameValid ? CTA_BORDER : 'rgba(200,241,53,0.12)',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 16,
              }}
            >
              <Text style={{
                fontWeight: '900', fontSize: 17,
                color: firstNameValid ? '#fff' : TEXT_MUTED,
              }}>
                C'est parti →
              </Text>
            </Pressable>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </View>
    );
  }

  // ── Écran 2 — Bienvenue (auto-advance 3s) ───────────────────
  if (step === 1) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0D1108' }}>
        {/* Background image with slow zoom 110% → 100% */}
        <Animated.Image
          source={require('../../assets/attiks-gym.png')}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: '100%',
            height: '100%',
            transform: [{ scale: welcomeScale }],
          }}
          resizeMode="cover"
        />
        {/* Black overlay 40% */}
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: 'rgba(0,0,0,0.42)',
          }}
        />
        {/* Text block — fade + slide up — anchored at ~46% from top (Figma: y=429/932) */}
        <Animated.View
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: '46%',
            paddingHorizontal: 20,
            opacity: welcomeFade,
            transform: [{ translateY: welcomeSlide }],
          }}
        >
          <Text style={{
            color: '#BDD02F',
            fontSize: 18,
            fontWeight: '600',
            letterSpacing: 2.5,
            textTransform: 'uppercase',
            marginBottom: 2,
            textShadowColor: 'rgba(189,208,47,0.35)',
            textShadowRadius: 14,
            textShadowOffset: { width: 0, height: 0 },
          }}>
            Bienvenue,
          </Text>
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            style={{
              color: '#FFFFFF',
              fontSize: 88,
              fontWeight: '900',
              letterSpacing: -2.5,
              lineHeight: 84,
              textTransform: 'uppercase',
              textShadowColor: 'rgba(200,241,53,0.18)',
              textShadowRadius: 24,
              textShadowOffset: { width: 0, height: 0 },
            }}
          >
            {firstName}
          </Text>
          <Text style={{
            color: 'rgba(189,208,47,0.75)',
            fontSize: 14,
            fontWeight: '500',
            letterSpacing: -0.4,
            marginTop: 14,
          }}>
            Mesure tes performances et atteins l'excellence
          </Text>
        </Animated.View>
      </View>
    );
  }

  // ── Écran 11 — Démo récupération ─────────────────────────────
  if (step === 10) {
    return (
      <View style={{ flex: 1, backgroundColor: BG }}>
        <GradientOrb />
        <SafeAreaView style={{ flex: 1 }}>
          <ScrollView
            contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 44, paddingBottom: 40 }}
            showsVerticalScrollIndicator={false}
          >
            <LogoAttiks width={40} height={32} style={{ marginBottom: 24 }} />
            <Text style={{ color: BRAND, fontSize: 11, fontWeight: '700', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12 }}>
              Feature signature
            </Text>
            <Text style={{
              color: '#fff', fontWeight: '900', fontSize: 40, lineHeight: 38,
              letterSpacing: -1.5, textTransform: 'uppercase', marginBottom: 12,
            }}>
              Ton corps te dit{'\n'}quand pousser.
            </Text>
            <Text style={{ color: TEXT_MUTED, fontSize: 14, lineHeight: 22, marginBottom: 28 }}>
              Attiks analyse tes séances et colorie chaque muscle selon sa récupération — en temps réel.
            </Text>

            <View style={{
              backgroundColor: 'rgba(22,29,15,0.8)',
              borderRadius: 20,
              borderWidth: 1,
              borderColor: 'rgba(200,241,53,0.18)',
              padding: 20,
              marginBottom: 20,
            }}>
              <MuscleMap muscleColors={DEMO_MUSCLE_COLORS} height={155} />
              <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 16, marginTop: 16 }}>
                {([
                  [MUSCLE_RED, 'Fatigué'],
                  [MUSCLE_ORANGE, 'En récup.'],
                  ['#BDD02F', 'Prêt'],
                ] as [string, string][]).map(([color, label]) => (
                  <View key={label} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />
                    <Text style={{ color: '#fff', fontSize: 12 }}>{label}</Text>
                  </View>
                ))}
              </View>
            </View>

            <View style={{ gap: 12, marginBottom: 36 }}>
              {([
                ['Séance Push hier', 'Pecs et triceps en rouge — laisse-les récupérer.'],
                ['Séance Pull il y a 30h', 'Dos en orange — récupération en cours.'],
                ['Legs il y a 3 jours', 'Jambes en vert — prêtes à attaquer.'],
              ] as [string, string][]).map(([title, sub]) => (
                <View key={title} style={{ flexDirection: 'row', gap: 12 }}>
                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: BRAND, marginTop: 7 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: '#fff', fontSize: 14, fontWeight: '600' }}>{title}</Text>
                    <Text style={{ color: TEXT_MUTED, fontSize: 12, marginTop: 2, lineHeight: 17 }}>{sub}</Text>
                  </View>
                </View>
              ))}
            </View>

            <Pressable
              onPress={next}
              style={{
                backgroundColor: 'rgba(200,241,53,0.4)',
                borderWidth: 1,
                borderColor: CTA_BORDER,
                borderRadius: 40,
                height: 60,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ color: '#fff', fontWeight: '900', fontSize: 16 }}>
                Impressionnant, continuons →
              </Text>
            </Pressable>
          </ScrollView>
        </SafeAreaView>
      </View>
    );
  }

  // ── Écran 13 — Programme prêt (hook pré-paywall) ─────────────
  if (step === 12) {
    const struct = structure ?? 'je_sais_pas';
    const exercises = previewExercisesFor(structure, equipment);
    const structLabel = equipment === 'domicile'
      ? 'poids du corps'
      : {
          ppl: 'Push / Pull / Legs',
          full_body: 'Full Body',
          haut_bas: 'Haut / Bas du corps',
          je_sais_pas: 'sur mesure',
        }[struct];
    const hook = goal === 'masse' ? 'Prêt à prendre de la masse ?'
      : goal === 'force' ? 'Prêt à devenir plus fort ?'
      : 'Prêt à progresser vraiment ?';

    return (
      <View style={{ flex: 1, backgroundColor: BG }}>
        <SafeAreaView style={{ flex: 1 }} edges={['bottom']}>
          <ScrollView
            contentContainerStyle={{ paddingBottom: 40 }}
            showsVerticalScrollIndicator={false}
          >
            <View style={{ height: 260 }}>
              <Image
                source={require('../../assets/attiks-gym.png')}
                style={{ width: '100%', height: '100%' }}
                resizeMode="cover"
              />
              <LinearGradient
                colors={['transparent', BG]}
                style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 120 }}
              />
            </View>

            <View style={{ paddingHorizontal: 28, paddingTop: 8 }}>
            <Text style={{ color: BRAND, fontSize: 11, fontWeight: '700', letterSpacing: 2, textTransform: 'uppercase', textAlign: 'center', marginBottom: 16 }}>
              Ton programme est prêt
            </Text>
            <Text style={{
              color: '#fff', fontWeight: '900', fontSize: 34, lineHeight: 36, textAlign: 'center',
              letterSpacing: -1, textTransform: 'uppercase', marginBottom: 10,
            }}>
              {hook}
            </Text>
            <Text style={{ color: TEXT_MUTED, fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 32 }}>
              Split {structLabel} calibré sur tes réponses.{'\n'}Voici un aperçu de ta séance 1 :
            </Text>

            <View style={{
              backgroundColor: CARD_BG, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(200,241,53,0.18)',
              padding: 18, marginBottom: 16,
            }}>
              {exercises.map((ex, i) => {
                const gif = exerciseGifs[ex];
                return (
                  <View key={ex} style={{
                    flexDirection: 'row', alignItems: 'center', paddingVertical: 10,
                    borderBottomWidth: i < exercises.length - 1 ? 0.5 : 0, borderBottomColor: 'rgba(200,241,53,0.1)',
                  }}>
                    {gif ? (
                      <Image
                        source={{ uri: gif }}
                        style={{ width: 40, height: 40, borderRadius: 10, marginRight: 12, backgroundColor: 'rgba(255,255,255,0.05)' }}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={{
                        width: 26, height: 26, borderRadius: 13, backgroundColor: 'rgba(200,241,53,0.12)',
                        alignItems: 'center', justifyContent: 'center', marginRight: 12,
                      }}>
                        <Text style={{ color: BRAND, fontWeight: '900', fontSize: 12 }}>{i + 1}</Text>
                      </View>
                    )}
                    <Text style={{ color: '#fff', fontSize: 14, fontWeight: '600', flex: 1 }}>{ex}</Text>
                  </View>
                );
              })}
              <View style={{
                flexDirection: 'row', alignItems: 'center', paddingTop: 12, marginTop: 4,
                borderTopWidth: 0.5, borderTopColor: 'rgba(200,241,53,0.1)',
              }}>
                <Text style={{ fontSize: 15, marginRight: 10 }}>🔒</Text>
                <Text style={{ color: TEXT_MUTED, fontSize: 13, fontStyle: 'italic' }}>
                  + toutes les séances de ton programme complet
                </Text>
              </View>
            </View>

            <View style={{
              backgroundColor: 'rgba(200,241,53,0.06)', borderRadius: 14, borderWidth: 1,
              borderColor: 'rgba(200,241,53,0.15)', padding: 14, marginBottom: 36,
            }}>
              <Text style={{ color: TEXT_MUTED, fontSize: 13, lineHeight: 18 }}>
                💡 Attiks ajuste automatiquement tes charges et tes exercices à chaque séance selon ta récupération.
              </Text>
            </View>

            <Pressable
              onPress={next}
              style={{
                backgroundColor: 'rgba(200,241,53,0.4)',
                borderWidth: 1,
                borderColor: CTA_BORDER,
                borderRadius: 40,
                height: 60,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ color: '#fff', fontWeight: '900', fontSize: 16 }}>Débloquer mon programme →</Text>
            </Pressable>
            </View>
          </ScrollView>
        </SafeAreaView>
      </View>
    );
  }

  // ── Écran 14 — Paywall RevenueCat (natif, designé sur le dashboard) ──
  if (step === 13) {
    return (
      <View style={{ flex: 1, backgroundColor: BG, alignItems: 'center', justifyContent: 'center' }}>
        <GradientOrb />
        {paywallPending && <ActivityIndicator color={BRAND} size="large" />}
      </View>
    );
  }

  // ════════════════════════════════════════════════════════════
  // LAYOUT COMMUN — étapes 2 à 9 + 11 (avec barre de progression)
  // ════════════════════════════════════════════════════════════
  const showBack = (step >= 2 && step <= 9) || step === 11;

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <GradientOrb />
      {/* Barre de progression */}
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, backgroundColor: 'rgba(200,241,53,0.1)', zIndex: 10 }}>
        <Animated.View style={{
          height: '100%',
          backgroundColor: BRAND,
          width: mainProgress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
        }} />
      </View>

      <SafeAreaView style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingTop: 16, paddingBottom: 4 }}>
          <View style={{ width: 36 }}>
            {showBack && (
              <Pressable onPress={back} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                <Text style={{ color: TEXT_MUTED, fontSize: 26 }}>‹</Text>
              </Pressable>
            )}
          </View>
          {STEP_NUM[step] && (
            <Text style={{ color: 'rgba(200,241,53,0.3)', fontSize: 12 }}>{STEP_NUM[step]} / 9</Text>
          )}
          <View style={{ width: 36 }} />
        </View>

        {renderStepContent()}
      </SafeAreaView>
    </View>
  );

  // ─────────────────────────────────────────────────────────────
  function renderStepContent() {
    switch (step) {

      // ── Étape 3 — Objectif ──────────────────────────────────
      case 2: return (
        <ScrollView style={{ flex: 1, paddingHorizontal: 24 }} contentContainerStyle={{ paddingTop: 12, paddingBottom: 32 }}>
          <LogoAttiks width={40} height={32} style={{ marginBottom: 20 }} />
          <Text style={{
            color: '#fff', fontWeight: '900', fontSize: 44, lineHeight: 42,
            letterSpacing: -1.5, textTransform: 'uppercase', marginBottom: 8,
          }}>
            Qu'est-ce qui{'\n'}t'amène ?
          </Text>
          <Text style={{ color: TEXT_MUTED, fontSize: 14, lineHeight: 20, marginBottom: 28 }}>
            Ton objectif guide tout le programme.
          </Text>
          <View style={{ gap: 10 }}>
            {([
              { v: 'masse' as Goal,    emoji: '💪', label: 'Prendre de la masse', sub: 'Volume, hypertrophie, prendre du poids' },
              { v: 'force' as Goal,    emoji: '⚡',  label: 'Gagner en force',     sub: 'Soulever plus lourd, devenir plus fort' },
              { v: 'les_deux' as Goal, emoji: '🎯',  label: 'Les deux',            sub: 'Force et muscle en même temps' },
            ]).map(({ v, emoji, label, sub }) => (
              <Pressable
                key={v}
                onPress={() => { setGoal(v); next(); }}
                style={{
                  flexDirection: 'row', alignItems: 'center', padding: 18,
                  borderRadius: 16, borderWidth: 1,
                  backgroundColor: goal === v ? 'rgba(200,241,53,0.12)' : CARD_BG,
                  borderColor: CARD_BORDER,
                }}
              >
                <Text style={{ fontSize: 28, marginRight: 16 }}>{emoji}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>{label}</Text>
                  <Text style={{ color: TEXT_MUTED, fontSize: 13, marginTop: 3 }}>{sub}</Text>
                </View>
                {goal === v && <Text style={{ color: BRAND, fontWeight: '900', fontSize: 16 }}>✓</Text>}
              </Pressable>
            ))}
          </View>
        </ScrollView>
      );

      // ── Étape 4 — Niveau ────────────────────────────────────
      case 3: return (
        <ScrollView style={{ flex: 1, paddingHorizontal: 24 }} contentContainerStyle={{ paddingTop: 12, paddingBottom: 32 }}>
          <LogoAttiks width={40} height={32} style={{ marginBottom: 20 }} />
          <Text style={{
            color: '#fff', fontWeight: '900', fontSize: 44, lineHeight: 42,
            letterSpacing: -1.5, textTransform: 'uppercase', marginBottom: 8,
          }}>
            Depuis combien de{'\n'}temps tu t'entraînes ?
          </Text>
          <Text style={{ color: TEXT_MUTED, fontSize: 14, lineHeight: 20, marginBottom: 28 }}>
            Influence la récupération, le volume et la difficulté.
          </Text>
          <View style={{ gap: 10 }}>
            {([
              { v: 'debutant' as Level,      emoji: '🌱', label: 'Débutant',      sub: 'Moins d\'un an d\'entraînement régulier' },
              { v: 'intermediaire' as Level, emoji: '💪', label: 'Intermédiaire', sub: '1 à 3 ans d\'expérience' },
              { v: 'confirme' as Level,      emoji: '🔥', label: 'Confirmé',      sub: '3 à 5 ans — bases solides' },
              { v: 'expert' as Level,        emoji: '💎', label: 'Expert',        sub: '5 ans et plus — optimisation fine' },
            ]).map(({ v, emoji, label, sub }) => (
              <Pressable
                key={v}
                onPress={() => { setLevel(v); next(); }}
                style={{
                  flexDirection: 'row', alignItems: 'center', padding: 18,
                  borderRadius: 16, borderWidth: 1,
                  backgroundColor: level === v ? 'rgba(200,241,53,0.12)' : CARD_BG,
                  borderColor: CARD_BORDER,
                }}
              >
                <Text style={{ fontSize: 26, marginRight: 16 }}>{emoji}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>{label}</Text>
                  <Text style={{ color: TEXT_MUTED, fontSize: 13, marginTop: 3 }}>{sub}</Text>
                </View>
                {level === v && <Text style={{ color: BRAND, fontWeight: '900' }}>✓</Text>}
              </Pressable>
            ))}
          </View>
        </ScrollView>
      );

      // ── Étape 5 — Genre ─────────────────────────────────────
      case 4: return (
        <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 12 }}>
          <LogoAttiks width={40} height={32} style={{ marginBottom: 20 }} />
          <Text style={{
            color: '#fff', fontWeight: '900', fontSize: 44, lineHeight: 42,
            letterSpacing: -1.5, textTransform: 'uppercase', marginBottom: 8,
          }}>
            Tu es ?
          </Text>
          <Text style={{ color: TEXT_MUTED, fontSize: 14, lineHeight: 20, marginBottom: 32 }}>
            Pour adapter les références de charges et les visuels.
          </Text>
          <View style={{ gap: 12 }}>
            {([
              { v: 'homme' as Gender, label: 'Homme' },
              { v: 'femme' as Gender, label: 'Femme' },
            ]).map(({ v, label }) => (
              <Pressable
                key={v}
                onPress={() => { setGender(v); next(); }}
                style={{
                  padding: 24, borderRadius: 16, borderWidth: 1,
                  backgroundColor: gender === v ? 'rgba(200,241,53,0.12)' : CARD_BG,
                  borderColor: CARD_BORDER,
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: '#fff', fontWeight: '900', fontSize: 22, textTransform: 'uppercase', letterSpacing: 1 }}>{label}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      );

      // ── Étape 6 — Âge + Mensurations ───────────────────────
      case 5: return (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView style={{ flex: 1, paddingHorizontal: 24 }} contentContainerStyle={{ paddingTop: 12, paddingBottom: 40 }}>
            <LogoAttiks width={40} height={32} style={{ marginBottom: 20 }} />
            <Text style={{
              color: '#fff', fontWeight: '900', fontSize: 44, lineHeight: 42,
              letterSpacing: -1.5, textTransform: 'uppercase', marginBottom: 8,
            }}>
              Quelques chiffres.
            </Text>
            <Text style={{ color: TEXT_MUTED, fontSize: 14, lineHeight: 20, marginBottom: 32 }}>
              Pour calibrer tes charges dès la première séance.
            </Text>
            <View style={{ gap: 16, marginBottom: 36 }}>
              {([
                { label: 'Âge', placeholder: '25', unit: 'ans', value: age, set: setAge, keyboard: 'number-pad' as const },
                { label: 'Taille', placeholder: '178', unit: 'cm', value: heightCm, set: setHeightCm, keyboard: 'decimal-pad' as const },
                { label: 'Poids actuel', placeholder: '80', unit: 'kg', value: weightKg, set: setWeightKg, keyboard: 'decimal-pad' as const },
              ]).map(({ label, placeholder, unit, value, set, keyboard }) => (
                <View key={label}>
                  <Text style={{ color: TEXT_MUTED, fontSize: 11, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 8 }}>
                    {label}
                  </Text>
                  <View style={{
                    flexDirection: 'row', alignItems: 'center',
                    backgroundColor: CARD_BG,
                    borderWidth: 1,
                    borderColor: 'rgba(200,241,53,0.25)',
                    borderRadius: 16,
                    paddingHorizontal: 16,
                    height: 56,
                  }}>
                    <TextInput
                      style={{ flex: 1, color: '#fff', fontSize: 18, fontWeight: '700' }}
                      placeholder={placeholder}
                      placeholderTextColor="rgba(200,241,53,0.15)"
                      value={value}
                      onChangeText={set}
                      keyboardType={keyboard}
                    />
                    <Text style={{ color: TEXT_MUTED, fontSize: 14, fontWeight: '600' }}>{unit}</Text>
                  </View>
                </View>
              ))}
            </View>
            <Pressable
              onPress={next}
              disabled={!measurementsValid}
              style={{
                height: 60,
                borderRadius: 40,
                backgroundColor: measurementsValid ? 'rgba(200,241,53,0.4)' : 'rgba(200,241,53,0.06)',
                borderWidth: 1,
                borderColor: measurementsValid ? CTA_BORDER : 'rgba(200,241,53,0.12)',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 12,
              }}
            >
              <Text style={{ fontWeight: '900', fontSize: 16, color: measurementsValid ? '#fff' : TEXT_MUTED }}>
                Continuer →
              </Text>
            </Pressable>
            <Pressable onPress={next} style={{ height: 40, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: TEXT_MUTED, fontSize: 13 }}>Passer cette étape</Text>
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      );

      // ── Étape 7 — Charges DC / Squat / SDT ─────────────────
      case 6: {
        if (hasCharges === true) {
          return (
            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
              <ScrollView style={{ flex: 1, paddingHorizontal: 24 }} contentContainerStyle={{ paddingTop: 12, paddingBottom: 40 }}>
                <LogoAttiks width={40} height={32} style={{ marginBottom: 20 }} />
                <Text style={{
                  color: '#fff', fontWeight: '900', fontSize: 44, lineHeight: 42,
                  letterSpacing: -1.5, textTransform: 'uppercase', marginBottom: 8,
                }}>
                  Tes charges actuelles.
                </Text>
                <Text style={{ color: TEXT_MUTED, fontSize: 14, lineHeight: 20, marginBottom: 32 }}>
                  Ton 1RM estimé sera calculé automatiquement.
                </Text>
                <View style={{ gap: 16, marginBottom: 36 }}>
                  {([
                    { label: 'Développé couché', placeholder: '80', value: benchKg, set: setBenchKg },
                    { label: 'Squat', placeholder: '100', value: squatKg, set: setSquatKg },
                    { label: 'Soulevé de terre', placeholder: '120', value: deadliftKg, set: setDeadliftKg },
                  ]).map(({ label, placeholder, value, set }) => (
                    <View key={label}>
                      <Text style={{ color: TEXT_MUTED, fontSize: 11, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 8 }}>
                        {label}
                      </Text>
                      <View style={{
                        flexDirection: 'row', alignItems: 'center',
                        backgroundColor: CARD_BG,
                        borderWidth: 1,
                        borderColor: 'rgba(200,241,53,0.25)',
                        borderRadius: 16,
                        paddingHorizontal: 16,
                        height: 56,
                      }}>
                        <TextInput
                          style={{ flex: 1, color: '#fff', fontSize: 18, fontWeight: '700' }}
                          placeholder={placeholder}
                          placeholderTextColor="rgba(200,241,53,0.15)"
                          value={value}
                          onChangeText={set}
                          keyboardType="decimal-pad"
                        />
                        <Text style={{ color: TEXT_MUTED, fontSize: 14, fontWeight: '600' }}>kg</Text>
                      </View>
                    </View>
                  ))}
                </View>
                <Pressable
                  onPress={next}
                  style={{
                    backgroundColor: 'rgba(200,241,53,0.4)',
                    borderWidth: 1,
                    borderColor: CTA_BORDER,
                    borderRadius: 40,
                    height: 60,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 12,
                  }}
                >
                  <Text style={{ color: '#fff', fontWeight: '900', fontSize: 16 }}>Enregistrer →</Text>
                </Pressable>
                <Pressable onPress={next} style={{ height: 40, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ color: TEXT_MUTED, fontSize: 13 }}>Passer cette étape</Text>
                </Pressable>
              </ScrollView>
            </KeyboardAvoidingView>
          );
        }

        return (
          <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 12 }}>
            <LogoAttiks width={40} height={32} style={{ marginBottom: 20 }} />
            <Text style={{
              color: '#fff', fontWeight: '900', fontSize: 44, lineHeight: 42,
              letterSpacing: -1.5, textTransform: 'uppercase', marginBottom: 8,
            }}>
              Connais-tu tes{'\n'}charges ?
            </Text>
            <Text style={{ color: TEXT_MUTED, fontSize: 14, lineHeight: 20, marginBottom: 32 }}>
              DC, Squat, Soulevé de terre — même approximativement. Ça calibre ton programme dès le premier jour.
            </Text>
            <View style={{ gap: 12 }}>
              <Pressable
                onPress={() => setHasCharges(true)}
                style={{
                  flexDirection: 'row', alignItems: 'center', padding: 20,
                  borderRadius: 16, borderWidth: 1,
                  backgroundColor: CARD_BG, borderColor: CARD_BORDER,
                }}
              >
                <Text style={{ fontSize: 26, marginRight: 16 }}>💪</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>Oui, je connais mes charges</Text>
                  <Text style={{ color: TEXT_MUTED, fontSize: 13, marginTop: 3 }}>Programme calibré dès le départ</Text>
                </View>
              </Pressable>
              <Pressable
                onPress={() => next()}
                style={{
                  flexDirection: 'row', alignItems: 'center', padding: 20,
                  borderRadius: 16, borderWidth: 1,
                  backgroundColor: CARD_BG, borderColor: CARD_BORDER,
                }}
              >
                <Text style={{ fontSize: 26, marginRight: 16 }}>🌱</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>Non, on va les découvrir</Text>
                  <Text style={{ color: TEXT_MUTED, fontSize: 13, marginTop: 3 }}>On commence léger et on progresse</Text>
                </View>
              </Pressable>
            </View>
          </View>
        );
      }

      // ── Étape 8 — Fréquence ─────────────────────────────────
      case 7: return (
        <ScrollView style={{ flex: 1, paddingHorizontal: 24 }} contentContainerStyle={{ paddingTop: 12, paddingBottom: 32 }}>
          <LogoAttiks width={40} height={32} style={{ marginBottom: 20 }} />
          <Text style={{
            color: '#fff', fontWeight: '900', fontSize: 44, lineHeight: 42,
            letterSpacing: -1.5, textTransform: 'uppercase', marginBottom: 8,
          }}>
            Combien de séances{'\n'}par semaine ?
          </Text>
          <Text style={{ color: TEXT_MUTED, fontSize: 14, lineHeight: 20, marginBottom: 32 }}>
            On adapte le split à ta disponibilité.
          </Text>
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 24 }}>
            {[3, 4, 5, 6].map((d) => (
              <Pressable
                key={d}
                onPress={() => { setDaysPerWeek(d); next(); }}
                style={{
                  flex: 1, height: 72, borderRadius: 16,
                  backgroundColor: daysPerWeek === d ? 'rgba(200,241,53,0.25)' : CARD_BG,
                  borderWidth: 1, borderColor: CARD_BORDER,
                  alignItems: 'center', justifyContent: 'center',
                }}
              >
                <Text style={{ color: '#fff', fontWeight: '900', fontSize: 28 }}>{d}</Text>
              </Pressable>
            ))}
          </View>
          <View style={{
            backgroundColor: CARD_BG,
            borderWidth: 1,
            borderColor: 'rgba(200,241,53,0.15)',
            borderRadius: 14,
            paddingHorizontal: 16,
            paddingVertical: 14,
          }}>
            <Text style={{ color: TEXT_MUTED, fontSize: 13, lineHeight: 18 }}>
              {daysPerWeek
                ? `💡 Avec ${daysPerWeek}j, le split suggéré est ${daysPerWeek <= 3 ? 'Full Body' : daysPerWeek === 4 ? 'Upper/Lower' : 'Push Pull Legs'}.`
                : '💡 La majorité des athlètes progressent bien sur 4 séances / semaine.'}
            </Text>
          </View>
        </ScrollView>
      );

      // ── Étape 9 — Structure ─────────────────────────────────
      case 8: return (
        <ScrollView style={{ flex: 1, paddingHorizontal: 24 }} contentContainerStyle={{ paddingTop: 12, paddingBottom: 32 }}>
          <LogoAttiks width={40} height={32} style={{ marginBottom: 20 }} />
          <Text style={{
            color: '#fff', fontWeight: '900', fontSize: 44, lineHeight: 42,
            letterSpacing: -1.5, textTransform: 'uppercase', marginBottom: 8,
          }}>
            Quelle structure{'\n'}tu préfères ?
          </Text>
          <Text style={{ color: TEXT_MUTED, fontSize: 14, lineHeight: 20, marginBottom: 28 }}>
            On s'adapte à n'importe quelle méthode.
          </Text>
          <View style={{ gap: 10 }}>
            {([
              { v: 'ppl' as Structure,        emoji: '🔄', label: 'Push / Pull / Legs',      sub: 'La méthode des bodybuilders naturels' },
              { v: 'full_body' as Structure,   emoji: '⚡', label: 'Full Body',               sub: 'Tout le corps à chaque séance' },
              { v: 'haut_bas' as Structure,    emoji: '↕',  label: 'Haut / Bas du corps',    sub: 'Séances alternées haut et bas' },
              { v: 'je_sais_pas' as Structure, emoji: '🎯', label: 'Je ne sais pas encore',  sub: 'On choisit pour toi selon ta fréquence' },
            ]).map(({ v, emoji, label, sub }) => (
              <Pressable
                key={v}
                onPress={() => { setStructure(v); next(); }}
                style={{
                  flexDirection: 'row', alignItems: 'center', padding: 18,
                  borderRadius: 16, borderWidth: 1,
                  backgroundColor: structure === v ? 'rgba(200,241,53,0.12)' : CARD_BG,
                  borderColor: CARD_BORDER,
                }}
              >
                <Text style={{ fontSize: 24, marginRight: 16 }}>{emoji}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>{label}</Text>
                  <Text style={{ color: TEXT_MUTED, fontSize: 13, marginTop: 3 }}>{sub}</Text>
                </View>
                {structure === v && <Text style={{ color: BRAND, fontWeight: '900' }}>✓</Text>}
              </Pressable>
            ))}
          </View>
        </ScrollView>
      );

      // ── Étape 10 — Équipement ───────────────────────────────
      case 9: return (
        <ScrollView style={{ flex: 1, paddingHorizontal: 24 }} contentContainerStyle={{ paddingTop: 12, paddingBottom: 32 }}>
          <LogoAttiks width={40} height={32} style={{ marginBottom: 20 }} />
          <Text style={{
            color: '#fff', fontWeight: '900', fontSize: 44, lineHeight: 42,
            letterSpacing: -1.5, textTransform: 'uppercase', marginBottom: 8,
          }}>
            Où tu{'\n'}t'entraînes ?
          </Text>
          <Text style={{ color: TEXT_MUTED, fontSize: 14, lineHeight: 20, marginBottom: 28 }}>
            Les exercices changent selon l'équipement disponible.
          </Text>
          <View style={{ gap: 10 }}>
            {([
              { v: 'salle_complete' as Equipment, emoji: '🏋️', label: 'Salle complète',           sub: 'Barres, haltères, machines — tout le matériel' },
              { v: 'petite_salle' as Equipment,   emoji: '🔩', label: 'Petite salle / Home gym',  sub: 'Barres et haltères, peu ou pas de machines' },
              { v: 'domicile' as Equipment,       emoji: '🏠', label: 'À domicile sans matériel', sub: 'Poids de corps, élastiques' },
              { v: 'specifique' as Equipment,     emoji: '⚙️', label: 'Équipement spécifique',    sub: 'CrossFit, haltères seuls, etc.' },
            ]).map(({ v, emoji, label, sub }) => (
              <Pressable
                key={v}
                onPress={() => { setEquipment(v); next(); }}
                style={{
                  flexDirection: 'row', alignItems: 'center', padding: 18,
                  borderRadius: 16, borderWidth: 1,
                  backgroundColor: equipment === v ? 'rgba(200,241,53,0.12)' : CARD_BG,
                  borderColor: CARD_BORDER,
                }}
              >
                <Text style={{ fontSize: 26, marginRight: 16 }}>{emoji}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>{label}</Text>
                  <Text style={{ color: TEXT_MUTED, fontSize: 13, marginTop: 3 }}>{sub}</Text>
                </View>
                {equipment === v && <Text style={{ color: BRAND, fontWeight: '900' }}>✓</Text>}
              </Pressable>
            ))}
          </View>
        </ScrollView>
      );

      // ── Étape 12 — Génération du programme ──────────────────
      case 11: return (
        <View style={{ flex: 1, paddingHorizontal: 24, alignItems: 'center', justifyContent: 'center' }}>
          <LogoAttiks width={44} height={36} style={{ marginBottom: 32 }} />
          <ActivityIndicator color={BRAND} size="large" style={{ marginBottom: 28 }} />
          <View style={{ gap: 14, alignItems: 'flex-start' }}>
            {GEN_STEPS.map((label, i) => {
              const done = i < genStepIndex;
              const active = i === genStepIndex;
              if (i > genStepIndex) return null;
              return (
                <View key={label} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Text style={{ color: done ? BRAND : TEXT_MUTED, fontSize: 16 }}>
                    {done ? '✓' : active ? '…' : ''}
                  </Text>
                  <Text style={{
                    color: done ? '#fff' : TEXT_MUTED, fontSize: 15,
                    fontWeight: done ? '700' : '500',
                  }}>
                    {label}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      );

      default: return null;
    }
  }
}
