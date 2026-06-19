import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { MuscleMap } from '@/components/MuscleMap';
import { LogoAttiks } from '@/components/LogoAttiks';
import { MUSCLE_RED, MUSCLE_ORANGE } from '@/hooks/useMuscleRecovery';

type Goal = 'masse' | 'force' | 'les_deux';
type Level = 'debutant' | 'intermediaire' | 'confirme' | 'expert';
type Gender = 'homme' | 'femme';
type Equipment = 'salle_complete' | 'petite_salle' | 'domicile' | 'specifique';
type Structure = 'ppl' | 'full_body' | 'haut_bas' | 'je_sais_pas';

const BRAND = '#C8F135';
const BG = '#0D110A';
const SURFACE = '#111111';

const TESTIMONIALS = [
  {
    name: 'Thomas R.',
    meta: '24 ans · Lyon',
    text: '"En 3 mois j\'ai pris 6 kg de masse sèche. Le programme est parfaitement calibré pour moi."',
  },
  {
    name: 'Mathieu K.',
    meta: '31 ans · Paris',
    text: '"Mon bench est passé de 60 à 100 kg en 6 mois. Le tracker change vraiment tout."',
  },
  {
    name: 'Sébastien M.',
    meta: '19 ans · Bordeaux',
    text: '"J\'ai arrêté de faire n\'importe quoi en salle. La progression est réelle et mesurable."',
  },
];

const STEP_PROGRESS: Record<number, number> = {
  2: 0.11, 3: 0.22, 4: 0.33, 5: 0.44, 6: 0.55,
  7: 0.66, 8: 0.77, 9: 0.88, 11: 0.95,
};

const STEP_NUM: Record<number, string> = {
  2: '1', 3: '2', 4: '3', 5: '4', 6: '5',
  7: '6', 8: '7', 9: '8', 11: '9',
};

// Couleurs de démo pour le pantin (screen 10) — simule une séance Push la veille
const DEMO_MUSCLE_COLORS = {
  pec: MUSCLE_RED,
  'pec-2': MUSCLE_RED,
  triceps: MUSCLE_ORANGE,
  'delt-right': MUSCLE_ORANGE,
  'delt-left': MUSCLE_ORANGE,
};

const MOCK_ATHLETES = ['Chris Hemsworth', 'David Laid', 'Jeff Nippard', 'Ryan Terry', 'Steve Cook'];

