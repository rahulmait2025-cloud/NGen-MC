'use client';

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useHeaderTitle } from '@/contexts/header-title';
import { DsaIntroBanner } from './dsa-intro-banner';
import { DsaSheetResources } from './dsa-sheet-resources';
import { DsaStatsCards } from './dsa-stats-cards';
import { DsaFilterBar } from './dsa-filter-bar';
import { DsaCategorySection } from './dsa-category-section';
import { DsaProgressProvider, useDsaProgress } from './dsa-progress-provider';
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card } from '@/components/ui/card';
import { Search } from 'lucide-react';
import type { DsaSheetWithData } from '@/types/dsa';

interface Props {
  sheet: DsaSheetWithData;
  completedProblemIds: string[];
  favoritedProblemIds: string[];
  studentId: string;
  collegeSlug: string;
}

export function DsaStudentView({
  sheet,
  completedProblemIds,
  favoritedProblemIds,
  studentId,
  collegeSlug,
}: Props) {
  const { setTitle } = useHeaderTitle();

  useEffect(() => {
    setTitle(sheet.title);
    return () => {
      setTitle(null);
    };
  }, [sheet.title, setTitle]);

  return (
    <DsaProgressProvider
      initialCompleted={completedProblemIds}
      initialFavorited={favoritedProblemIds}
      studentId={studentId}
      collegeSlug={collegeSlug}
    >
      <DsaStudentContent sheet={sheet} collegeSlug={collegeSlug} />
    </DsaProgressProvider>
  );
}

function DsaStudentContent({ sheet, collegeSlug }: { sheet: DsaSheetWithData; collegeSlug: string }) {
  const { completedProblemIds, favoritedProblemIds } = useDsaProgress();
  const [filter, setFilter] = useState<'all' | 'todo' | 'done' | 'favorites'>('all');
  const [difficultyFilter, setDifficultyFilter] = useState<'all' | 'easy' | 'medium' | 'hard'>('all');
  const [search, setSearch] = useState('');
  const [openCategories, setOpenCategories] = useState<Set<string>>(new Set());

  const toggleCategory = useCallback((id: string) => {
    setOpenCategories((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const totalProblems = useMemo(
    () => sheet.categories.reduce((sum, c) => sum + c.problems.length, 0),
    [sheet.categories]
  );

  const visibleCategories = useMemo(() => {
    return sheet.categories.filter((category) => {
      let problems = category.problems;
      if (search) {
        const q = search.toLowerCase();
        problems = problems.filter(
          (p) =>
            p.name.toLowerCase().includes(q) ||
            p.resource_url.toLowerCase().includes(q) ||
            p.notes.toLowerCase().includes(q)
        );
      }
      if (filter === 'done') {
        problems = problems.filter((p) => completedProblemIds.has(p.id));
      } else if (filter === 'todo') {
        problems = problems.filter((p) => !completedProblemIds.has(p.id));
      } else if (filter === 'favorites') {
        problems = problems.filter((p) => favoritedProblemIds.has(p.id));
      }
      if (difficultyFilter !== 'all') {
        problems = problems.filter((p) => p.difficulty.toLowerCase() === difficultyFilter);
      }
      return problems.length > 0;
    });
  }, [sheet.categories, search, filter, difficultyFilter, completedProblemIds, favoritedProblemIds]);

  return (
    <div className="space-y-6">
      {sheet.description_md && <DsaIntroBanner markdown={sheet.description_md} />}

      <DsaSheetResources collegeSlug={collegeSlug} resources={sheet.resources} />

      <DsaStatsCards
        totalProblems={totalProblems}
        categories={sheet.categories}
      />

      <DsaFilterBar
        filter={filter}
        onFilterChange={setFilter}
        difficultyFilter={difficultyFilter}
        onDifficultyFilterChange={setDifficultyFilter}
        search={search}
        onSearchChange={setSearch}
      />

      {sheet.categories.length === 0 ? (
        <Card className="p-8 text-center border-border/50">
          <p className="text-muted-foreground text-sm">No DSA categories available yet.</p>
        </Card>
      ) : visibleCategories.length === 0 ? (
        <Card className="p-12 text-center border border-dashed border-border rounded-xl bg-muted/20">
          <div className="flex flex-col items-center gap-2">
            <Search className="size-6 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground font-medium max-w-sm">
              {filter === 'favorites'
                ? 'No problems marked for revision yet. Star problems to add them here!'
                : filter === 'done'
                ? 'No completed problems yet. Check off completed items to track them here!'
                : filter === 'todo'
                ? 'All problems completed! Great job!'
                : 'No matching problems found.'}
            </p>
          </div>
        </Card>
      ) : (
        <Card className="border border-border/50 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
          <Table className="min-w-[600px]">
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="pl-5 font-semibold text-foreground">Category</TableHead>
                <TableHead className="w-[140px] font-semibold text-foreground">Status</TableHead>
                <TableHead className="w-[120px] font-semibold text-foreground">Problems</TableHead>
                <TableHead className="w-[min(300px,40vw)] font-semibold text-foreground">Difficulty Breakdown</TableHead>
                <TableHead className="w-[80px] text-right pr-5 font-semibold text-foreground"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleCategories.map((category) => (
                <DsaCategorySection
                  key={category.id}
                  category={category}
                  collegeSlug={collegeSlug}
                  sheetSlug={sheet.slug}
                  isOpen={openCategories.has(category.id)}
                  onToggle={() => toggleCategory(category.id)}
                  filter={filter}
                  difficultyFilter={difficultyFilter}
                  search={search}
                />
              ))}
            </TableBody>
          </Table>
          </div>
        </Card>
      )}
    </div>
  );
}
