import { useEffect, useState } from 'react';
import {
  Alert, Pressable, ScrollView, Text, TextInput, View, Modal, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { Program, PplBlock, SessionType, Exercise } from '@/lib/types';

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

export default function ProgramsScreen() {
  const { user } = useAuth();
  const [programs, setPrograms] = useState<Program[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState<SessionType>('hypertrophie');
  const [pplBlock, setPplBlock] = useState<PplBlock>('push');
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [newExName, setNewExName] = useState('');
  const [newExMuscle, setNewExMuscle] = useState('');
  const [saving, setSaving] = useState(false);

  function loadPrograms() {
    if (!user) return;
    supabase
      .from('programs')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => setPrograms(data ?? []));
  }

  useEffect(() => { loadPrograms(); }, [user]);

  function applyPreset(block: PplBlock) {
    setPplBlock(block);
    setExercises(
      MUSCLE_PRESETS[block].map((ex, i) => ({ ...ex, order_index: i }))
    );
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
    const { error } = await supabase.from('programs').insert({
      user_id: user.id,
      name: name.trim(),
      type,
      ppl_block: pplBlock,
      exercises,
    });
    if (!error) {
      setShowCreate(false);
      setName('');
      setExercises([]);
      loadPrograms();
    }
    setSaving(false);
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

  return (
    <SafeAreaView className="flex-1 bg-surface">
      <View className="px-5 pt-4 pb-2 flex-row items-center justify-between">
        <Text className="text-text-primary text-2xl font-black">Programmes</Text>
        <Pressable
          onPress={() => setShowCreate(true)}
          className="bg-brand rounded-xl px-4 py-2"
        >
          <Text className="text-black font-bold text-sm">+ Nouveau</Text>
        </Pressable>
      </View>

      <ScrollView className="flex-1 px-5">
        {programs.length === 0 ? (
          <View className="items-center py-20">
            <Text className="text-text-muted text-sm">Aucun programme. Crée-en un !</Text>
          </View>
        ) : (
          programs.map((p) => (
            <Pressable
              key={p.id}
              onLongPress={() => deleteProgram(p.id)}
              className="bg-surface-raised border border-surface-border rounded-2xl p-4 mb-3"
            >
              <View className="flex-row items-start justify-between">
                <View className="flex-1">
                  <Text className="text-text-primary font-bold text-lg">{p.name}</Text>
                  <Text className="text-text-secondary text-sm mt-0.5 capitalize">
                    {p.ppl_block} · {p.type}
                  </Text>
                </View>
                <View className="bg-surface-border rounded-lg px-2 py-1">
                  <Text className="text-brand text-xs font-bold uppercase">{p.ppl_block}</Text>
                </View>
              </View>
              {p.exercises && p.exercises.length > 0 && (
                <View className="mt-3 flex-row flex-wrap gap-2">
                  {p.exercises.slice(0, 4).map((ex, i) => (
                    <View key={i} className="bg-surface-border rounded-lg px-2 py-1">
                      <Text className="text-text-secondary text-xs">{ex.name}</Text>
                    </View>
                  ))}
                  {p.exercises.length > 4 && (
                    <View className="bg-surface-border rounded-lg px-2 py-1">
                      <Text className="text-text-muted text-xs">+{p.exercises.length - 4}</Text>
                    </View>
                  )}
                </View>
              )}
            </Pressable>
          ))
        )}
      </ScrollView>

      {/* Create modal */}
      <Modal visible={showCreate} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView
          className="flex-1 bg-surface"
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <SafeAreaView className="flex-1">
            <View className="px-5 pt-4 pb-2 flex-row items-center justify-between border-b border-surface-border">
              <Pressable onPress={() => setShowCreate(false)}>
                <Text className="text-text-secondary text-base">Annuler</Text>
              </Pressable>
              <Text className="text-text-primary font-bold text-base">Nouveau programme</Text>
              <Pressable onPress={saveProgram} disabled={saving || !name.trim() || exercises.length === 0}>
                <Text className={`font-bold text-base ${name.trim() && exercises.length > 0 ? 'text-brand' : 'text-text-muted'}`}>
                  Créer
                </Text>
              </Pressable>
            </View>

            <ScrollView className="flex-1 px-5 pt-5">
              <TextInput
                className="bg-surface-raised border border-surface-border rounded-2xl px-4 h-14 text-text-primary text-base mb-5"
                placeholder="Nom du programme (ex: Push Force)"
                placeholderTextColor="#444"
                value={name}
                onChangeText={setName}
              />

              {/* Type */}
              <Text className="text-text-secondary text-xs font-semibold uppercase tracking-widest mb-2">Type</Text>
              <View className="flex-row gap-2 mb-5">
                {TYPE_OPTIONS.map((opt) => (
                  <Pressable
                    key={opt.value}
                    onPress={() => setType(opt.value)}
                    className={`flex-1 h-12 rounded-xl items-center justify-center border ${
                      type === opt.value ? 'bg-brand border-brand' : 'bg-surface-raised border-surface-border'
                    }`}
                  >
                    <Text className={`font-bold text-sm ${type === opt.value ? 'text-black' : 'text-text-secondary'}`}>
                      {opt.label}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {/* Bloc PPL */}
              <Text className="text-text-secondary text-xs font-semibold uppercase tracking-widest mb-2">Bloc</Text>
              <View className="flex-row gap-2 mb-5">
                {PPL_OPTIONS.map((opt) => (
                  <Pressable
                    key={opt.value}
                    onPress={() => applyPreset(opt.value)}
                    className={`flex-1 h-12 rounded-xl items-center justify-center border ${
                      pplBlock === opt.value ? 'bg-brand border-brand' : 'bg-surface-raised border-surface-border'
                    }`}
                  >
                    <Text className={`font-bold text-xs ${pplBlock === opt.value ? 'text-black' : 'text-text-secondary'}`}>
                      {opt.label}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {/* Exercices */}
              <Text className="text-text-secondary text-xs font-semibold uppercase tracking-widest mb-3">
                Exercices ({exercises.length})
              </Text>
              {exercises.map((ex, i) => (
                <View key={i} className="flex-row items-center bg-surface-raised border border-surface-border rounded-xl px-4 h-12 mb-2">
                  <Text className="text-text-primary flex-1 text-sm">{ex.name}</Text>
                  <Text className="text-text-muted text-xs mr-3">{ex.muscle_group}</Text>
                  <Pressable onPress={() => removeExercise(i)}>
                    <Text className="text-red-500 text-sm">✕</Text>
                  </Pressable>
                </View>
              ))}

              {/* Add exercise */}
              <View className="bg-surface-raised border border-surface-border rounded-2xl p-3 mt-1 mb-8">
                <TextInput
                  className="text-text-primary text-sm h-10 px-2"
                  placeholder="Nom de l'exercice"
                  placeholderTextColor="#444"
                  value={newExName}
                  onChangeText={setNewExName}
                />
                <View className="flex-row gap-2 mt-1">
                  <TextInput
                    className="flex-1 text-text-primary text-sm bg-surface border border-surface-border rounded-xl h-9 px-3"
                    placeholder="Groupe musculaire"
                    placeholderTextColor="#444"
                    value={newExMuscle}
                    onChangeText={setNewExMuscle}
                  />
                  <Pressable
                    onPress={addExercise}
                    className="bg-brand rounded-xl px-4 h-9 items-center justify-center"
                  >
                    <Text className="text-black font-bold text-sm">+ Ajouter</Text>
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
