export interface DsaSheet {
  id: string;
  title: string;
  slug: string;
  description_md: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DsaCategory {
  id: string;
  sheet_id: string;
  name: string;
  color: string;
  sort_order: number;
  created_at: string;
}

export interface DsaProblem {
  id: string;
  category_id: string;
  name: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  lc_url: string;
  yt_url: string;
  notes: string;
  sort_order: number;
  created_at: string;
}

export interface DsaProgress {
  student_id: string;
  problem_id: string;
  completed_at: string;
}

export interface DsaFavorite {
  student_id: string;
  problem_id: string;
  created_at: string;
}

export interface DsaCategoryWithProblems extends DsaCategory {
  problems: DsaProblem[];
}

export interface DsaSheetWithData extends DsaSheet {
  categories: DsaCategoryWithProblems[];
}

export interface DsaAnalytics {
  totalStudents: number;
  totalProblems: number;
  overallCompletionPct: number;
  avgProblemsPerStudent: number;
  categoryBreakdown: Array<{
    category: string;
    problemCount: number;
    avgCompletion: number;
    easy: number;
    medium: number;
    hard: number;
  }>;
  studentLeaderboard: Array<{
    studentId: string;
    name: string;
    college: string;
    easy: number;
    medium: number;
    hard: number;
    total: number;
    pct: number;
    lastActive: string;
  }>;
  problemStats: Array<{
    problemId: string;
    name: string;
    category: string;
    solvedCount: number;
    favoritedCount: number;
  }>;
}
