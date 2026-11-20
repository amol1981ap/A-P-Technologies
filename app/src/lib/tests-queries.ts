import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { BatchTest, BatchTestValue } from './database.types';
import { supabase } from './supabase';

function unwrap<R extends { data: unknown; error: { message: string } | null }>(res: R): NonNullable<R['data']> {
  if (res.error) throw new Error(res.error.message);
  return res.data as NonNullable<R['data']>;
}

/** Properties usually tested on a GFRP bar. No values or limits are filled in: they come from your lab report. */
export const COMMON_PROPERTIES = [
  { property: 'Tensile strength', unit: 'MPa' },
  { property: 'Modulus of elasticity', unit: 'GPa' },
  { property: 'Glass content', unit: '%' },
  { property: 'Water absorption', unit: '%' },
  { property: 'Bond strength', unit: 'MPa' },
  { property: 'Measured diameter', unit: 'mm' },
];

export type TestWithValues = { test: BatchTest; values: BatchTestValue[] };

async function loadTests(tests: BatchTest[]): Promise<TestWithValues[]> {
  if (tests.length === 0) return [];
  const values = unwrap(await supabase.from('batch_test_values').select('*').in('test_id', tests.map((t) => t.id)).order('sort'));
  return tests.map((test) => ({ test, values: values.filter((v) => v.test_id === test.id) }));
}

export function useBatchTests() {
  return useQuery({
    queryKey: ['batch-tests'],
    queryFn: async () => loadTests(unwrap(await supabase.from('batch_tests').select('*').order('tested_on', { ascending: false }).order('created_at', { ascending: false }).limit(200))),
  });
}

export function useTestsForBatches(batches: string[]) {
  const key = [...new Set(batches.filter(Boolean))].sort();
  return useQuery({
    queryKey: ['batch-tests', 'for', key.join('|')],
    enabled: key.length > 0,
    queryFn: async () => loadTests(unwrap(await supabase.from('batch_tests').select('*').in('batch_no', key).order('tested_on', { ascending: false }))),
  });
}

export function useSaveBatchTest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (a: { batch_no: string; tested_on: string; lab: string | null; report_no: string | null; notes: string | null; values: { property: string; value: string; unit: string | null; requirement: string | null }[] }) => {
      if (a.values.length === 0) throw new Error('Enter at least one test result.');
      const { values, ...head } = a;
      const test = unwrap(await supabase.from('batch_tests').insert(head).select().single());
      try {
        unwrap(await supabase.from('batch_test_values').insert(values.map((v, i) => ({ test_id: test.id, ...v, sort: i }))).select());
      } catch (e) {
        await supabase.from('batch_tests').delete().eq('id', test.id);
        throw e;
      }
      return test.id;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['batch-tests'] }),
  });
}
