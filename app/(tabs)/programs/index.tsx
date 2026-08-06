import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  FlatList,
  Image,
  KeyboardAvoidingView,
  LayoutChangeEvent,
  ListRenderItemInfo,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { Program, PplBlock, SessionType, Exercise, ProgramTemplate, CustomExercise } from '@/lib/types';
import { Icon } from '@/components/Icon';
import { GradientOrb } from '@/components/GradientOrb';
import { useTheme } from '@/lib/theme';
import {
  useExerciseLibrary,
  MUSCLE_FILTERS,
  MUSCLE_LABELS,
  EQUIPMENT_LABELS,
  DIFFICULTY_COLORS,
  DIFFICULTY_LABELS,
  type LibraryExercise,
} from '@/hooks/useExerciseLibrary';
import { useProgramTemplates, LEVEL_LABELS } from '@/hooks/useProgramTemplates';
import { useCustomExercises } from '@/hooks/useCustomExercises';
import type { IconName } from '@/components/Icon';

const EQUIPMENT_ICONS: Record<string, IconName> = {
  'Barbell':          'barbell',
  'Olympic Barbell':  'barbell',
  'Ez Barbell':       'barbell',
  'Trap Bar':         'barbell',
  'Smith Machine':    'barbell',
  'Dumbbell':         'barbell',
  'Cable':            'arrowsClockwise',
  'Rope':             'arrowsClockwise',
  'Band':             'arrowsClockwise',
  'Body Weight':      'user',
  'Assisted':         'user',
  'Weighted':         'user',
  'Leverage Machine': 'gearSix',
  'Sled Machine':     'gearSix',
  'Kettlebell':       'barbell',
};

const PPL_OPTIONS: { value: PplBlock; label: string }[] = [
  { value: 'push', label: 'Push' },
  { value: 'pull', label: 'Pull' },
  { value: 'legs', label: 'Legs' },
  { value: 'full', label: 'Full Body' },
];

const TYPE_OPTIONS: { value: SessionType; label: string }[] = [
  { value: 'force', label: 'Force' },
  { value: 'hypertrophie', label: 'Hypertrophie' },
];

const TYPE_LABELS: Record<string, string> = { force: 'Force', hypertrophie: 'Hypertrophie' };
const PPL_LABELS: Record<string, string> = { push: 'Push', pull: 'Pull', legs: 'Legs', full: 'Full Body' };

const MUSCLE_PRESETS: Record<PplBlock, { name: string; muscle_group: string }[]> = {
  push: [
    { name: 'Développé couché', muscle_group: 'Pectoraux' },
    { name: 'Développé incliné haltères', muscle_group: 'Pectoraux' },
    { name: 'Développé militaire', muscle_group: 'Épaules' },
    { name: 'Élévations latérales', muscle_group: 'Épaules' },
    { name: 'Dips', muscle_group: 'Triceps' },
    { name: 'Triceps poulie', muscle_group: 'Triceps' },
  ],
  pull: [
    { name: 'Rowing barre', muscle_group: 'Dos' },
    { name: 'Tractions', muscle_group: 'Dos' },
    { name: 'Rowing haltère', muscle_group: 'Dos' },
    { name: 'Face pull', muscle_group: 'Épaules' },
    { name: 'Curl haltères', muscle_group: 'Biceps' },
    { name: 'Curl barre', muscle_group: 'Biceps' },
  ],
  legs: [
    { name: 'Squat barre', muscle_group: 'Quadriceps' },
    { name: 'Leg press', muscle_group: 'Quadriceps' },
    { name: 'Romanian deadlift', muscle_group: 'Ischio-jambiers' },
    { name: 'Leg curl', muscle_group: 'Ischio-jambiers' },
    { name: 'Hip thrust', muscle_group: 'Fessiers' },
    { name: 'Mollets debout', muscle_group: 'Mollets' },
  ],
  full: [
    { name: 'Soulevé de terre', muscle_group: 'Dos' },
    { name: 'Squat barre', muscle_group: 'Quadriceps' },
    { name: 'Développé couché', muscle_group: 'Pectoraux' },
    { name: 'Tractions', muscle_group: 'Dos' },
    { name: 'Développé militaire', muscle_group: 'Épaules' },
  ],
};

// ── Animated stagger wrapper ────────────────────────────────────
function AnimatedCard({ children, index }: { children: React.ReactNode; index: number }) {
  const anim = useRef(new Animated.Value(index < 14 ? 0 : 1)).current;
  useEffect(() => {
    if (index >= 14) return;
    Animated.timing(anim, {
      toValue: 1, duration: 200, delay: index * 35, useNativeDriver: true,
    }).start();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <Animated.View style={{
      opacity: anim,
      transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }],
    }}>
      {children}
    </Animated.View>
  );
}

// ── Exercise accordion card (tab exercices) ─────────────────────
// Plafond volontairement large (jamais atteint par un contenu réel) : on
// n'anime plus vers une hauteur mesurée dynamiquement, car mesurer via
// onLayout un enfant pendant que son parent anime encore un maxHeight avec
// overflow:hidden peut figer une valeur légèrement trop petite et couper la
// fin du contenu (le bouton "Ajouter") même une fois l'animation terminée.
const EXPANDED_MAX_H = 2000;

const ExerciseAccordionCard = memo(function ExerciseAccordionCard({
  item,
  isExpanded,
  onToggle,
  onAdd,
  theme,
}: {
  item: LibraryExercise;
  isExpanded: boolean;
  onToggle: () => void;
  onAdd: () => void;
  theme: ReturnType<typeof useTheme>['theme'];
}) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, {
      toValue: isExpanded ? 1 : 0,
      duration: 260,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isExpanded]);

  const chevronDeg = anim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });
  const expandH    = anim.interpolate({ inputRange: [0, 1], outputRange: [0, EXPANDED_MAX_H] });
  const expandOp   = anim.interpolate({ inputRange: [0, 0.25, 1], outputRange: [0, 0, 1] });

  const eqIconName: IconName = EQUIPMENT_ICONS[item.equipment ?? ''] ?? 'barbell';
  const eqLabel    = EQUIPMENT_LABELS[item.equipment ?? ''] ?? item.equipment;
  const muscleLabel = MUSCLE_LABELS[item.body_part?.toLowerCase() ?? ''] ?? item.body_part;

  return (
    <View style={accStyles.card}>
      {/* ── Row fermée ── */}
      <Pressable
        onPress={onToggle}
        style={accStyles.row}
      >
        {item.gif_url ? (
          <View style={accStyles.thumbWrap}>
            <Image source={{ uri: item.gif_url }} style={accStyles.thumb} resizeMode="contain" />
            <View style={accStyles.imgOverlay} />
          </View>
        ) : (
          <View style={accStyles.thumbPlaceholder}>
            <Icon name={eqIconName} size={22} color="#C8F135" />
          </View>
        )}

        <View style={accStyles.info}>
          <Text style={accStyles.name} numberOfLines={2}>{item.name_fr ?? item.name}</Text>
          <Text style={accStyles.muscle} numberOfLines={1}>{muscleLabel}</Text>
        </View>

        <View style={accStyles.eqTag}>
          <Text style={accStyles.eqTagTxt}>{eqLabel}</Text>
        </View>

        <Animated.Text style={[accStyles.chevron, { transform: [{ rotate: chevronDeg }] }]}>
          ↓
        </Animated.Text>
      </Pressable>

      {/* ── Contenu étendu ── */}
      <Animated.View style={[accStyles.expandWrap, { maxHeight: expandH }]}>
        <Animated.View style={[accStyles.expandInner, { opacity: expandOp }]}>
          {isExpanded && item.gif_url ? (
            <View style={accStyles.gifWrap}>
              <Image source={{ uri: item.gif_url }} style={accStyles.gifFull} resizeMode="contain" />
              <View style={accStyles.imgOverlay} />
            </View>
          ) : null}
          {((item.instructions_fr ?? item.instructions)?.length ?? 0) > 0 && (
            <View style={accStyles.section}>
              <Text style={accStyles.secTitleGreen}>Étapes</Text>
              {(item.instructions_fr ?? item.instructions)!.slice(0, 5).map((t, i) => (
                <Text key={i} style={accStyles.bulletGreen}>{i + 1}. {t}</Text>
              ))}
            </View>
          )}
          <Pressable onPress={onAdd} style={accStyles.addBtn}>
            <Text style={accStyles.addBtnTxt}>Ajouter à mon programme</Text>
          </Pressable>
        </Animated.View>
      </Animated.View>
    </View>
  );
}, (prev, next) => prev.isExpanded === next.isExpanded && prev.item.id === next.item.id);

