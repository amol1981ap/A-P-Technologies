import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { addDaysIso, formatDate } from './calc';
import type { Task } from './database.types';
import { supabase } from './supabase';

function unwrap<R extends { data: unknown; error: { message: string } | null }>(res: R): NonNullable<R['data']> {
  if (res.error) throw new Error(res.error.message);
  return res.data as NonNullable<R['data']>;
}

/** Owner sees everyone's tasks; everyone else sees only their own (the database enforces it). */
export function useTasks() {
  return useQuery({
    queryKey: ['tasks'],
    queryFn: async (): Promise<Task[]> =>
      unwrap(await supabase.from('tasks').select('*').order('status', { ascending: false }).order('due_date', { ascending: true, nullsFirst: false }).limit(300)),
  });
}

export function useTask(id: string | undefined) {
  return useQuery({
    queryKey: ['task', id],
    enabled: !!id,
    queryFn: async () => unwrap(await supabase.from('tasks').select('*').eq('id', id!).single()),
  });
}

export function useCreateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (t: { title: string; detail: string | null; assigned_to: string; due_date: string | null }) =>
      unwrap(await supabase.from('tasks').insert(t).select().single()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  });
}

export async function uploadTaskProof(taskId: string, uri: string) {
  const res = await fetch(uri);
  const body = await res.arrayBuffer();
  const path = `${taskId}/${Date.now()}.jpg`;
  const { error } = await supabase.storage.from('task-proofs').upload(path, body, { contentType: 'image/jpeg', upsert: true });
  if (error) throw new Error(error.message);
  return path;
}

export function useTaskProofUrl(path: string | null | undefined) {
  return useQuery({
    queryKey: ['task-proof', path],
    enabled: !!path,
    staleTime: 30 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.storage.from('task-proofs').createSignedUrl(path!, 3600);
      if (error) throw new Error(error.message);
      return data.signedUrl;
    },
  });
}

export function useUpdateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...fields }: { id: string } & Partial<Pick<Task, 'status' | 'proof_path' | 'done_at' | 'title' | 'detail' | 'due_date' | 'assigned_to'>>) =>
      unwrap(await supabase.from('tasks').update(fields).eq('id', id).select().single()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] });
      qc.invalidateQueries({ queryKey: ['task'] });
    },
  });
}

export function taskState(t: Pick<Task, 'status' | 'due_date'>): { text: string; tone: 'calm' | 'attention' | 'neutral' } {
  if (t.status === 'done') return { text: 'Done', tone: 'calm' };
  const today = addDaysIso(0);
  if (!t.due_date) return { text: 'Open', tone: 'neutral' };
  if (t.due_date < today) return { text: 'Overdue', tone: 'attention' };
  if (t.due_date === today) return { text: 'Due today', tone: 'attention' };
  return { text: `Due ${formatDate(t.due_date)}`, tone: 'neutral' };
}