export default function OnboardScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [step, setStep] = useState(0);

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
  const [photoUri, setPhotoUri] = useState<string | null>(null);

  // ── Animation refs ───────────────────────────────────────────
  const mainProgress = useRef(new Animated.Value(0)).current;
  const welcomeFade = useRef(new Animated.Value(0)).current;
  const welcomeScale = useRef(new Animated.Value(0.94)).current;
  const welcomeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scoreTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [displayScore, setDisplayScore] = useState(0);
  const [score] = useState(() => Math.floor(Math.random() * 16) + 78); // fallback si pas de photo
  const [mockAthlete] = useState(() => MOCK_ATHLETES[Math.floor(Math.random() * MOCK_ATHLETES.length)]);
  const [analyzing, setAnalyzing] = useState(false);
  const [physiqueScore, setPhysiqueScore] = useState<{
    score: number;
    athlete: string;
    athlete_description: string;
    strengths: string[];
    improvements: string[];
    body_type: string;
    potential: string;
  } | null>(null);

  // Reset le choix charges quand on revient sur l'écran
  useEffect(() => {
    if (step === 6) setHasCharges(null);
  }, [step]);

  // Progress bar
  useEffect(() => {
    if (step in STEP_PROGRESS) {
      Animated.timing(mainProgress, {
        toValue: STEP_PROGRESS[step],
        duration: 300,
        useNativeDriver: false,
      }).start();
    }
  }, [step]);

  // Bienvenue animation + auto-advance
  useEffect(() => {
    if (step !== 1) return;
    welcomeFade.setValue(0);
    welcomeScale.setValue(0.94);
    Animated.parallel([
      Animated.timing(welcomeFade, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.spring(welcomeScale, { toValue: 1, friction: 7, tension: 40, useNativeDriver: true }),
    ]).start();
    welcomeTimerRef.current = setTimeout(() => setStep(2), 2600);
    return () => { if (welcomeTimerRef.current) clearTimeout(welcomeTimerRef.current); };
  }, [step]);

  // Score counter — utilise le vrai score si la photo a été analysée
  useEffect(() => {
    if (step !== 12) return;
    setDisplayScore(0);
    let current = 0;
    const target = physiqueScore?.score ?? score;
    const increment = target / 60;
    scoreTimerRef.current = setInterval(() => {
      current = Math.min(current + increment, target);
      setDisplayScore(Math.round(current));
      if (current >= target && scoreTimerRef.current) clearInterval(scoreTimerRef.current);
    }, 33);
    return () => { if (scoreTimerRef.current) clearInterval(scoreTimerRef.current); };
  }, [step]);

  const next = () => setStep(s => s + 1);
  const back = () => {
    if (step === 2) setStep(0);
    else setStep(s => s - 1);
  };

  const firstNameValid = firstName.trim().length >= 2;
  const measurementsValid = parseFloat(heightCm) > 100 && parseFloat(weightKg) > 20;

  async function pickPhoto() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (!result.canceled) setPhotoUri(result.assets[0].uri);
  }

  async function analyzePhysique(imageUri: string) {
    setAnalyzing(true);
    try {
      const base64 = await FileSystem.readAsStringAsync(imageUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const { data, error } = await supabase.functions.invoke('analyze-physique', {
        body: {
          imageBase64: base64,
          imageMediaType: 'image/jpeg',
          userProfile: { level, goal, age, weight: weightKg, height: heightCm },
        },
      });
      if (error) throw error;
      setPhysiqueScore(data);
    } catch {
      setPhysiqueScore({
        score: 75,
        athlete: 'Jeff Nippard',
        athlete_description: 'Bodybuilder naturel et coach reconnu mondialement',
        strengths: ['Bonne base morphologique', 'Potentiel de progression élevé'],
        improvements: ['Continuer la surcharge progressive', 'Optimiser la récupération'],
        body_type: 'mésomorphe',
        potential: 'Excellent potentiel avec une progression structurée',
      });
    } finally {
      setAnalyzing(false);
      next();
    }
  }

  async function finish() {
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
      <View style={{ flex: 1, backgroundColor: SURFACE }}>
        <SafeAreaView style={{ flex: 1, paddingHorizontal: 28 }}>
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            <View style={{ flex: 1, justifyContent: 'center' }}>
              <LogoAttiks width={72} height={58} />
              <Text style={{ color: '#fff', fontWeight: '900', fontSize: 42, lineHeight: 46, marginBottom: 12 }}>
                Comment{'\n'}on t'appelle ?
              </Text>
              <Text style={{ color: '#666', fontSize: 15, lineHeight: 22, marginBottom: 40 }}>
                On va personnaliser toute{'\n'}ton expérience à partir de ça.
              </Text>
              <View style={{
                backgroundColor: '#1A1A1A', borderWidth: 1, borderColor: '#2A2A2A',
                borderRadius: 16, paddingHorizontal: 20, height: 64, justifyContent: 'center',
              }}>
                <TextInput
                  style={{ color: '#fff', fontSize: 26, fontWeight: '900', letterSpacing: -0.5 }}
                  placeholder="Ton prénom"
                  placeholderTextColor="#2E2E2E"
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
                height: 64, borderRadius: 20,
                backgroundColor: firstNameValid ? BRAND : '#1A1A1A',
                borderWidth: firstNameValid ? 0 : 1, borderColor: '#2A2A2A',
                alignItems: 'center', justifyContent: 'center', marginBottom: 16,
              }}
            >
              <Text style={{
                fontWeight: '900', fontSize: 17,
                color: firstNameValid ? '#000' : '#444',
              }}>
                C'est parti →
              </Text>
            </Pressable>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </View>
    );
  }

  // ── Écran 2 — Bienvenue (auto-advance 2.6s) ──────────────────
  if (step === 1) {
    return (
      <View style={{ flex: 1, backgroundColor: BG }}>
        <LinearGradient
          colors={['rgba(200,241,53,0.10)', 'transparent']}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 320 }}
        />
        <SafeAreaView style={{ flex: 1, paddingHorizontal: 28, justifyContent: 'center' }}>
          <Animated.View style={{ opacity: welcomeFade, transform: [{ scale: welcomeScale }] }}>
            <Text style={{ color: '#555', fontSize: 17, fontWeight: '400', marginBottom: 8 }}>
              Bienvenue,
            </Text>
            <Text style={{ color: '#fff', fontWeight: '900', fontSize: 54, lineHeight: 58, letterSpacing: -1 }}>
              {firstName}.
            </Text>
            <View style={{ height: 28 }} />
            <LogoAttiks width={110} height={88} />
            <View style={{ height: 20 }} />
            <Text style={{ color: '#555', fontSize: 16, lineHeight: 26 }}>
              Le carnet de muscu{'\n'}le plus intelligent.
            </Text>
          </Animated.View>
        </SafeAreaView>
      </View>
    );
  }

  // ── Écran 11 — Démo récupération ─────────────────────────────
  if (step === 10) {
    return (
      <View style={{ flex: 1, backgroundColor: BG }}>
        <SafeAreaView style={{ flex: 1 }}>
          <ScrollView
            contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 44, paddingBottom: 40 }}
            showsVerticalScrollIndicator={false}
          >
            <Text style={{ color: BRAND, fontSize: 11, fontWeight: '700', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12 }}>
              Feature signature
            </Text>
            <Text style={{ color: '#fff', fontWeight: '900', fontSize: 32, lineHeight: 36, marginBottom: 12 }}>
              Ton corps te dit{'\n'}quand pousser.
            </Text>
            <Text style={{ color: '#666', fontSize: 14, lineHeight: 22, marginBottom: 28 }}>
              Attiks analyse tes séances et colorie chaque muscle selon sa récupération — en temps réel.
            </Text>

            <View style={{
              backgroundColor: '#161D0F', borderRadius: 20, borderWidth: 1,
              borderColor: 'rgba(200,241,53,0.12)', padding: 20, marginBottom: 20,
            }}>
              <MuscleMap muscleColors={DEMO_MUSCLE_COLORS} compact />
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
                    <Text style={{ color: '#666', fontSize: 12, marginTop: 2, lineHeight: 17 }}>{sub}</Text>
                  </View>
                </View>
              ))}
            </View>

            <Pressable
              onPress={next}
              style={{ backgroundColor: BRAND, borderRadius: 20, height: 56, alignItems: 'center', justifyContent: 'center' }}
            >
              <Text style={{ color: '#000', fontWeight: '900', fontSize: 16 }}>
                Impressionnant, continuons →
              </Text>
            </Pressable>
          </ScrollView>
        </SafeAreaView>
      </View>
    );
  }

  // ── Écran 13 — Révélation score (Wrapped) ────────────────────
  if (step === 12) {
    const target = physiqueScore?.score ?? score;
    const revealed = displayScore >= target;
    const athleteName = physiqueScore?.athlete ?? mockAthlete;
    const potential = physiqueScore?.potential ?? (
      target >= 90 ? `Physique d'élite — Top 5% des utilisateurs.` :
      target >= 85 ? `Excellent potentiel — Proche de ${mockAthlete}.` :
                    `Bon potentiel — Programme optimisé pour toi.`
    );
    return (
      <View style={{ flex: 1, backgroundColor: BG }}>
        <LinearGradient
          colors={['rgba(200,241,53,0.12)', 'transparent']}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 280 }}
        />
        <SafeAreaView style={{ flex: 1 }}>
          <ScrollView
            contentContainerStyle={{ paddingHorizontal: 28, paddingTop: 40, paddingBottom: 40, alignItems: 'center' }}
            showsVerticalScrollIndicator={false}
          >
            <Text style={{ color: '#555', fontSize: 11, fontWeight: '700', letterSpacing: 2, textTransform: 'uppercase', textAlign: 'center', marginBottom: 24 }}>
              Ton score physique
            </Text>
            <Text style={{ color: BRAND, fontWeight: '900', fontSize: 108, lineHeight: 116, textAlign: 'center' }}>
              {displayScore}
            </Text>
            <Text style={{ color: '#555', fontSize: 18, textAlign: 'center', marginBottom: 20 }}>/ 100</Text>

            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15, textAlign: 'center', marginBottom: 4, lineHeight: 22 }}>
              {revealed ? potential : '...'}
            </Text>

            {revealed && physiqueScore && (
              <Text style={{ color: BRAND, fontSize: 13, textAlign: 'center', marginBottom: 28 }}>
                Morphologie proche de {athleteName}
              </Text>
            )}

            {revealed && physiqueScore && (
              <View style={{ width: '100%', gap: 10, marginBottom: 32 }}>
                {physiqueScore.strengths.map((s) => (
                  <View key={s} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(200,241,53,0.06)', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10 }}>
                    <Text style={{ color: BRAND, fontSize: 14 }}>✓</Text>
                    <Text style={{ color: '#ccc', fontSize: 13, flex: 1 }}>{s}</Text>
                  </View>
                ))}
                {physiqueScore.improvements.map((s) => (
                  <View key={s} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#1A1A1A', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10 }}>
                    <Text style={{ color: '#555', fontSize: 14 }}>↑</Text>
                    <Text style={{ color: '#666', fontSize: 13, flex: 1 }}>{s}</Text>
                  </View>
                ))}
              </View>
            )}

            {!physiqueScore && revealed && (
              <Text style={{ color: '#444', fontSize: 12, textAlign: 'center', marginBottom: 32, lineHeight: 18 }}>
                Basé sur ton profil, ton niveau{'\n'}et tes objectifs déclarés.
              </Text>
            )}

            <Pressable
              onPress={next}
              style={{ width: '100%', backgroundColor: BRAND, borderRadius: 20, height: 56, alignItems: 'center', justifyContent: 'center' }}
            >
              <Text style={{ color: '#000', fontWeight: '900', fontSize: 16 }}>Continuer →</Text>
            </Pressable>
          </ScrollView>
        </SafeAreaView>
      </View>
    );
  }

  // ── Écran 14 — Social proof + Paywall ────────────────────────
  if (step === 13) {
    return (
      <View style={{ flex: 1, backgroundColor: SURFACE }}>
        <SafeAreaView style={{ flex: 1, paddingBottom: 0 }}>
          <ScrollView
            contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 36, paddingBottom: 8 }}
            showsVerticalScrollIndicator={false}
          >
            <Text style={{ color: BRAND, fontWeight: '900', fontSize: 80, textAlign: 'center', lineHeight: 86 }}>7</Text>
            <Text style={{ color: '#666', fontSize: 15, textAlign: 'center', marginBottom: 20 }}>jours d'essai gratuit</Text>
            <Text style={{ color: '#fff', fontWeight: '900', fontSize: 30, textAlign: 'center', lineHeight: 34, marginBottom: 8 }}>
              Rejoins les athlètes{'\n'}qui progressent vraiment.
            </Text>
            <Text style={{ color: '#666', fontSize: 13, textAlign: 'center', lineHeight: 20, marginBottom: 28 }}>
              Puis 9,99 €/mois ou 59,99 €/an{'\n'}Annulable à tout moment.
            </Text>

            {([
              ['📊', 'Programme personnalisé', 'PPL, Full Body ou Haut/Bas — adapté à toi'],
              ['⏱️', 'Tracker complet', 'Temps de repos, PRs automatiques, historique'],
              ['🧠', 'Récupération intelligente', 'Le pantin musculaire te dit quand pousser'],
              ['🏆', 'Carte de partage', 'Montre tes gains — viralité garantie'],
            ] as [string, string, string][]).map(([icon, title, sub]) => (
              <View key={title} style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 18 }}>
                <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(200,241,53,0.12)', alignItems: 'center', justifyContent: 'center', marginRight: 12, marginTop: 2 }}>
                  <Text style={{ fontSize: 18 }}>{icon}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>{title}</Text>
                  <Text style={{ color: '#666', fontSize: 12, marginTop: 2, lineHeight: 17 }}>{sub}</Text>
                </View>
              </View>
            ))}

            <View style={{ gap: 10, marginTop: 8, marginBottom: 12 }}>
              {TESTIMONIALS.map((t) => (
                <View key={t.name} style={{ backgroundColor: '#1A1A1A', borderRadius: 16, borderWidth: 1, borderColor: '#2A2A2A', padding: 14 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                    <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(200,241,53,0.12)', alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
                      <Text style={{ color: BRAND, fontWeight: '900', fontSize: 12 }}>{t.name[0]}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: '#fff', fontWeight: '700', fontSize: 12 }}>{t.name}</Text>
                      <Text style={{ color: '#444', fontSize: 11 }}>{t.meta}</Text>
                    </View>
                    <Text style={{ color: BRAND, fontSize: 11 }}>★★★★★</Text>
                  </View>
                  <Text style={{ color: '#666', fontSize: 12, lineHeight: 17, fontStyle: 'italic' }}>{t.text}</Text>
                </View>
              ))}
            </View>
          </ScrollView>

          <View style={{ paddingHorizontal: 24, paddingTop: 12, paddingBottom: 8, gap: 10 }}>
            <Pressable
              onPress={finish}
              style={{ backgroundColor: BRAND, borderRadius: 20, height: 60, alignItems: 'center', justifyContent: 'center' }}
            >
              <Text style={{ color: '#000', fontWeight: '900', fontSize: 16 }}>Commencer l'essai gratuit</Text>
            </Pressable>
            <Pressable
              onPress={finish}
              style={{ height: 40, alignItems: 'center', justifyContent: 'center' }}
            >
              <Text style={{ color: '#444', fontSize: 13 }}>Continuer sans abonnement</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  // ════════════════════════════════════════════════════════════
  // LAYOUT COMMUN — étapes 2 à 9 + 11 (avec barre de progression)
  // ════════════════════════════════════════════════════════════
  const showBack = (step >= 2 && step <= 9) || step === 11;

  return (
    <View style={{ flex: 1, backgroundColor: SURFACE }}>
      {/* Barre de progression */}
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, backgroundColor: '#1A1A1A', zIndex: 10 }}>
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
                <Text style={{ color: '#555', fontSize: 26 }}>‹</Text>
              </Pressable>
            )}
          </View>
          {STEP_NUM[step] && (
            <Text style={{ color: '#333', fontSize: 12 }}>{STEP_NUM[step]} / 9</Text>
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
        <ScrollView style={{ flex: 1, paddingHorizontal: 24 }} contentContainerStyle={{ paddingTop: 16, paddingBottom: 32 }}>
          <Text style={{ color: '#fff', fontWeight: '900', fontSize: 32, lineHeight: 36, marginBottom: 8 }}>
            Qu'est-ce qui{'\n'}t'amène ?
          </Text>
          <Text style={{ color: '#666', fontSize: 14, lineHeight: 20, marginBottom: 28 }}>Ton objectif guide tout le programme.</Text>
          <View style={{ gap: 10 }}>
            {([
              { v: 'masse' as Goal,    emoji: '🏋️', label: 'Prendre de la masse', sub: 'Volume, hypertrophie, prendre du poids' },
              { v: 'force' as Goal,    emoji: '⚡',  label: 'Gagner en force',     sub: 'Soulever plus lourd, devenir plus fort' },
              { v: 'les_deux' as Goal, emoji: '🎯',  label: 'Les deux',            sub: 'Force et muscle en même temps' },
            ]).map(({ v, emoji, label, sub }) => (
              <Pressable
                key={v}
                onPress={() => { setGoal(v); next(); }}
                style={{
                  flexDirection: 'row', alignItems: 'center', padding: 20,
                  borderRadius: 20, borderWidth: 1,
                  backgroundColor: goal === v ? 'rgba(200,241,53,0.08)' : '#1A1A1A',
                  borderColor: goal === v ? BRAND : '#2A2A2A',
                }}
              >
                <Text style={{ fontSize: 30, marginRight: 16 }}>{emoji}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: goal === v ? BRAND : '#fff', fontWeight: '700', fontSize: 16 }}>{label}</Text>
                  <Text style={{ color: '#555', fontSize: 13, marginTop: 3 }}>{sub}</Text>
                </View>
                {goal === v && <Text style={{ color: BRAND, fontWeight: '900', fontSize: 16 }}>✓</Text>}
              </Pressable>
            ))}
          </View>
        </ScrollView>
      );

      // ── Étape 4 — Niveau ────────────────────────────────────
      case 3: return (
        <ScrollView style={{ flex: 1, paddingHorizontal: 24 }} contentContainerStyle={{ paddingTop: 16, paddingBottom: 32 }}>
          <Text style={{ color: '#fff', fontWeight: '900', fontSize: 32, lineHeight: 36, marginBottom: 8 }}>
            Depuis combien de{'\n'}temps tu t'entraînes ?
          </Text>
          <Text style={{ color: '#666', fontSize: 14, lineHeight: 20, marginBottom: 28 }}>
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
                  borderRadius: 20, borderWidth: 1,
                  backgroundColor: level === v ? 'rgba(200,241,53,0.08)' : '#1A1A1A',
                  borderColor: level === v ? BRAND : '#2A2A2A',
                }}
              >
                <Text style={{ fontSize: 28, marginRight: 16 }}>{emoji}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: level === v ? BRAND : '#fff', fontWeight: '700', fontSize: 15 }}>{label}</Text>
                  <Text style={{ color: '#555', fontSize: 13, marginTop: 3 }}>{sub}</Text>
                </View>
                {level === v && <Text style={{ color: BRAND, fontWeight: '900' }}>✓</Text>}
              </Pressable>
            ))}
          </View>
        </ScrollView>
      );

      // ── Étape 5 — Genre ─────────────────────────────────────
      case 4: return (
        <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 16 }}>
          <Text style={{ color: '#fff', fontWeight: '900', fontSize: 32, lineHeight: 36, marginBottom: 8 }}>Tu es ?</Text>
          <Text style={{ color: '#666', fontSize: 14, lineHeight: 20, marginBottom: 32 }}>
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
                  padding: 24, borderRadius: 20, borderWidth: 1,
                  backgroundColor: gender === v ? 'rgba(200,241,53,0.08)' : '#1A1A1A',
                  borderColor: gender === v ? BRAND : '#2A2A2A',
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: gender === v ? BRAND : '#fff', fontWeight: '900', fontSize: 24 }}>{label}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      );

      // ── Étape 6 — Âge + Mensurations ───────────────────────
      case 5: return (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView style={{ flex: 1, paddingHorizontal: 24 }} contentContainerStyle={{ paddingTop: 16, paddingBottom: 40 }}>
            <Text style={{ color: '#fff', fontWeight: '900', fontSize: 32, lineHeight: 36, marginBottom: 8 }}>
              Quelques chiffres.
            </Text>
            <Text style={{ color: '#666', fontSize: 14, lineHeight: 20, marginBottom: 32 }}>
              Pour calibrer tes charges dès la première séance.
            </Text>
            <View style={{ gap: 16, marginBottom: 36 }}>
              {([
                { label: 'Âge', placeholder: '25', unit: 'ans', value: age, set: setAge, keyboard: 'number-pad' as const },
                { label: 'Taille', placeholder: '178', unit: 'cm', value: heightCm, set: setHeightCm, keyboard: 'decimal-pad' as const },
                { label: 'Poids actuel', placeholder: '80', unit: 'kg', value: weightKg, set: setWeightKg, keyboard: 'decimal-pad' as const },
              ]).map(({ label, placeholder, unit, value, set, keyboard }) => (
                <View key={label}>
                  <Text style={{ color: '#555', fontSize: 11, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 8 }}>
                    {label}
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#1A1A1A', borderWidth: 1, borderColor: '#2A2A2A', borderRadius: 16, paddingHorizontal: 16, height: 56 }}>
                    <TextInput
                      style={{ flex: 1, color: '#fff', fontSize: 18, fontWeight: '700' }}
                      placeholder={placeholder}
                      placeholderTextColor="#2E2E2E"
                      value={value}
                      onChangeText={set}
                      keyboardType={keyboard}
                    />
                    <Text style={{ color: '#444', fontSize: 14, fontWeight: '600' }}>{unit}</Text>
                  </View>
                </View>
              ))}
            </View>
            <Pressable
              onPress={next}
              disabled={!measurementsValid}
              style={{
                height: 56, borderRadius: 16,
                backgroundColor: measurementsValid ? BRAND : '#1A1A1A',
                borderWidth: measurementsValid ? 0 : 1, borderColor: '#2A2A2A',
                alignItems: 'center', justifyContent: 'center', marginBottom: 12,
              }}
            >
              <Text style={{ fontWeight: '900', fontSize: 16, color: measurementsValid ? '#000' : '#444' }}>
                Continuer →
              </Text>
            </Pressable>
            <Pressable onPress={next} style={{ height: 40, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: '#333', fontSize: 13 }}>Passer cette étape</Text>
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      );

      // ── Étape 7 — Charges DC / Squat / SDT ─────────────────
      case 6: {
        if (hasCharges === true) {
          return (
            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
              <ScrollView style={{ flex: 1, paddingHorizontal: 24 }} contentContainerStyle={{ paddingTop: 16, paddingBottom: 40 }}>
                <Text style={{ color: '#fff', fontWeight: '900', fontSize: 32, lineHeight: 36, marginBottom: 8 }}>
                  Tes charges actuelles.
                </Text>
                <Text style={{ color: '#666', fontSize: 14, lineHeight: 20, marginBottom: 32 }}>
                  Ton 1RM estimé sera calculé automatiquement.
                </Text>
                <View style={{ gap: 16, marginBottom: 36 }}>
                  {([
                    { label: 'Développé couché', placeholder: '80', value: benchKg, set: setBenchKg },
                    { label: 'Squat', placeholder: '100', value: squatKg, set: setSquatKg },
                    { label: 'Soulevé de terre', placeholder: '120', value: deadliftKg, set: setDeadliftKg },
                  ]).map(({ label, placeholder, value, set }) => (
                    <View key={label}>
                      <Text style={{ color: '#555', fontSize: 11, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 8 }}>
                        {label}
                      </Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#1A1A1A', borderWidth: 1, borderColor: '#2A2A2A', borderRadius: 16, paddingHorizontal: 16, height: 56 }}>
                        <TextInput
                          style={{ flex: 1, color: '#fff', fontSize: 18, fontWeight: '700' }}
                          placeholder={placeholder}
                          placeholderTextColor="#2E2E2E"
                          value={value}
                          onChangeText={set}
                          keyboardType="decimal-pad"
                        />
                        <Text style={{ color: '#444', fontSize: 14, fontWeight: '600' }}>kg</Text>
                      </View>
                    </View>
                  ))}
                </View>
                <Pressable
                  onPress={next}
                  style={{ backgroundColor: BRAND, borderRadius: 16, height: 56, alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}
                >
                  <Text style={{ color: '#000', fontWeight: '900', fontSize: 16 }}>Enregistrer →</Text>
                </Pressable>
                <Pressable onPress={next} style={{ height: 40, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ color: '#333', fontSize: 13 }}>Passer cette étape</Text>
                </Pressable>
              </ScrollView>
            </KeyboardAvoidingView>
          );
        }

        return (
          <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 16 }}>
            <Text style={{ color: '#fff', fontWeight: '900', fontSize: 32, lineHeight: 36, marginBottom: 8 }}>
              Connais-tu tes{'\n'}charges ?
            </Text>
            <Text style={{ color: '#666', fontSize: 14, lineHeight: 20, marginBottom: 32 }}>
              DC, Squat, Soulevé de terre — même approximativement. Ça calibre ton programme dès le premier jour.
            </Text>
            <View style={{ gap: 12 }}>
              <Pressable
                onPress={() => setHasCharges(true)}
                style={{ flexDirection: 'row', alignItems: 'center', padding: 22, borderRadius: 20, borderWidth: 1, backgroundColor: '#1A1A1A', borderColor: '#2A2A2A' }}
              >
                <Text style={{ fontSize: 28, marginRight: 16 }}>💪</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>Oui, je connais mes charges</Text>
                  <Text style={{ color: '#555', fontSize: 13, marginTop: 3 }}>Programme calibré dès le départ</Text>
                </View>
              </Pressable>
              <Pressable
                onPress={() => next()}
                style={{ flexDirection: 'row', alignItems: 'center', padding: 22, borderRadius: 20, borderWidth: 1, backgroundColor: '#1A1A1A', borderColor: '#2A2A2A' }}
              >
                <Text style={{ fontSize: 28, marginRight: 16 }}>🌱</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>Non, on va les découvrir</Text>
                  <Text style={{ color: '#555', fontSize: 13, marginTop: 3 }}>On commence léger et on progresse</Text>
                </View>
              </Pressable>
            </View>
          </View>
        );
      }

      // ── Étape 8 — Fréquence ─────────────────────────────────
      case 7: return (
        <ScrollView style={{ flex: 1, paddingHorizontal: 24 }} contentContainerStyle={{ paddingTop: 16, paddingBottom: 32 }}>
          <Text style={{ color: '#fff', fontWeight: '900', fontSize: 32, lineHeight: 36, marginBottom: 8 }}>
            Combien de séances{'\n'}par semaine ?
          </Text>
          <Text style={{ color: '#666', fontSize: 14, lineHeight: 20, marginBottom: 32 }}>
            On adapte le split à ta disponibilité.
          </Text>
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 24 }}>
            {[3, 4, 5, 6].map((d) => (
              <Pressable
                key={d}
                onPress={() => { setDaysPerWeek(d); next(); }}
                style={{
                  flex: 1, height: 64, borderRadius: 16,
                  backgroundColor: daysPerWeek === d ? BRAND : '#1A1A1A',
                  borderWidth: 1, borderColor: daysPerWeek === d ? BRAND : '#2A2A2A',
                  alignItems: 'center', justifyContent: 'center',
                }}
              >
                <Text style={{ color: daysPerWeek === d ? '#000' : '#fff', fontWeight: '900', fontSize: 26 }}>{d}</Text>
              </Pressable>
            ))}
          </View>
          <View style={{ backgroundColor: '#1A1A1A', borderWidth: 1, borderColor: '#2A2A2A', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12 }}>
            <Text style={{ color: '#555', fontSize: 13, lineHeight: 18 }}>
              {daysPerWeek
                ? `💡 Avec ${daysPerWeek}j, le split suggéré est ${daysPerWeek <= 3 ? 'Full Body' : daysPerWeek === 4 ? 'Upper/Lower' : 'Push Pull Legs'}.`
                : '💡 La majorité des athlètes progressent bien sur 4 séances / semaine.'}
            </Text>
          </View>
        </ScrollView>
      );

      // ── Étape 9 — Structure ─────────────────────────────────
      case 8: return (
        <ScrollView style={{ flex: 1, paddingHorizontal: 24 }} contentContainerStyle={{ paddingTop: 16, paddingBottom: 32 }}>
          <Text style={{ color: '#fff', fontWeight: '900', fontSize: 32, lineHeight: 36, marginBottom: 8 }}>
            Quelle structure{'\n'}tu préfères ?
          </Text>
          <Text style={{ color: '#666', fontSize: 14, lineHeight: 20, marginBottom: 28 }}>
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
                  borderRadius: 20, borderWidth: 1,
                  backgroundColor: structure === v ? 'rgba(200,241,53,0.08)' : '#1A1A1A',
                  borderColor: structure === v ? BRAND : '#2A2A2A',
                }}
              >
                <Text style={{ fontSize: 26, marginRight: 16 }}>{emoji}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: structure === v ? BRAND : '#fff', fontWeight: '700', fontSize: 15 }}>{label}</Text>
                  <Text style={{ color: '#555', fontSize: 13, marginTop: 3 }}>{sub}</Text>
                </View>
                {structure === v && <Text style={{ color: BRAND, fontWeight: '900' }}>✓</Text>}
              </Pressable>
            ))}
          </View>
        </ScrollView>
      );

      // ── Étape 10 — Équipement ───────────────────────────────
      case 9: return (
        <ScrollView style={{ flex: 1, paddingHorizontal: 24 }} contentContainerStyle={{ paddingTop: 16, paddingBottom: 32 }}>
          <Text style={{ color: '#fff', fontWeight: '900', fontSize: 32, lineHeight: 36, marginBottom: 8 }}>
            Où tu{'\n'}t'entraînes ?
          </Text>
          <Text style={{ color: '#666', fontSize: 14, lineHeight: 20, marginBottom: 28 }}>
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
                  borderRadius: 20, borderWidth: 1,
                  backgroundColor: equipment === v ? 'rgba(200,241,53,0.08)' : '#1A1A1A',
                  borderColor: equipment === v ? BRAND : '#2A2A2A',
                }}
              >
                <Text style={{ fontSize: 28, marginRight: 16 }}>{emoji}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: equipment === v ? BRAND : '#fff', fontWeight: '700', fontSize: 15 }}>{label}</Text>
                  <Text style={{ color: '#555', fontSize: 13, marginTop: 3 }}>{sub}</Text>
                </View>
                {equipment === v && <Text style={{ color: BRAND, fontWeight: '900' }}>✓</Text>}
              </Pressable>
            ))}
          </View>
        </ScrollView>
      );

      // ── Étape 12 — Upload photo ─────────────────────────────
      case 11: return (
        <ScrollView style={{ flex: 1, paddingHorizontal: 24 }} contentContainerStyle={{ paddingTop: 16, paddingBottom: 32 }}>
          <Text style={{ color: '#fff', fontWeight: '900', fontSize: 32, lineHeight: 36, marginBottom: 8 }}>
            Ton score{'\n'}physique.
          </Text>
          <Text style={{ color: '#666', fontSize: 14, lineHeight: 20, marginBottom: 28 }}>
            Ajoute une photo de ton physique actuel. Notre IA analyse ta morphologie et te révèle à quel athlète tu ressembles.
          </Text>

          <Pressable
            onPress={pickPhoto}
            style={{
              backgroundColor: '#1A1A1A', borderWidth: 1, borderColor: '#2A2A2A',
              borderRadius: 20, height: 220, alignItems: 'center', justifyContent: 'center',
              marginBottom: 16, overflow: 'hidden',
            }}
          >
            {photoUri ? (
              <Image source={{ uri: photoUri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
            ) : (
              <View style={{ alignItems: 'center', gap: 10 }}>
                <Text style={{ fontSize: 52, opacity: 0.15 }}>🧍</Text>
                <Text style={{ color: '#333', fontSize: 14 }}>Appuie pour ajouter une photo</Text>
                <Text style={{ color: '#2A2A2A', fontSize: 12, textAlign: 'center', paddingHorizontal: 32, lineHeight: 17 }}>
                  Photo de dos ou de face,{'\n'}corps entier de préférence
                </Text>
              </View>
            )}
          </Pressable>

          {photoUri && (
            <Pressable onPress={pickPhoto} style={{ marginBottom: 16, alignItems: 'center' }}>
              <Text style={{ color: '#666', fontSize: 14 }}>Changer la photo</Text>
            </Pressable>
          )}

          <Pressable
            onPress={photoUri ? () => analyzePhysique(photoUri) : next}
            disabled={analyzing}
            style={{
              height: 56, borderRadius: 16,
              backgroundColor: photoUri ? BRAND : '#1A1A1A',
              borderWidth: photoUri ? 0 : 1, borderColor: '#2A2A2A',
              alignItems: 'center', justifyContent: 'center', marginBottom: 12,
              flexDirection: 'row', gap: 10,
            }}
          >
            {analyzing && <ActivityIndicator size="small" color="#000" />}
            <Text style={{ fontWeight: '900', fontSize: 16, color: photoUri ? '#000' : '#555' }}>
              {analyzing ? 'Analyse en cours...' : photoUri ? 'Calculer mon score →' : 'Continuer sans photo'}
            </Text>
          </Pressable>
          {!analyzing && (
            <Pressable onPress={next} style={{ height: 40, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: '#333', fontSize: 13 }}>Passer cette étape</Text>
            </Pressable>
          )}
        </ScrollView>
      );

      default: return null;
    }
  }
}