const accStyles = StyleSheet.create({
  card: { backgroundColor: '#161D0F', borderRadius: 14, overflow: 'hidden', marginBottom: 10 },
  row:  { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  thumbWrap: { width: 60, height: 60, borderRadius: 14, overflow: 'hidden', backgroundColor: '#FFFFFF' },
  thumb: { width: 60, height: 60 },
  imgOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#000', opacity: 0.13 },
  thumbPlaceholder: {
    width: 60, height: 60, borderRadius: 14,
    backgroundColor: '#2A2A2A', alignItems: 'center', justifyContent: 'center',
  },
  info:    { flex: 1 },
  name:    { color: '#FFFFFF', fontWeight: '700', fontSize: 15, letterSpacing: -0.2 },
  muscle:  { color: '#888888', fontSize: 12, marginTop: 2 },
  eqTag:   { backgroundColor: '#2A2A2A', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  eqTagTxt:{ color: '#C8F135', fontSize: 10, fontWeight: '600' },
  chevron: { color: '#666666', fontSize: 15 },
  expandWrap:  { overflow: 'hidden' },
  expandInner: { paddingHorizontal: 14, paddingBottom: 16 },
  gifWrap: { width: 190, height: 190, alignSelf: 'center', borderRadius: 16, overflow: 'hidden', marginTop: 4, marginBottom: 14, backgroundColor: '#FFFFFF' },
  gifFull: { width: '100%', height: '100%' },
  description: { color: '#888888', fontSize: 13, lineHeight: 20, marginBottom: 14 },
  section: { marginBottom: 12 },
  secTitleGreen:  { color: '#C8F135', fontWeight: '700', fontSize: 13, marginBottom: 7 },
  secTitleOrange: { color: '#FF8C00', fontWeight: '700', fontSize: 13, marginBottom: 7 },
  bulletGreen:  { color: '#C8F135', fontSize: 12, lineHeight: 19, marginBottom: 3 },
  bulletOrange: { color: '#FF8C00', fontSize: 12, lineHeight: 19, marginBottom: 3 },
  addBtn:    { backgroundColor: '#C8F135', borderRadius: 10, height: 44, alignItems: 'center', justifyContent: 'center', marginTop: 12 },
  addBtnTxt: { color: '#0D1108', fontWeight: '700', fontSize: 14 },
});

// ── Library picker card (modal selection) ──────────────────────
function LibPickerCard({
  item, theme, onSelect,
}: {
  item: LibraryExercise;
  theme: ReturnType<typeof useTheme>['theme'];
  onSelect: () => void;
}) {
  const diffColor = DIFFICULTY_COLORS[item.difficulty ?? ''] ?? '#888';
  const secondaries = item.secondary_muscles?.slice(0, 2).join(', ');

  return (
    <Pressable
      onPress={onSelect}
      style={({ pressed }) => ({
        backgroundColor: pressed ? theme.brand + '18' : theme.surface,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: pressed ? theme.brand + '55' : theme.border,
        marginBottom: 8,
        flexDirection: 'row',
        overflow: 'hidden',
      })}
    >
      <View style={{ width: 3, backgroundColor: diffColor }} />
      <View style={{ flex: 1, padding: 12 }}>
        <Text style={{ color: theme.textPrimary, fontWeight: '700', fontSize: 14, letterSpacing: -0.2, marginBottom: 2 }}>
          {item.name_fr ?? item.name}
        </Text>
        <Text style={{ color: theme.textSecondary, fontSize: 11, marginBottom: 6 }} numberOfLines={1}>
          {MUSCLE_LABELS[item.body_part?.toLowerCase() ?? ''] ?? item.body_part}
          {secondaries ? `  ·  ${secondaries}` : ''}
        </Text>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          <View style={{ backgroundColor: diffColor + '22', borderRadius: 5, paddingHorizontal: 7, paddingVertical: 2 }}>
            <Text style={{ color: diffColor, fontSize: 9, fontWeight: '700' }}>{DIFFICULTY_LABELS[item.difficulty]}</Text>
          </View>
          <View style={{ backgroundColor: theme.borderSubtle, borderRadius: 5, paddingHorizontal: 7, paddingVertical: 2 }}>
            <Text style={{ color: theme.textSecondary, fontSize: 9, fontWeight: '600' }}>
              {EQUIPMENT_LABELS[item.equipment] ?? item.equipment}
            </Text>
          </View>
        </View>
      </View>
      <View style={{ justifyContent: 'center', paddingRight: 14 }}>
        <Text style={{ color: theme.brand, fontSize: 20, fontWeight: '300' }}>+</Text>
      </View>
    </Pressable>
  );
}

// ── Custom exercise picker card (modal selection, exos persos) ──
function CustomPickerCard({
  item, theme, onSelect,
}: {
  item: CustomExercise;
  theme: ReturnType<typeof useTheme>['theme'];
  onSelect: () => void;
}) {
  return (
    <Pressable
      onPress={onSelect}
      style={({ pressed }) => ({
        backgroundColor: pressed ? theme.brand + '18' : theme.surface,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: pressed ? theme.brand + '55' : theme.border,
        marginBottom: 8,
        flexDirection: 'row',
        overflow: 'hidden',
      })}
    >
      <View style={{ width: 3, backgroundColor: theme.brand }} />
      <View style={{ flex: 1, padding: 12 }}>
        <Text style={{ color: theme.textPrimary, fontWeight: '700', fontSize: 14, letterSpacing: -0.2, marginBottom: 2 }}>
          {item.name}
        </Text>
        <Text style={{ color: theme.textSecondary, fontSize: 11, marginBottom: 6 }} numberOfLines={1}>
          {item.muscle_group}
        </Text>
        <View style={{ backgroundColor: theme.brand + '22', borderRadius: 5, paddingHorizontal: 7, paddingVertical: 2, alignSelf: 'flex-start' }}>
          <Text style={{ color: theme.brand, fontSize: 9, fontWeight: '700' }}>PERSO</Text>
        </View>
      </View>
      <View style={{ justifyContent: 'center', paddingRight: 14 }}>
        <Text style={{ color: theme.brand, fontSize: 20, fontWeight: '300' }}>+</Text>
      </View>
    </Pressable>
  );
}

// ── Template card (onglet Découvrir) ────────────────────────────
function TemplateCard({ template, onPress }: { template: ProgramTemplate; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={tplStyles.card}>
      {template.cover_image_url ? (
        <Image source={{ uri: template.cover_image_url }} style={tplStyles.cover} resizeMode="cover" />
      ) : (
        <View style={[tplStyles.cover, tplStyles.coverPlaceholder]} />
      )}
      <LinearGradient
        colors={['transparent', 'rgba(13,17,8,0.55)', 'rgba(13,17,8,0.97)']}
        locations={[0, 0.55, 1]}
        style={tplStyles.gradient}
      />
      <View style={tplStyles.content}>
        <View style={tplStyles.tagRow}>
          <Text style={tplStyles.tag}>{template.goal.toUpperCase()}</Text>
          <Text style={tplStyles.tagDot}>·</Text>
          <Text style={tplStyles.tag}>{(LEVEL_LABELS[template.level] ?? template.level).toUpperCase()}</Text>
        </View>
        <Text style={tplStyles.title}>{template.name}</Text>
        <Text style={tplStyles.subtitle}>{template.subtitle}</Text>
        <View style={tplStyles.footer}>
          <Text style={tplStyles.count}>{template.exercises.length} exercices</Text>
          <Text style={tplStyles.cta}>Voir →</Text>
        </View>
      </View>
    </Pressable>
  );
}

const tplStyles = StyleSheet.create({
  card: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 16,
    aspectRatio: 3 / 4,
    backgroundColor: '#161D0F',
  },
  cover: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  coverPlaceholder: { backgroundColor: '#1E2914' },
  gradient: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  content: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: 18 },
  tagRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  tag: { color: '#C8F135', fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  tagDot: { color: '#C8F135', fontSize: 11 },
  title: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 26,
    fontFamily: 'Anton_400Regular',
    letterSpacing: -0.3,
  },
  subtitle: { color: 'rgba(255,255,255,0.75)', fontSize: 13, marginTop: 4, marginBottom: 12 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  count: { color: 'rgba(255,255,255,0.55)', fontSize: 12 },
  cta: { color: '#C8F135', fontWeight: '700', fontSize: 13 },
});

// ── Template detail modal (héro photo + liste + CTA) ────────────
function TemplateDetailModal({
  template, theme, insets, saving, onClose, onAdd,
}: {
  template: ProgramTemplate | null;
  theme: ReturnType<typeof useTheme>['theme'];
  insets: { bottom: number };
  saving: boolean;
  onClose: () => void;
  onAdd: (t: ProgramTemplate) => void;
}) {
  const [displayedTemplate, setDisplayedTemplate] = useState(template);

  useEffect(() => {
    if (template) setDisplayedTemplate(template);
  }, [template]);

  return (
    <Modal visible={!!template} animationType="slide" presentationStyle="pageSheet">
      {displayedTemplate && (
        <View style={{ flex: 1, backgroundColor: theme.surface }}>
          <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
            <View style={tplDetailStyles.hero}>
              {displayedTemplate.cover_image_url ? (
                <Image source={{ uri: displayedTemplate.cover_image_url }} style={tplDetailStyles.heroImg} resizeMode="cover" />
              ) : (
                <View style={[tplDetailStyles.heroImg, { backgroundColor: '#1E2914' }]} />
              )}
              <LinearGradient
                colors={['rgba(13,17,8,0.5)', 'transparent', 'rgba(13,17,8,0.95)']}
                locations={[0, 0.4, 1]}
                style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
              />
              <SafeAreaView edges={['top']} style={tplDetailStyles.heroTop}>
                <Pressable onPress={onClose} style={tplDetailStyles.closeBtn} hitSlop={12}>
                  <Text style={tplDetailStyles.closeBtnTxt}>✕</Text>
                </Pressable>
              </SafeAreaView>
              <View style={tplDetailStyles.heroContent}>
                <View style={tplStyles.tagRow}>
                  <Text style={tplStyles.tag}>{displayedTemplate.goal.toUpperCase()}</Text>
                  <Text style={tplStyles.tagDot}>·</Text>
                  <Text style={tplStyles.tag}>{(LEVEL_LABELS[displayedTemplate.level] ?? displayedTemplate.level).toUpperCase()}</Text>
                </View>
                <Text style={tplStyles.title}>{displayedTemplate.name}</Text>
                <Text style={tplStyles.subtitle}>{displayedTemplate.subtitle}</Text>
              </View>
            </View>

            <View style={{ padding: 20, paddingBottom: 20 + insets.bottom }}>
              <Text style={{ color: theme.textMuted, fontSize: 10, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 10 }}>
                {displayedTemplate.exercises.length} exercices
              </Text>
              {displayedTemplate.exercises.map((ex, i) => (
                <View key={i} style={tplDetailStyles.exRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: theme.textPrimary, fontWeight: '700', fontSize: 14 }}>{ex.name}</Text>
                    <Text style={{ color: theme.textMuted, fontSize: 11, marginTop: 1 }}>{ex.muscle_group}</Text>
                  </View>
                  {ex.sets_reps_hint && (
                    <View style={{ backgroundColor: theme.brand + '18', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 }}>
                      <Text style={{ color: theme.brand, fontWeight: '700', fontSize: 12 }}>{ex.sets_reps_hint}</Text>
                    </View>
                  )}
                </View>
              ))}

              <Pressable
                onPress={() => onAdd(displayedTemplate)}
                disabled={saving}
                style={tplDetailStyles.ctaBtn}
              >
                <Text style={tplDetailStyles.ctaBtnTxt}>
                  {saving ? '…' : 'Ajouter à mes programmes'}
                </Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      )}
    </Modal>
  );
}

