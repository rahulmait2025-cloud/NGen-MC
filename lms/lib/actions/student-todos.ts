'use server';

import { z } from 'zod';
import { requireAuth } from '@/lib/auth/require-student-action';
import { createClient } from '@/lib/supabase/server';
import { revalidateTag } from 'next/cache';

const CATEGORY_SCHEMA = z.enum(['daily', 'weekly', 'monthly']);
const MAX_TODOS = 5;
const MAX_CHARS = 30;

export interface Todo {
  id: string;
  text: string;
  completed: boolean;
  sort_order: number;
  created_at: string;
  category?: string;
}

export interface TodoActionResult {
  ok: boolean;
  error?: string;
  todos?: Todo[];
}

const todoSelect = 'id, text, completed, sort_order, created_at';

/**
 * Fetch todos for a student in a specific category.
 */
async function _getTodosAction(
  collegeSlug: string,
  category: string
): Promise<TodoActionResult> {
  const parsed = CATEGORY_SCHEMA.safeParse(category);
  if (!parsed.success) {
    return { ok: false, error: 'Invalid category.' };
  }

  const auth = await requireAuth(collegeSlug);
  if (!auth) {
    return { ok: false, error: 'Not authenticated.' };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('student_todos')
    .select(todoSelect)
    .eq('student_id', auth.studentId)
    .eq('category', parsed.data)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) {
    return { ok: false, error: 'Failed to load todos.' };
  }

  return { ok: true, todos: data as Todo[] };
}

/**
 * Add a new todo for a student.
 */
export async function addTodoAction(
  collegeSlug: string,
  category: string,
  text: string
): Promise<TodoActionResult> {
  const parsedCategory = CATEGORY_SCHEMA.safeParse(category);
  if (!parsedCategory.success) {
    return { ok: false, error: 'Invalid category.' };
  }

  const trimmedText = text.trim();
  if (!trimmedText || trimmedText.length > MAX_CHARS) {
    return { ok: false, error: `Todo must be 1-${MAX_CHARS} characters.` };
  }

  const auth = await requireAuth(collegeSlug);
  if (!auth) {
    return { ok: false, error: 'Not authenticated.' };
  }

  const supabase = await createClient();

  const [{ count, error: countError }, { data: lastTodo }] = await Promise.all([
    supabase
      .from('student_todos')
      .select('id', { count: 'exact', head: true })
      .eq('student_id', auth.studentId)
      .eq('category', parsedCategory.data),
    supabase
      .from('student_todos')
      .select('sort_order')
      .eq('student_id', auth.studentId)
      .eq('category', parsedCategory.data)
      .order('sort_order', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (countError) {
    return { ok: false, error: 'Failed to check todo count.' };
  }

  if ((count ?? 0) >= MAX_TODOS) {
    return { ok: false, error: `Maximum ${MAX_TODOS} todos per category.` };
  }

  const nextOrder = (lastTodo?.sort_order ?? -1) + 1;

  const { data, error } = await supabase
    .from('student_todos')
    .insert({
      student_id: auth.studentId,
      category: parsedCategory.data,
      text: trimmedText,
      completed: false,
      sort_order: nextOrder,
    })
    .select(todoSelect)
    .single();

  if (error) {
    return { ok: false, error: 'Failed to add todo.' };
  }

  revalidateTag(`student-todos-${auth.studentId}`, 'max');
  revalidateTag('todos', 'max');
  return { ok: true, todos: [data as Todo] };
}

/**
 * Toggle a todo's completed state.
 */
export async function toggleTodoAction(
  collegeSlug: string,
  todoId: string
): Promise<TodoActionResult> {
  const auth = await requireAuth(collegeSlug);
  if (!auth) {
    return { ok: false, error: 'Not authenticated.' };
  }

  const supabase = await createClient();

  // Fetch the todo to verify ownership and get current state
  const { data: existing, error: fetchError } = await supabase
    .from('student_todos')
    .select('id, completed')
    .eq('id', todoId)
    .eq('student_id', auth.studentId)
    .maybeSingle();

  if (fetchError || !existing) {
    return { ok: false, error: 'Todo not found.' };
  }

  const { data, error } = await supabase
    .from('student_todos')
    .update({ completed: !existing.completed })
    .eq('id', todoId)
    .eq('student_id', auth.studentId)
    .select(todoSelect)
    .single();

  if (error) {
    return { ok: false, error: 'Failed to update todo.' };
  }

  revalidateTag(`student-todos-${auth.studentId}`, 'max');
  revalidateTag('todos', 'max');
  return { ok: true, todos: [data as Todo] };
}

/**
 * Delete a todo.
 */
export async function deleteTodoAction(
  collegeSlug: string,
  todoId: string
): Promise<TodoActionResult> {
  const auth = await requireAuth(collegeSlug);
  if (!auth) {
    return { ok: false, error: 'Not authenticated.' };
  }

  const supabase = await createClient();

  // Verify ownership before delete
  const { data: existing } = await supabase
    .from('student_todos')
    .select('id')
    .eq('id', todoId)
    .eq('student_id', auth.studentId)
    .maybeSingle();

  if (!existing) {
    return { ok: false, error: 'Todo not found.' };
  }

  const { error } = await supabase
    .from('student_todos')
    .delete()
    .eq('id', todoId)
    .eq('student_id', auth.studentId);

  if (error) {
    return { ok: false, error: 'Failed to delete todo.' };
  }

  revalidateTag(`student-todos-${auth.studentId}`, 'max');
  revalidateTag('todos', 'max');
  return { ok: true };
}
