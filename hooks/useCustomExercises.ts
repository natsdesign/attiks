import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { CustomExercise } from '@/lib/types';

export function useCustomExercises() {
  const { user } = useAuth();
  const [customExercises, setCustomExercises] = useState<CustomExercise[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    if (!user) { setLoading(false); return; }
    supabase
      .from('custom_exercises')
      .select('*')
      .eq('user_id', user.id)
      .order('name')
      .then(({ data }) => {
        setCustomExercises((data as CustomExercise[]) ?? []);
        setLoading(false);
      });
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const addCustomExercise = useCallback(
    async (name: string, muscle_group: string): Promise<CustomExercise | null> => {
      if (!user || !name.trim()) return null;
      const { data, error } = await supabase
        .from('custom_exercises')
        .insert({ user_id: user.id, name: name.trim(), muscle_group: muscle_group.trim() || 'Autre' })
        .select()
        .single();
      if (error || !data) return null;
      const created = data as CustomExercise;
      setCustomExercises((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      return created;
    },
    [user]
  );

  return { customExercises, loading, addCustomExercise };
}