const tplDetailStyles = StyleSheet.create({
  hero: { height: 360, overflow: 'hidden' },
  heroImg: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  heroTop: { paddingHorizontal: 16, paddingTop: 8 },
  closeBtn: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center', justifyContent: 'center',
  },
  closeBtnTxt: { color: '#FFFFFF', fontSize: 15 },
  heroContent: { position: 'absolute', left: 20, right: 20, bottom: 20 },
  exRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: '#2A2A2A',
    gap: 10,
  },
  ctaBtn: {
    backgroundColor: '#C8F135',
    borderRadius: 14,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  ctaBtnTxt: { color: '#0D1108', fontWeight: '800', fontSize: 15 },
});

// ═══════════════════════════════════════════════════════════════
export default function ProgramsScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const router = useRouter();
  const bottomPad = 65 + insets.bottom + 20;

  // ── Sub-tab state ───────────────────────────────────────────
  const TAB_ORDER = ['discover', 'programs', 'exercises'] as const;
  type ProgramsTab = typeof TAB_ORDER[number];
  const TAB_LABELS: Record<ProgramsTab, string> = {
    discover: 'Découvrir',
    programs: 'Mes programmes',
    exercises: 'Exercices',
  };
  // Poids proportionnels à la longueur du libellé (+ marge fixe pour le
  // padding) plutôt que des tiers égaux — sinon "Mes programmes" (beaucoup
  // plus long que les deux autres) se retrouve à l'étroit pendant que
  // "Découvrir"/"Exercices" nagent dans le vide.
  const TAB_WEIGHTS = TAB_ORDER.map((t) => TAB_LABELS[t].length + 6);
  const TAB_TOTAL_WEIGHT = TAB_WEIGHTS.reduce((a, b) => a + b, 0);

  const [activeTab, setActiveTab] = useState<ProgramsTab>('programs');
  const segAnim = useRef(new Animated.Value(TAB_ORDER.indexOf('programs'))).current;
  const [segContainerWidth, setSegContainerWidth] = useState(0);

  function switchTab(tab: ProgramsTab) {
    setActiveTab(tab);
    Animated.timing(segAnim, {
      toValue: TAB_ORDER.indexOf(tab),
      duration: 220,
      useNativeDriver: false,
    }).start();
  }

  function onSegLayout(e: LayoutChangeEvent) {
    setSegContainerWidth(e.nativeEvent.layout.width);
  }

  const segInnerWidth = segContainerWidth > 0 ? segContainerWidth - 8 : 0;
  const tabPixelWidths = TAB_WEIGHTS.map((w) => (segInnerWidth * w) / TAB_TOTAL_WEIGHT);
  const tabOffsets = tabPixelWidths.reduce<number[]>((acc, w, i) => {
    acc.push(i === 0 ? 0 : acc[i - 1] + tabPixelWidths[i - 1]);
    return acc;
  }, []);
  const indicatorTranslateX = segAnim.interpolate({
    inputRange: [0, 1, 2],
    outputRange: tabOffsets,
  });
  const indicatorWidthAnim = segAnim.interpolate({
    inputRange: [0, 1, 2],
    outputRange: tabPixelWidths,
  });

  // ── Programs state ──────────────────────────────────────────
  const [programs, setPrograms] = useState<Program[]>([]);
  const [lastUsed, setLastUsed] = useState<Record<string, string | null>>({});
  const [showCreate, setShowCreate] = useState(false);
  const [editTarget, setEditTarget] = useState<Program | null>(null);

  // Form state
  const [name, setName]             = useState('');
  const [type, setType]             = useState<SessionType>('hypertrophie');
  const [pplBlock, setPplBlock]     = useState<PplBlock>('push');
  const [exercises, setExercises]   = useState<Exercise[]>([]);
  const [saving, setSaving]         = useState(false);

  // ── Découvrir — programmes vedettes ─────────────────────────
  const { templates, loading: templatesLoading } = useProgramTemplates();
  const [selectedTemplate, setSelectedTemplate] = useState<ProgramTemplate | null>(null);
  const [addingTemplate, setAddingTemplate] = useState(false);

  async function addTemplateToPrograms(template: ProgramTemplate) {
    if (!user) return;
    setAddingTemplate(true);
    await supabase.from('programs').insert({
      user_id: user.id,
      name: template.name,
      type: template.type,
      ppl_block: template.ppl_block,
      exercises: template.exercises.map(({ name: n, muscle_group, order_index }) => ({
        name: n, muscle_group, order_index,
      })),
    });
    setAddingTemplate(false);
    setSelectedTemplate(null);
    switchTab('programs');
    loadPrograms();
  }

  // ── Exercises TAB state ─────────────────────────────────────
  const [tabSearch, setTabSearch]     = useState('');
  const [tabFilter, setTabFilter]     = useState('tous');
  const [tabFilterKey, setTabFilterKey] = useState('tous');
  const [tabExpandedId, setTabExpandedId] = useState<string | null>(null);
  const {
    exercises: allTabExercises,
    loading: tabLoading,
  } = useExerciseLibrary();

  const tabDisplayExercises = useMemo(() => {
    const q = tabSearch.toLowerCase();
    return allTabExercises.filter((ex) => {
      const matchSearch = q === '' ||
        ex.name.toLowerCase().includes(q) ||
        (ex.name_fr?.toLowerCase().includes(q) ?? false) ||
        (ex.body_part?.toLowerCase().includes(q) ?? false) ||
        (ex.target_muscle?.toLowerCase().includes(q) ?? false);
      const matchMuscle = tabFilter === 'tous' || ex.body_part?.toLowerCase() === tabFilter;
      return matchSearch && matchMuscle;
    });
  }, [allTabExercises, tabSearch, tabFilter]);

  const handleTabFilter = useCallback((key: string) => {
    setTabFilter(key);
    setTabFilterKey(key);
    setTabExpandedId(null);
  }, [setTabFilter]);

  const toggleTabCard = useCallback((id: string) => {
    setTabExpandedId(prev => prev === id ? null : id);
  }, []);

  // ── Library picker modal state ──────────────────────────────
  const [showLibrary, setShowLibrary] = useState(false);
  const [libFilterKey, setLibFilterKey] = useState('tous');
  const {
    exercises: libExercises,
    search: libSearch,
    setSearch: setLibSearch,
    filter: libFilter,
    setFilter: setLibFilter,
    loading: libLoading,
  } = useExerciseLibrary();

  // ── Exercices persos (créés par l'utilisateur, sans gif) ────
  const { customExercises, addCustomExercise } = useCustomExercises();
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customMuscleInput, setCustomMuscleInput] = useState('');

  type PickerItem =
    | { kind: 'official'; item: LibraryExercise }
    | { kind: 'custom'; item: CustomExercise };

  const pickerData: PickerItem[] = useMemo(() => {
    const officials: PickerItem[] = libExercises.map((item) => ({ kind: 'official', item }));
    if (libFilter !== 'tous') return officials;
    const q = libSearch.toLowerCase();
    const customs: PickerItem[] = customExercises
      .filter((ex) => q === '' || ex.name.toLowerCase().includes(q) || ex.muscle_group.toLowerCase().includes(q))
      .map((item) => ({ kind: 'custom', item }));
    return [...customs, ...officials];
  }, [libExercises, customExercises, libFilter, libSearch]);

  async function handleCreateCustomExercise() {
    const exName = libSearch.trim();
    if (!exName) return;
    const created = await addCustomExercise(exName, customMuscleInput);
    if (!created) return;
    setExercises((prev) => [
      ...prev,
      { name: created.name, muscle_group: created.muscle_group, order_index: prev.length },
    ]);
    setShowCustomForm(false);
    setCustomMuscleInput('');
    setShowLibrary(false);
  }

  // ── Data ────────────────────────────────────────────────────
  function loadPrograms() {
    if (!user) return;
    supabase
      .from('programs')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => { setPrograms(data ?? []); });

    supabase
      .from('sessions')
      .select('program_id, date')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .then(({ data }) => {
        const map: Record<string, string> = {};
        for (const s of data ?? []) {
          if (s.program_id && !map[s.program_id]) map[s.program_id] = s.date;
        }
        setLastUsed(map);
      });
  }

  useEffect(() => { loadPrograms(); }, [user]);

  // ── Form helpers ────────────────────────────────────────────
  function openCreate() {
    setEditTarget(null);
    setName('');
    setType('hypertrophie');
    setPplBlock('push');
    setExercises(MUSCLE_PRESETS.push.map((ex, i) => ({ ...ex, order_index: i })));
    setShowCreate(true);
  }

  function openEdit(p: Program) {
    setEditTarget(p);
    setName(p.name);
    setType(p.type);
    setPplBlock(p.ppl_block);
    setExercises(p.exercises ?? []);
    setShowCreate(true);
  }

  function applyPreset(block: PplBlock) {
    setPplBlock(block);
    setExercises(MUSCLE_PRESETS[block].map((ex, i) => ({ ...ex, order_index: i })));
  }

  function removeExercise(index: number) {
    setExercises((prev) =>
      prev.filter((_, i) => i !== index).map((ex, i) => ({ ...ex, order_index: i }))
    );
  }

  // ── Library picker ──────────────────────────────────────────
  function openLibraryPicker() {
    setLibSearch('');
    setLibFilter('tous');
    setLibFilterKey('tous');
    setShowCustomForm(false);
    setCustomMuscleInput('');
    setShowLibrary(true);
  }

  function selectFromLibrary(ex: LibraryExercise) {
    const newEx: Exercise = {
      name: ex.name_fr ?? ex.name,
      muscle_group: MUSCLE_LABELS[ex.body_part?.toLowerCase() ?? ''] ?? ex.body_part ?? '',
      order_index: exercises.length,
    };
    setExercises((prev) => [...prev, newEx]);
    setShowLibrary(false);
  }

  function handleLibFilter(key: string) {
    setLibFilter(key);
    setLibFilterKey(key);
  }

  // ── Save / delete ───────────────────────────────────────────
  async function saveProgram() {
    if (!user || !name.trim() || exercises.length === 0) return;
    setSaving(true);
    if (editTarget) {
      await supabase
        .from('programs')
        .update({ name: name.trim(), type, ppl_block: pplBlock, exercises })
        .eq('id', editTarget.id);
    } else {
      await supabase
        .from('programs')
        .insert({ user_id: user.id, name: name.trim(), type, ppl_block: pplBlock, exercises });
    }
    setSaving(false);
    setShowCreate(false);
    loadPrograms();
  }

  async function deleteProgram(id: string) {
    Alert.alert('Supprimer', 'Supprimer ce programme ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          await supabase.from('programs').delete().eq('id', id);
          loadPrograms();
        },
      },
    ]);
  }

  function formatLastUsed(dateStr: string | undefined | null): string {
    if (!dateStr) return 'Jamais utilisé';
    const d = new Date(dateStr);
    const diffDays = Math.floor((Date.now() - d.getTime()) / 86_400_000);
    if (diffDays === 0) return "Aujourd'hui";
    if (diffDays === 1) return 'Hier';
    if (diffDays < 7) return `Il y a ${diffDays}j`;
    if (diffDays < 30) return `Il y a ${Math.floor(diffDays / 7)} sem.`;
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  }

  const ss = getStyles(theme);

  return (
    <SafeAreaView style={ss.root}>
      <GradientOrb />

      {/* ── HEADER ─────────────────────────────────────────── */}
      <View style={ss.header}>
        <Text style={ss.title}>PROGRAMME</Text>
      </View>

      {/* ── SEGMENTED CONTROL ──────────────────────────────── */}
      <View style={ss.segWrap}>
        <View style={ss.segContainer} onLayout={onSegLayout}>
          {segContainerWidth > 0 && (
            <Animated.View
              style={[ss.segIndicator, { width: indicatorWidthAnim, transform: [{ translateX: indicatorTranslateX }] }]}
            />
          )}
          <Pressable style={[ss.segTab, { flex: TAB_WEIGHTS[0] }]} onPress={() => switchTab('discover')}>
            <Text style={[ss.segTabTxt, activeTab === 'discover' && ss.segTabTxtActive]}>
              {TAB_LABELS.discover}
            </Text>
          </Pressable>
          <Pressable style={[ss.segTab, { flex: TAB_WEIGHTS[1] }]} onPress={() => switchTab('programs')}>
            <Text style={[ss.segTabTxt, activeTab === 'programs' && ss.segTabTxtActive]}>
              {TAB_LABELS.programs}
            </Text>
          </Pressable>
          <Pressable style={[ss.segTab, { flex: TAB_WEIGHTS[2] }]} onPress={() => switchTab('exercises')}>
            <Text style={[ss.segTabTxt, activeTab === 'exercises' && ss.segTabTxtActive]}>
              {TAB_LABELS.exercises}
            </Text>
          </Pressable>
        </View>
      </View>

      {/* ════════════════════════════════════════════════════ */}
      {/* TAB: DÉCOUVRIR                                       */}
      {/* ════════════════════════════════════════════════════ */}
      {activeTab === 'discover' && (
        <ScrollView
          style={ss.list}
          contentContainerStyle={[ss.listContent, { paddingBottom: bottomPad }]}
          showsVerticalScrollIndicator={false}
        >
          {templatesLoading ? (
            <View style={{ alignItems: 'center', paddingTop: 48 }}>
              <ActivityIndicator color="#C8F135" />
            </View>
          ) : templates.length === 0 ? (
            <View style={ss.empty}>
              <Text style={{ fontSize: 40 }}>✨</Text>
              <Text style={ss.emptyTitle}>Bientôt disponible</Text>
              <Text style={ss.emptySub}>
                Les programmes vedettes arrivent très bientôt.
              </Text>
            </View>
          ) : (
            templates.map((t) => (
              <TemplateCard key={t.id} template={t} onPress={() => setSelectedTemplate(t)} />
            ))
          )}
        </ScrollView>
      )}

      {/* ════════════════════════════════════════════════════ */}
      {/* TAB: MES PROGRAMMES                                 */}
      {/* ════════════════════════════════════════════════════ */}
      {activeTab === 'programs' && (
        <ScrollView
          style={ss.list}
          contentContainerStyle={[ss.listContent, { paddingBottom: bottomPad }]}
          showsVerticalScrollIndicator={false}
        >
          {programs.length === 0 ? (
            <View style={ss.empty}>
              <Text style={{ fontSize: 40 }}>📋</Text>
              <Text style={ss.emptyTitle}>Aucun programme</Text>
              <Text style={ss.emptySub}>
                Crée ton premier programme pour structurer ton entraînement.
              </Text>
              <Pressable onPress={openCreate} style={ss.emptyBtn}>
                <Text style={ss.emptyBtnTxt}>Créer mon premier programme →</Text>
              </Pressable>
            </View>
          ) : (
            programs.map((p) => (
              <Pressable
                key={p.id}
                onPress={() => openEdit(p)}
                style={ss.progCard}
              >
                {/* Tags */}
                <Text style={ss.progTags}>
                  {PPL_LABELS[p.ppl_block].toUpperCase()} · {TYPE_LABELS[p.type].toUpperCase()}
                </Text>

                {/* Name */}
                <Text style={ss.progName}>{p.name}</Text>

                {/* Exercise list */}
                {p.exercises?.length > 0 && (
                  <View style={ss.progExList}>
                    {p.exercises.slice(0, 4).map((ex, i) => (
                      <Text key={i} style={ss.progExLine}>• {ex.name}</Text>
                    ))}
                    {p.exercises.length > 4 && (
                      <Text style={ss.progExMore}>+{p.exercises.length - 4} autres</Text>
                    )}
                  </View>
                )}

                {/* Footer */}
                <View style={ss.progFooter}>
                  <Text style={ss.progExCount}>
                    {p.exercises?.length ?? 0} exercice{(p.exercises?.length ?? 0) !== 1 ? 's' : ''}
                  </Text>
                  <View style={ss.progFooterActions}>
                    <Pressable
                      onPress={() => deleteProgram(p.id)}
                      hitSlop={10}
                      style={ss.progDeleteBtn}
                    >
                      <Icon name="trash" size={16} color="#FF6B6B" />
                    </Pressable>
                    <Pressable
                      onPress={() => openEdit(p)}
                      hitSlop={10}
                      style={ss.progEditBtn}
                    >
                      <Icon name="pencil" size={14} color="#C8F135" />
                    </Pressable>
                  </View>
                </View>
              </Pressable>
            ))
          )}
        </ScrollView>
      )}

      {/* ════════════════════════════════════════════════════ */}
      {/* TAB: EXERCICES                                      */}
      {/* ════════════════════════════════════════════════════ */}
      {activeTab === 'exercises' && (
        <View style={{ flex: 1 }}>
          {/* Search bar */}
          <View style={ss.exSearchWrap}>
            <Text style={ss.exSearchIcon}>🔍</Text>
            <TextInput
              style={ss.exSearchInput}
              placeholder="Rechercher un exercice..."
              placeholderTextColor="#555555"
              value={tabSearch}
              onChangeText={setTabSearch}
              autoCorrect={false}
              returnKeyType="search"
            />
            {tabSearch.length > 0 && (
              <Pressable onPress={() => setTabSearch('')} hitSlop={8}>
                <Text style={{ color: '#555555', fontSize: 16 }}>✕</Text>
              </Pressable>
            )}
          </View>

          {/* Muscle filter pills */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ flexGrow: 0 }}
            contentContainerStyle={{ paddingHorizontal: 20, gap: 8, paddingBottom: 4 }}
          >
            {MUSCLE_FILTERS.map((f) => (
              <Pressable
                key={f.key}
                onPress={() => handleTabFilter(f.key)}
                style={[
                  ss.filterPill,
                  tabFilter === f.key && ss.filterPillActive,
                ]}
              >
                <Text style={[ss.filterPillTxt, tabFilter === f.key && ss.filterPillTxtActive]}>
                  {f.label}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          {/* Count */}
          <View style={ss.exCountRow}>
            <Text style={ss.exCountTxt}>
              {tabLoading ? '…' : `${tabDisplayExercises.length} exercice${tabDisplayExercises.length !== 1 ? 's' : ''}`}
            </Text>
          </View>

          {/* Liste accordéon */}
          {tabLoading ? (
            <View style={{ flex: 1, alignItems: 'center', paddingTop: 48 }}>
              <ActivityIndicator color="#C8F135" />
            </View>
          ) : tabDisplayExercises.length === 0 ? (
            <View style={ss.empty}>
              <Text style={ss.emptyTitle}>Aucun exercice trouvé</Text>
              <Text style={ss.emptySub}>Essaie un autre terme ou filtre</Text>
            </View>
          ) : (
            <FlatList
              data={tabDisplayExercises}
              keyExtractor={(item) => item.id}
              renderItem={({ item }: ListRenderItemInfo<LibraryExercise>) => (
                <ExerciseAccordionCard
                  item={item}
                  isExpanded={tabExpandedId === item.id}
                  onToggle={() => toggleTabCard(item.id)}
                  onAdd={() => {
                    const newEx: Exercise = {
                      name: item.name,
                      muscle_group: MUSCLE_LABELS[item.body_part?.toLowerCase() ?? ''] ?? item.body_part ?? '',
                      order_index: exercises.length,
                    };
                    setExercises(prev => [...prev, newEx]);
                    setTabExpandedId(null);
                    openCreate();
                  }}
                  theme={theme}
                />
              )}
              extraData={tabExpandedId}
              style={{ flex: 1 }}
              contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 4, paddingBottom: bottomPad }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              initialNumToRender={10}
              maxToRenderPerBatch={8}
              windowSize={5}
            />
          )}
        </View>
      )}

      {/* ── MODAL CRÉATION / ÉDITION ─────────────────────── */}
      <Modal visible={showCreate} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView
          style={ss.modal}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <SafeAreaView style={{ flex: 1 }}>
            <View style={ss.modalHeader}>
              <Pressable onPress={() => setShowCreate(false)}>
                <Text style={ss.modalCancel}>Annuler</Text>
              </Pressable>
              <Text style={ss.modalTitle}>{editTarget ? 'Modifier' : 'Nouveau programme'}</Text>
              <Pressable
                onPress={saveProgram}
                disabled={saving || !name.trim() || exercises.length === 0}
              >
                <Text style={[ss.modalSave, (!name.trim() || exercises.length === 0) && ss.modalSaveDisabled]}>
                  {saving ? '…' : editTarget ? 'Sauver' : 'Créer'}
                </Text>
              </Pressable>
            </View>

            <ScrollView
              style={ss.modalScroll}
              contentContainerStyle={ss.modalScrollContent}
              keyboardShouldPersistTaps="handled"
            >
              <TextInput
                style={ss.input}
                placeholder="Nom du programme (ex : Push Force)"
                placeholderTextColor={theme.textMuted}
                value={name}
                onChangeText={setName}
              />

              <Text style={ss.fieldLabel}>TYPE</Text>
              <View style={ss.pillRow}>
                {TYPE_OPTIONS.map((opt) => (
                  <Pressable
                    key={opt.value}
                    onPress={() => setType(opt.value)}
                    style={[ss.pill, type === opt.value && ss.pillActive]}
                  >
                    <Text style={[ss.pillTxt, type === opt.value && ss.pillTxtActive]}>{opt.label}</Text>
                  </Pressable>
                ))}
              </View>

              <Text style={ss.fieldLabel}>BLOC PPL</Text>
              <View style={ss.pillRow}>
                {PPL_OPTIONS.map((opt) => (
                  <Pressable
                    key={opt.value}
                    onPress={() => applyPreset(opt.value)}
                    style={[ss.pill, pplBlock === opt.value && ss.pillActive]}
                  >
                    <Text style={[ss.pillTxt, pplBlock === opt.value && ss.pillTxtActive]}>{opt.label}</Text>
                  </Pressable>
                ))}
              </View>

              <Text style={ss.fieldLabel}>EXERCICES ({exercises.length})</Text>
              {exercises.map((ex, i) => (
                <View key={i} style={ss.exRow}>
                  <View style={ss.exDrag}>
                    <Icon name="list" size={14} color={theme.textMuted} />
                  </View>
                  <View style={ss.exInfo}>
                    <Text style={ss.exName}>{ex.name}</Text>
                    <Text style={ss.exMuscle}>{ex.muscle_group}</Text>
                  </View>
                  <Pressable onPress={() => removeExercise(i)} style={ss.exRemove}>
                    <Text style={ss.exRemoveTxt}>✕</Text>
                  </Pressable>
                </View>
              ))}

              <Pressable onPress={openLibraryPicker} style={ss.libPickerBtn}>
                <Text style={ss.libPickerEmoji}>🔍</Text>
                <Text style={ss.libPickerTxt}>Choisir depuis la bibliothèque</Text>
                <Icon name="caretRight" size={14} color={theme.brand} />
              </Pressable>
            </ScrollView>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── MODAL BIBLIOTHÈQUE (picker) ───────────────────── */}
      <Modal visible={showLibrary} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={[ss.modal, { paddingBottom: insets.bottom }]}>
          <View style={ss.libModalHeader}>
            <Pressable onPress={() => setShowLibrary(false)}>
              <Text style={ss.modalCancel}>Fermer</Text>
            </Pressable>
            <Text style={ss.modalTitle}>BIBLIOTHÈQUE</Text>
            <View style={{ width: 60 }} />
          </View>

          <View style={ss.libSearchWrap}>
            <TextInput
              style={ss.libSearchInput}
              placeholder="Rechercher un exercice..."
              placeholderTextColor={theme.textMuted}
              value={libSearch}
              onChangeText={setLibSearch}
              autoCorrect={false}
            />
            {libSearch.length > 0 && (
              <Pressable onPress={() => setLibSearch('')} hitSlop={8}>
                <Text style={{ color: theme.textMuted, fontSize: 16 }}>✕</Text>
              </Pressable>
            )}
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ flexGrow: 0 }}
            contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}
          >
            {MUSCLE_FILTERS.map((f) => (
              <Pressable
                key={f.key}
                onPress={() => handleLibFilter(f.key)}
                style={[ss.pill, libFilter === f.key && ss.pillActive]}
              >
                <Text style={[ss.pillTxt, libFilter === f.key && ss.pillTxtActive]}>{f.label}</Text>
              </Pressable>
            ))}
          </ScrollView>

          <View style={{ paddingHorizontal: 20, paddingTop: 10, paddingBottom: 4 }}>
            <Text style={ss.libCount}>
              {libLoading ? '…' : `${pickerData.length} exercice${pickerData.length !== 1 ? 's' : ''} — appuie pour ajouter`}
            </Text>
          </View>

          {libLoading ? (
            <View style={{ flex: 1, alignItems: 'center', paddingTop: 40 }}>
              <ActivityIndicator color={theme.brand} />
            </View>
          ) : (
            <FlatList
              data={pickerData}
              keyExtractor={(entry) => (entry.kind === 'official' ? entry.item.id : `custom-${entry.item.id}`)}
              renderItem={({ item: entry }: ListRenderItemInfo<PickerItem>) =>
                entry.kind === 'official' ? (
                  <LibPickerCard item={entry.item} theme={theme} onSelect={() => selectFromLibrary(entry.item)} />
                ) : (
                  <CustomPickerCard
                    item={entry.item}
                    theme={theme}
                    onSelect={() => {
                      setExercises((prev) => [
                        ...prev,
                        { name: entry.item.name, muscle_group: entry.item.muscle_group, order_index: prev.length },
                      ]);
                      setShowLibrary(false);
                    }}
                  />
                )
              }
              style={{ flex: 1 }}
              contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 4, paddingBottom: 40 }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              initialNumToRender={12}
              maxToRenderPerBatch={10}
              windowSize={5}
              ListEmptyComponent={
                <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                  <Text style={{ color: theme.textSecondary, fontSize: 15 }}>Aucun exercice trouvé</Text>
                </View>
              }
              ListFooterComponent={
                <View style={ss.libCreateWrap}>
                  {!showCustomForm ? (
                    <Pressable
                      onPress={() => { setShowCustomForm(true); setCustomMuscleInput(''); }}
                      disabled={!libSearch.trim()}
                      style={[ss.libCreateBtn, !libSearch.trim() && { opacity: 0.5 }]}
                    >
                      <Text style={ss.libCreateBtnTxt}>
                        {libSearch.trim()
                          ? `+ Créer « ${libSearch.trim()} » comme nouvel exercice`
                          : 'Tape un nom ci-dessus pour créer un exercice perso'}
                      </Text>
                    </Pressable>
                  ) : (
                    <View style={ss.libCreateForm}>
                      <Text style={ss.libCreateFormLabel}>Nouvel exercice : {libSearch.trim()}</Text>
                      <TextInput
                        style={ss.libCreateFormInput}
                        placeholder="Groupe musculaire (ex : Pectoraux)"
                        placeholderTextColor={theme.textMuted}
                        value={customMuscleInput}
                        onChangeText={setCustomMuscleInput}
                        onSubmitEditing={handleCreateCustomExercise}
                        autoFocus
                      />
                      <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                        <Pressable onPress={() => setShowCustomForm(false)} style={ss.libCreateCancelBtn}>
                          <Text style={ss.libCreateCancelTxt}>Annuler</Text>
                        </Pressable>
                        <Pressable onPress={handleCreateCustomExercise} style={ss.libCreateConfirmBtn}>
                          <Text style={ss.libCreateConfirmTxt}>Créer et ajouter</Text>
                        </Pressable>
                      </View>
                    </View>
                  )}
                </View>
              }
            />
          )}
        </SafeAreaView>
      </Modal>

      {/* ── MODAL DÉTAIL PROGRAMME VEDETTE ────────────────── */}
      <TemplateDetailModal
        template={selectedTemplate}
        theme={theme}
        insets={insets}
        saving={addingTemplate}
        onClose={() => setSelectedTemplate(null)}
        onAdd={addTemplateToPrograms}
      />

      {/* ── BOUTON FLOTTANT (créer un programme) ──────────── */}
      <Pressable
        onPress={openCreate}
        style={[ss.fab, { bottom: 65 + insets.bottom + 16 }]}
      >
        <Text style={ss.fabTxt}>+</Text>
      </Pressable>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────
