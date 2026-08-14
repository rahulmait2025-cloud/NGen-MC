import 'server-only';
import { cacheLife, cacheTag } from 'next/cache';
import { createServiceRoleClient } from '@/lib/supabase/server';
import type { DsaSheetWithData, DsaCategoryWithProblems, DsaProblem, DsaSheet } from '@/types/dsa';

export async function listDsaSheets(): Promise<DsaSheet[]> {
  'use cache';
  cacheLife('minutes');
  cacheTag('dsa-sheets');
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from('dsa_sheets')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false });
  if (error || !data) return [];
  return data;
}

export async function getDsaSheetById(sheetId: string): Promise<DsaSheetWithData | null> {
  'use cache';
  cacheLife('minutes');
  cacheTag('dsa-sheet-detail');
  const supabase = createServiceRoleClient();

  const { data: sheet, error: sheetErr } = await supabase
    .from('dsa_sheets')
    .select('*')
    .eq('id', sheetId)
    .single();

  if (sheetErr || !sheet) return null;

  const { data: categories, error: catErr } = await supabase
    .from('dsa_categories')
    .select('*')
    .eq('sheet_id', sheet.id)
    .order('sort_order');

  if (catErr || !categories) return { ...sheet, categories: [] };

  const { data: problems } = await supabase
    .from('dsa_problems')
    .select('*')
    .in('category_id', categories.map((c) => c.id))
    .order('sort_order');

  const problemsByCategory = new Map<string, DsaProblem[]>();
  for (const p of problems || []) {
    const list = problemsByCategory.get(p.category_id) || [];
    list.push(p);
    problemsByCategory.set(p.category_id, list);
  }

  const categoriesWithProblems: DsaCategoryWithProblems[] = categories.map((cat) => ({
    ...cat,
    problems: problemsByCategory.get(cat.id) || [],
  }));

  return { ...sheet, categories: categoriesWithProblems };
}

export async function getDsaSheetBySlug(slug: string): Promise<DsaSheetWithData | null> {
  const supabase = createServiceRoleClient();

  const { data: sheet, error: sheetErr } = await supabase
    .from('dsa_sheets')
    .select('*')
    .eq('slug', slug)
    .single();

  if (sheetErr || !sheet) return null;

  const { data: categories, error: catErr } = await supabase
    .from('dsa_categories')
    .select('*')
    .eq('sheet_id', sheet.id)
    .order('sort_order');

  if (catErr || !categories) return { ...sheet, categories: [] };

  const { data: problems } = await supabase
    .from('dsa_problems')
    .select('*')
    .in('category_id', categories.map((c) => c.id))
    .order('sort_order');

  const problemsByCategory = new Map<string, DsaProblem[]>();
  for (const p of problems || []) {
    const list = problemsByCategory.get(p.category_id) || [];
    list.push(p);
    problemsByCategory.set(p.category_id, list);
  }

  const categoriesWithProblems: DsaCategoryWithProblems[] = categories.map((cat) => ({
    ...cat,
    problems: problemsByCategory.get(cat.id) || [],
  }));

  return { ...sheet, categories: categoriesWithProblems };
}

export async function getCollegeDsaProgress(
  collegeId: string,
  sheetId: string
): Promise<
  Array<{
    studentId: string;
    name: string;
    easy: number;
    medium: number;
    hard: number;
    total: number;
    pct: number;
    lastActive: string;
  }>
> {
  const supabase = createServiceRoleClient();

  const { data: students } = await supabase
    .from('students')
    .select('id, full_name')
    .eq('college_id', collegeId);

  if (!students || students.length === 0) return [];

  const studentIds = students.map((s) => s.id);

  const { data: enrollments } = await supabase
    .from('dsa_enrollments')
    .select('student_id')
    .in('student_id', studentIds)
    .eq('sheet_id', sheetId);

  const enrolledStudentIds = (enrollments || []).map((e) => e.student_id);
  if (enrolledStudentIds.length === 0) return [];

  const nameMap = new Map(
    students
      .filter((s) => enrolledStudentIds.includes(s.id))
      .map((s) => [s.id, s.full_name])
  );

  const { data: categories } = await supabase
    .from('dsa_categories')
    .select('id')
    .eq('sheet_id', sheetId);

  if (!categories || categories.length === 0) return [];
  const categoryIds = categories.map((c) => c.id);

  const { data: sheetProblems } = await supabase
    .from('dsa_problems')
    .select('id, difficulty')
    .in('category_id', categoryIds);

  if (!sheetProblems || sheetProblems.length === 0) return [];

  const totalProblems = sheetProblems.length;
  const problemMap = new Map(sheetProblems.map((p) => [p.id, p.difficulty]));

  const { data: progress } = await supabase
    .from('dsa_progress')
    .select('student_id, problem_id')
    .in('student_id', enrolledStudentIds)
    .in('problem_id', sheetProblems.map((p) => p.id));

  const progressByStudent = new Map<string, Set<string>>();
  for (const p of progress || []) {
    if (!progressByStudent.has(p.student_id)) {
      progressByStudent.set(p.student_id, new Set());
    }
    progressByStudent.get(p.student_id)!.add(p.problem_id);
  }

  return students
    .filter((s) => enrolledStudentIds.includes(s.id))
    .map((student) => {
      const solved = progressByStudent.get(student.id) || new Set();
      let easy = 0,
        medium = 0,
        hard = 0;
      for (const problemId of solved) {
        const diff = problemMap.get(problemId);
        if (diff === 'Easy') easy++;
        else if (diff === 'Medium') medium++;
        else if (diff === 'Hard') hard++;
      }
      const total = easy + medium + hard;
      return {
        studentId: student.id,
        name: nameMap.get(student.id) || 'Unknown',
        easy,
        medium,
        hard,
        total,
        pct: totalProblems > 0 ? Math.round((total / totalProblems) * 100) : 0,
        lastActive: new Date().toISOString(),
      };
    })
    .sort((a, b) => b.total - a.total);
}
