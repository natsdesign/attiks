import { useEffect, useState } from 'react';
import {
  Alert, Pressable, ScrollView, Text, TextInput, View,
  Modal, KeyboardAvoidingView, Platform, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { Program, PplBlock, SessionType, Exercise } from '@/lib/types';
import { Icon } from '@/components/Icon';
import { GradientOrb } from '@/components/GradientOrb';

const BRAND = '#C8F135';
const BG = '#0A0D06';
const SURFACE = '#161D0F';
const SURFACE_RAISED = '#1E2914';
const TEXT_SECONDARY = '#59644C';
const TEXT_MUTED = 'rgba(89,100,76,0.5)';

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

const PPL_COLORS: Record<PplBlock, string> = {
  push: '#FF6B6B',
  pull: '#4ECDC4',
  legs: '#FFE66D',
  full: BRAND,
};

export default function ProgramsScreen() {
  const { user } = useAuth();
  const [programs, setPrograms] = useState<Program[]>([]);
  const [lastUsed, setLastUsed] = useState<Record<string, string | null>>({});
  const [showCreate, setShowCreate] = useState(false);
  const [editTarget, setEditTarget] = useState<Program | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [type, setType] = useState<SessionType>('hypertrophie');
  const [pplBlock, setPplBlock] = useState<PplBlock>('push');
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [newExName, setNewExName] = useState('');
  const [newExMuscle, setNewExMuscle] = useState('');
  const [saving, setSaving] = useState(false);

  function loadPrograms() {
    if (!user) return;
    supabase.from('programs').select('*').eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => { setPrograms(data ?? []); });

    // Last used date per program (from sessions)
    supabase.from('sessions').select('program_id, date').eq('user_id', user.id)
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

  function addExercise() {
    if (!newExName.trim()) return;
    setExercises((prev) => [
      ...prev,
      { name: newExName.trim(), muscle_group: newExMuscle.trim() || 'Autre', order_index: prev.length },
    ]);
    setNewExName('');
    setNewExMuscle('');
  }

  function removeExercise(index: number) {
    setExercises((prev) => prev.filter((_, i) => i !== index).map((ex, i) => ({ ...ex, order_index: i })));
  }

  async function saveProgram() {
    if (!user || !name.trim() || exercises.length === 0) return;
    setSaving(true);
    if (editTarget) {
      await supabase.from('programs').update({ name: name.trim(), type, ppl_block: pplBlock, exercises })
        .eq('id', editTarget.id);
    } else {
      await supabase.from('programs').insert({ user_id: user.id, name: name.trim(), type, ppl_block: pplBlock, exercises });
    }
    setSaving(false);
    setShowCreate(false);
    loadPrograms();
  }

  async function deleteProgram(id: string) {
    Alert.alert('Supprimer', 'Supprimer ce programme ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer', style: 'destructive',
        onPress: async () => { await supabase.from('programs').delete().eq('id', id); loadPrograms(); },
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

  return (
    <SafeAreaView style={ss.root}>
      <GradientOrb />
      {/* ── HEADER ─────────────────────────────────────────── */}
      <View style={ss.header}>
        <Text style={ss.title}>PROGRAMME</Text>
        <Pressable onPress={openCreate} style={ss.addBtn}>
          <Icon name="barbell" size={16} color="#0D1108" />
          <Text style={ss.addBtnTxt}>Nouveau</Text>
        </Pressable>
      </View>

      <ScrollView style={ss.list} contentContainerStyle={ss.listContent} showsVerticalScrollIndicator={false}>
        {programs.length === 0 ? (
          <View style={ss.empty}>
            <Text style={{ fontSize: 40 }}>📋</Text>
            <Text style={ss.emptyTitle}>Aucun programme</Text>
            <Text style={ss.emptySub}>Crée ton premier programme pour structurer ton entraînement.</Text>
            <Pressable onPress={openCreate} style={ss.emptyBtn}>
              <Text style={ss.emptyBtnTxt}>Créer un programme</Text>
            </Pressable>
          </View>
        ) : (
          programs.map((p) => (
            <Pressable
              key={p.id}
              onPress={() => openEdit(p)}
              onLongPress={() => deleteProgram(p.id)}
              style={ss.progCard}
            >
              {/* Accent bar coloured by PPL type */}
              <View style={[ss.progAccent, { backgroundColor: PPL_COLORS[p.ppl_block] }]} />
              <View style={ss.progBody}>
                {/* Top row */}
                <View style={ss.progTopRow}>
                  <View style={ss.progTags}>
                    <View style={[ss.progTag, { backgroundColor: PPL_COLORS[p.ppl_block] + '22' }]}>
                      <Text style={[ss.progTagTxt, { color: PPL_COLORS[p.ppl_block] }]}>
                        {PPL_LABELS[p.ppl_block]}
                      </Text>
                    </View>
                    <View style={ss.progTag}>
                      <Text style={ss.progTagTxt}>{TYPE_LABELS[p.type]}</Text>
                    </View>
                  </View>
                  <Text style={ss.progLastUsed}>{formatLastUsed(lastUsed[p.id])}</Text>
                </View>

                {/* Name */}
                <Text style={ss.progName}>{p.name}</Text>

                {/* Exercises chips */}
                {p.exercises?.length > 0 && (
                  <View style={ss.progExWrap}>
                    {p.exercises.slice(0, 4).map((ex, i) => (
                      <View key={i} style={ss.progExChip}>
                        <Text style={ss.progExTxt}>{ex.name}</Text>
                      </View>
                    ))}
                    {p.exercises.length > 4 && (
                      <View style={ss.progExChip}>
                        <Text style={ss.progExTxt}>+{p.exercises.length - 4}</Text>
                      </View>
                    )}
                  </View>
                )}

                {/* Bottom row */}
                <View style={ss.progBottom}>
                  <Text style={ss.progExCount}>
                    {p.exercises?.length ?? 0} exercice{(p.exercises?.length ?? 0) !== 1 ? 's' : ''}
                  </Text>
                  <View style={ss.progEditHint}>
                    <Text style={ss.progEditHintTxt}>Appui long pour supprimer</Text>
                  </View>
                </View>
              </View>
            </Pressable>
          ))
        )}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* ── MODAL CRÉATION / ÉDITION ─────────────────────── */}
      <Modal visible={showCreate} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView
          style={ss.modal}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <SafeAreaView style={{ flex: 1 }}>
            {/* Modal header */}
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

            <ScrollView style={ss.modalScroll} contentContainerStyle={ss.modalScrollContent}>
              {/* Nom */}
              <TextInput
                style={ss.input}
                placeholder="Nom du programme (ex : Push Force)"
                placeholderTextColor="#444"
                value={name}
                onChangeText={setName}
              />

              {/* Type */}
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

              {/* Bloc PPL */}
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

              {/* Exercices */}
              <Text style={ss.fieldLabel}>EXERCICES ({exercises.length})</Text>
              {exercises.map((ex, i) => (
                <View key={i} style={ss.exRow}>
                  <View style={ss.exDrag}>
                    <Icon name="list" size={14} color={TEXT_MUTED} />
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

              {/* Ajouter un exercice */}
              <View style={ss.addExCard}>
                <TextInput
                  style={ss.addExInput}
                  placeholder="Nom de l'exercice"
                  placeholderTextColor="#444"
                  value={newExName}
                  onChangeText={setNewExName}
                  onSubmitEditing={addExercise}
                />
                <View style={ss.addExRow}>
                  <TextInput
                    style={ss.addExMuscle}
                    placeholder="Groupe musculaire"
                    placeholderTextColor="#444"
                    value={newExMuscle}
                    onChangeText={setNewExMuscle}
                  />
                  <Pressable onPress={addExercise} style={ss.addExBtn}>
                    <Text style={ss.addExBtnTxt}>+ Ajouter</Text>
                  </Pressable>
                </View>
              </View>
            </ScrollView>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const ss = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12,
  },
  title: { color: '#fff', fontWeight: '900', fontSize: 28, letterSpacing: -0.5 },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: BRAND, borderRadius: 99, paddingHorizontal: 14, paddingVertical: 8,
  },
  addBtnTxt: { color: '#0D1108', fontWeight: '700', fontSize: 13 },

  list: { flex: 1 },
  listContent: { paddingHorizontal: 20, paddingTop: 4 },

  empty: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyTitle: { color: '#fff', fontWeight: '700', fontSize: 18 },
  emptySub: { color: TEXT_SECONDARY, fontSize: 13, textAlign: 'center', lineHeight: 19, paddingHorizontal: 20 },
  emptyBtn: { backgroundColor: BRAND, borderRadius: 99, paddingHorizontal: 24, paddingVertical: 12, marginTop: 4 },
  emptyBtnTxt: { color: '#0D1108', fontWeight: '700', fontSize: 14 },

  progCard: {
    backgroundColor: SURFACE, borderRadius: 20,
    borderWidth: 1, borderColor: 'rgba(200,241,53,0.08)',
    overflow: 'hidden', marginBottom: 12,
  },
  progAccent: { height: 3 },
  progBody: { padding: 16 },
  progTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  progTags: { flexDirection: 'row', gap: 6 },
  progTag: {
    borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3,
    backgroundColor: 'rgba(200,241,53,0.08)',
  },
  progTagTxt: { color: TEXT_SECONDARY, fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  progLastUsed: { color: TEXT_MUTED, fontSize: 10 },
  progName: { color: '#fff', fontWeight: '800', fontSize: 17, letterSpacing: -0.3, marginBottom: 10 },
  progExWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  progExChip: {
    borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4,
    backgroundColor: SURFACE_RAISED,
  },
  progExTxt: { color: TEXT_SECONDARY, fontSize: 11 },
  progBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  progExCount: { color: TEXT_MUTED, fontSize: 11 },
  progEditHint: {},
  progEditHintTxt: { color: 'rgba(89,100,76,0.4)', fontSize: 10 },

  // Modal
  modal: { flex: 1, backgroundColor: SURFACE },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: 'rgba(200,241,53,0.08)',
  },
  modalCancel: { color: TEXT_SECONDARY, fontSize: 15 },
  modalTitle: { color: '#fff', fontWeight: '700', fontSize: 15 },
  modalSave: { color: BRAND, fontWeight: '700', fontSize: 15 },
  modalSaveDisabled: { color: TEXT_MUTED },
  modalScroll: { flex: 1 },
  modalScrollContent: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 60 },

  input: {
    backgroundColor: SURFACE_RAISED, borderRadius: 16,
    borderWidth: 1, borderColor: 'rgba(200,241,53,0.1)',
    paddingHorizontal: 16, height: 52,
    color: '#fff', fontSize: 15, marginBottom: 20,
  },
  fieldLabel: {
    color: TEXT_MUTED, fontSize: 10, fontWeight: '700',
    letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 8,
  },
  pillRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  pill: {
    flex: 1, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
    backgroundColor: SURFACE_RAISED, borderWidth: 1, borderColor: 'rgba(200,241,53,0.1)',
  },
  pillActive: { backgroundColor: BRAND, borderColor: BRAND },
  pillTxt: { color: TEXT_SECONDARY, fontWeight: '700', fontSize: 13 },
  pillTxtActive: { color: '#0D1108' },

  exRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: SURFACE_RAISED, borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 10, marginBottom: 6,
  },
  exDrag: { width: 20, alignItems: 'center' },
  exInfo: { flex: 1 },
  exName: { color: '#fff', fontSize: 14, fontWeight: '600' },
  exMuscle: { color: TEXT_MUTED, fontSize: 11, marginTop: 1 },
  exRemove: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  exRemoveTxt: { color: '#FF3B30', fontSize: 14 },

  addExCard: {
    backgroundColor: SURFACE_RAISED, borderRadius: 16,
    borderWidth: 1, borderColor: 'rgba(200,241,53,0.08)',
    padding: 12, marginTop: 8,
  },
  addExInput: {
    color: '#fff', fontSize: 14, height: 38,
    paddingHorizontal: 8, borderBottomWidth: 1,
    borderBottomColor: 'rgba(200,241,53,0.08)', marginBottom: 8,
  },
  addExRow: { flexDirection: 'row', gap: 8 },
  addExMuscle: {
    flex: 1, color: '#fff', fontSize: 13,
    backgroundColor: SURFACE, borderRadius: 10,
    borderWidth: 1, borderColor: 'rgba(200,241,53,0.08)',
    paddingHorizontal: 10, height: 36,
  },
  addExBtn: {
    backgroundColor: BRAND, borderRadius: 10, paddingHorizontal: 12, height: 36,
    alignItems: 'center', justifyContent: 'center',
  },
  addExBtnTxt: { color: '#0D1108', fontWeight: '700', fontSize: 13 },
});