function getStyles(theme: ReturnType<typeof import('@/lib/theme').useTheme>['theme']) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: theme.bg },

    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingTop: 16,
      paddingBottom: 12,
    },
    title: {
      color: '#FFFFFF',
      fontWeight: '900',
      fontSize: 32,
      letterSpacing: -0.5,
      fontFamily: 'Anton_400Regular',
    },
    // Bouton flottant — créer un programme
    fab: {
      position: 'absolute',
      right: 20,
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: '#C8F135',
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOpacity: 0.35,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
      elevation: 8,
    },
    fabTxt: { color: '#0D1108', fontSize: 30, fontWeight: '300', marginTop: -2 },

    // Segmented control
    segWrap: { paddingHorizontal: 20, paddingBottom: 14 },
    segContainer: {
      backgroundColor: '#161D0F',
      borderRadius: 12,
      padding: 4,
      flexDirection: 'row',
      position: 'relative',
    },
    segIndicator: {
      position: 'absolute',
      top: 4,
      bottom: 4,
      left: 4,
      backgroundColor: '#2A2A2A',
      borderRadius: 9,
    },
    segTab: {
      paddingVertical: 9,
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1,
    },
    segTabTxt: { color: '#666666', fontSize: 13, fontWeight: '600' },
    segTabTxtActive: { color: '#FFFFFF', fontWeight: '700' },

    // Programs list
    list: { flex: 1 },
    listContent: { paddingHorizontal: 20, paddingTop: 4 },

    // Empty state
    empty: { alignItems: 'center', paddingVertical: 60, gap: 12 },
    emptyTitle: { color: '#FFFFFF', fontWeight: '700', fontSize: 18 },
    emptySub: {
      color: '#888888',
      fontSize: 13,
      textAlign: 'center',
      lineHeight: 19,
      paddingHorizontal: 20,
    },
    emptyBtn: {
      backgroundColor: '#C8F135',
      borderRadius: 99,
      paddingHorizontal: 24,
      paddingVertical: 12,
      marginTop: 4,
    },
    emptyBtnTxt: { color: '#0D1108', fontWeight: '700', fontSize: 14 },

    // Program card
    progCard: {
      backgroundColor: '#161D0F',
      borderRadius: 16,
      borderWidth: 0.5,
      borderColor: '#2A2A2A',
      padding: 18,
      marginBottom: 12,
    },
    progTags: {
      color: '#C8F135',
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 0.8,
      textTransform: 'uppercase',
    },
    progName: {
      color: '#FFFFFF',
      fontWeight: '700',
      fontSize: 22,
      letterSpacing: -0.3,
      marginTop: 8,
      marginBottom: 14,
      fontFamily: 'Anton_400Regular',
    },
    progExList: { gap: 2, marginBottom: 16 },
    progExLine: { color: '#888888', fontSize: 14, lineHeight: 24 },
    progExMore: { color: '#C8F135', fontSize: 14, lineHeight: 24, fontWeight: '600' },
    progFooter: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderTopWidth: 0.5,
      borderTopColor: '#2A2A2A',
      paddingTop: 12,
    },
    progExCount: { color: '#555555', fontSize: 12 },
    progFooterActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    progDeleteBtn: {
      width: 30,
      height: 30,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(255,107,107,0.12)',
    },
    progEditBtn: {
      width: 30,
      height: 30,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(200,241,53,0.12)',
    },

    // Exercises tab — search
    exSearchWrap: {
      marginHorizontal: 20,
      marginBottom: 12,
      backgroundColor: '#161D0F',
      borderRadius: 12,
      borderWidth: 0.5,
      borderColor: '#2A2A2A',
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 14,
      height: 44,
      gap: 8,
    },
    exSearchIcon: { fontSize: 14 },
    exSearchInput: { flex: 1, color: '#FFFFFF', fontSize: 14 },

    // Exercises tab — muscle filter pills
    filterPill: {
      borderRadius: 99,
      paddingHorizontal: 14,
      paddingVertical: 7,
      backgroundColor: '#161D0F',
      borderWidth: 1,
      borderColor: '#2A2A2A',
    },
    filterPillActive: {
      backgroundColor: '#1E2914',
      borderColor: '#C8F135',
    },
    filterPillTxt: {
      color: '#666666',
      fontSize: 12,
      fontWeight: '600',
    },
    filterPillTxtActive: { color: '#C8F135' },

    // Exercises tab — count
    exCountRow: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 6 },
    exCountTxt: {
      color: '#444444',
      fontSize: 10,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.8,
    },

    // Modals
    modal: { flex: 1, backgroundColor: theme.surface },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    modalCancel: { color: theme.textSecondary, fontSize: 15 },
    modalTitle: { color: theme.textPrimary, fontWeight: '700', fontSize: 15 },
    modalSave: { color: theme.brand, fontWeight: '700', fontSize: 15 },
    modalSaveDisabled: { color: theme.textMuted },
    modalScroll: { flex: 1 },
    modalScrollContent: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 60 },

    input: {
      backgroundColor: theme.surfaceRaised,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.border,
      paddingHorizontal: 16,
      height: 52,
      color: theme.textPrimary,
      fontSize: 15,
      marginBottom: 20,
    },
    fieldLabel: {
      color: theme.textMuted,
      fontSize: 10,
      fontWeight: '700',
      letterSpacing: 1.2,
      textTransform: 'uppercase',
      marginBottom: 8,
    },
    pillRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
    pill: {
      flex: 1,
      height: 42,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.surfaceRaised,
      borderWidth: 1,
      borderColor: theme.border,
    },
    pillActive: { backgroundColor: theme.brand, borderColor: theme.brand },
    pillTxt: { color: theme.textSecondary, fontWeight: '700', fontSize: 13 },
    pillTxtActive: { color: theme.bg },

    exRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      backgroundColor: theme.surfaceRaised,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 10,
      marginBottom: 6,
    },
    exDrag: { width: 20, alignItems: 'center' },
    exInfo: { flex: 1 },
    exName: { color: theme.textPrimary, fontSize: 14, fontWeight: '600' },
    exMuscle: { color: theme.textMuted, fontSize: 11, marginTop: 1 },
    exRemove: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
    exRemoveTxt: { color: theme.danger, fontSize: 14 },

    libPickerBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      backgroundColor: theme.brand + '12',
      borderRadius: 14,
      borderWidth: 1,
      borderColor: theme.brand + '40',
      paddingHorizontal: 16,
      paddingVertical: 14,
      marginTop: 8,
      marginBottom: 4,
    },
    libPickerEmoji: { fontSize: 16 },
    libPickerTxt: { flex: 1, color: theme.brand, fontWeight: '700', fontSize: 14 },

    // Bibliothèque — créer un exercice perso
    libCreateWrap: { marginTop: 4, marginBottom: 20 },
    libCreateBtn: {
      backgroundColor: theme.brand + '12',
      borderRadius: 14,
      borderWidth: 1,
      borderColor: theme.brand + '40',
      paddingHorizontal: 16,
      paddingVertical: 14,
    },
    libCreateBtnTxt: { color: theme.brand, fontWeight: '700', fontSize: 13, textAlign: 'center' },
    libCreateForm: {
      backgroundColor: theme.surfaceRaised,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.border,
      padding: 14,
    },
    libCreateFormLabel: { color: theme.textPrimary, fontWeight: '700', fontSize: 13, marginBottom: 8 },
    libCreateFormInput: {
      color: theme.textPrimary,
      fontSize: 14,
      backgroundColor: theme.surface,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: theme.border,
      paddingHorizontal: 12,
      height: 40,
    },
    libCreateCancelBtn: {
      flex: 1,
      height: 40,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.border,
    },
    libCreateCancelTxt: { color: theme.textSecondary, fontWeight: '700', fontSize: 13 },
    libCreateConfirmBtn: {
      flex: 2,
      height: 40,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.brand,
    },
    libCreateConfirmTxt: { color: theme.bg, fontWeight: '700', fontSize: 13 },

    libModalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    libSearchWrap: {
      marginHorizontal: 20,
      marginVertical: 12,
      backgroundColor: theme.surfaceRaised,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: theme.border,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 14,
      height: 44,
    },
    libSearchInput: { flex: 1, color: theme.textPrimary, fontSize: 14 },
    libCount: {
      color: theme.textMuted,
      fontSize: 10,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.8,
    },
  });
}
