import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { ProgramTemplate } from '@/lib/types';

export const LEVEL_LABELS: Record<string, string> = {
  debutant: 'Débutant',
  intermediaire: 'Intermédiaire',
  avance: 'Avancé',
};

export function useProgramTemplates() {
  const [templates, setTemplates] = useState<ProgramTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('program_templates')
      .select('*')
      .order('sort_order')
      .then(({ data }) => {
        setTemplates((data as ProgramTemplate[]) ?? []);
        setLoading(false);
      });
  }, []);

  return { templates, loading };
}
