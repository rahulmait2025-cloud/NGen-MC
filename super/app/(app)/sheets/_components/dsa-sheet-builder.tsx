'use client';

import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Plus, FileSpreadsheet } from 'lucide-react';
import { DsaIntroEditor } from './dsa-intro-editor';
import { DsaSheetResourcesEditor } from './dsa-sheet-resources-editor';
import { DsaCategoryCard } from './dsa-category-card';
import { DsaAddCategoryDialog } from './dsa-add-category-dialog';
import { DsaSpreadsheetImport } from './dsa-spreadsheet-import';
import * as actions from '../actions';
import type { DsaSheetWithData, DsaCategoryWithProblems } from '@/types/dsa';
import { toast } from 'sonner';
import { exportSheetToExcel } from '@/lib/utils/dsa-excel-export';

import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface Props {
  sheet: DsaSheetWithData | null;
  onRefresh: () => void;
  hasDraft?: boolean;
}

export function DsaSheetBuilder({ sheet, onRefresh, hasDraft }: Props) {
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [categories, setCategories] = useState<DsaCategoryWithProblems[]>(
    sheet?.categories || []
  );
  const [creating, setCreating] = useState(false);
  const categoryCount = categories.length;
  const totalProblems = categories.reduce(
    (total, category) => total + category.problems.length,
    0
  );

  React.useEffect(() => {
    setCategories(sheet?.categories || []);
  }, [sheet]);

  const handleCreateSheet = useCallback(async () => {
    setCreating(true);
    try {
      await actions.createSheet('New DSA Sheet');
      toast.success('DSA Sheet created');
      onRefresh();
    } catch {
      toast.error('Failed to create sheet');
    } finally {
      setCreating(false);
    }
  }, [onRefresh]);

  const handleAddCategory = useCallback(
    async (name: string, color: string) => {
      if (!sheet) return;
      try {
        const cat = await actions.addCategory(sheet.id, name, color);
        setCategories((prev) => [...prev, { ...cat, problems: [] }]);
        setShowAddCategory(false);
        toast.success('Category added');
      } catch {
        toast.error('Failed to add category');
      }
    },
    [sheet]
  );

  const handleReorderCategory = useCallback(
    async (categoryId: string, direction: 'up' | 'down') => {
      if (!sheet) return;
      const ids = categories.map((c) => c.id);
      const idx = ids.indexOf(categoryId);
      if (direction === 'up' && idx > 0) {
        const newIds = [...ids];
        [newIds[idx - 1], newIds[idx]] = [newIds[idx], newIds[idx - 1]];
        setCategories((prev) => {
          const newCats = [...prev];
          [newCats[idx - 1], newCats[idx]] = [newCats[idx], newCats[idx - 1]];
          return newCats;
        });
        await actions.moveCategoryUp(sheet.id, categoryId, ids);
      } else if (direction === 'down' && idx < ids.length - 1) {
        const newIds = [...ids];
        [newIds[idx], newIds[idx + 1]] = [newIds[idx + 1], newIds[idx]];
        setCategories((prev) => {
          const newCats = [...prev];
          [newCats[idx], newCats[idx + 1]] = [newCats[idx + 1], newCats[idx]];
          return newCats;
        });
        await actions.moveCategoryDown(sheet.id, categoryId, ids);
      }
    },
    [sheet, categories]
  );

  const handleUpdateCategory = useCallback(
    async (categoryId: string, data: { name?: string; color?: string }) => {
      if (!sheet) return;
      setCategories((prev) =>
        prev.map((c) => (c.id === categoryId ? { ...c, ...data } : c))
      );
      await actions.editCategory(sheet.id, categoryId, data);
    },
    [sheet]
  );

  const handleDeleteCategory = useCallback(
    async (categoryId: string) => {
      if (!sheet) return;
      setCategories((prev) => prev.filter((c) => c.id !== categoryId));
      await actions.removeCategory(sheet.id, categoryId);
      toast.success('Category deleted');
    },
    [sheet]
  );

  const handleAddProblem = useCallback(
    async (
      categoryId: string,
      data: {
        name: string;
        difficulty: string;
        lc_url: string;
        yt_url: string;
        resource_url?: string;
        notes: string;
      }
    ) => {
      if (!sheet) return;
      try {
        const problem = await actions.addProblem(sheet.id, categoryId, data);
        setCategories((prev) =>
          prev.map((c) =>
            c.id === categoryId
              ? { ...c, problems: [...c.problems, problem] }
              : c
          )
        );
        toast.success('Problem added');
      } catch {
        toast.error('Failed to add problem');
      }
    },
    [sheet]
  );

  const handleUpdateProblem = useCallback(
    async (
      problemId: string,
      data: Partial<{
        name: string;
        difficulty: string;
        lc_url: string;
        yt_url: string;
        resource_url: string;
        notes: string;
      }>
    ) => {
      if (!sheet) return;
      setCategories((prev) =>
        prev.map((c) => ({
          ...c,
          problems: c.problems.map((p) =>
            p.id === problemId
              ? { ...p, ...data, difficulty: (data.difficulty || p.difficulty) as 'Easy' | 'Medium' | 'Hard' }
              : p
          ),
        }))
      );
      await actions.editProblem(sheet.id, problemId, data);
    },
    [sheet]
  );

  const handleDeleteProblem = useCallback(
    async (problemId: string, categoryId: string) => {
      if (!sheet) return;
      setCategories((prev) =>
        prev.map((c) =>
          c.id === categoryId
            ? { ...c, problems: c.problems.filter((p) => p.id !== problemId) }
            : c
        )
      );
      await actions.removeProblem(sheet.id, problemId);
      toast.success('Problem deleted');
    },
    [sheet]
  );

  const handleReorderProblem = useCallback(
    async (
      problemId: string,
      categoryId: string,
      direction: 'up' | 'down'
    ) => {
      if (!sheet) return;
      const cat = categories.find((c) => c.id === categoryId);
      if (!cat) return;
      const ids = cat.problems.map((p) => p.id);
      const idx = ids.indexOf(problemId);

      if (direction === 'up' && idx > 0) {
        const newIds = [...ids];
        [newIds[idx - 1], newIds[idx]] = [newIds[idx], newIds[idx - 1]];
        setCategories((prev) =>
          prev.map((c) => {
            if (c.id !== categoryId) return c;
            const newProblems = [...c.problems];
            [newProblems[idx - 1], newProblems[idx]] = [
              newProblems[idx],
              newProblems[idx - 1],
            ];
            return { ...c, problems: newProblems };
          })
        );
        await actions.moveProblemUp(sheet.id, problemId, categoryId, ids);
      } else if (direction === 'down' && idx < ids.length - 1) {
        const newIds = [...ids];
        [newIds[idx], newIds[idx + 1]] = [newIds[idx + 1], newIds[idx]];
        setCategories((prev) =>
          prev.map((c) => {
            if (c.id !== categoryId) return c;
            const newProblems = [...c.problems];
            [newProblems[idx], newProblems[idx + 1]] = [
              newProblems[idx + 1],
              newProblems[idx],
            ];
            return { ...c, problems: newProblems };
          })
        );
        await actions.moveProblemDown(sheet.id, problemId, categoryId, ids);
      }
    },
    [sheet, categories]
  );

  const handleImportComplete = useCallback(
    async (result: { imported: number; duplicates: number; categoriesCreated: number; resourcesImported?: number; resourcesSkipped?: number }) => {
      toast.success(
        `Imported ${result.imported} problems` +
          (result.duplicates > 0 ? ` (${result.duplicates} duplicates skipped)` : '') +
          (result.categoriesCreated > 0 ? `, ${result.categoriesCreated} new categories created` : '') +
          ((result.resourcesImported ?? 0) > 0 ? `, ${result.resourcesImported} resources added` : '')
      );
      onRefresh();
    },
    [onRefresh]
  );

  if (!sheet) {
    return (
      <div className="space-y-6">
        <Card className="p-12 text-center space-y-4 border border-primary/15 bg-primary/[0.03]">
          <div className="rounded-xl bg-primary/10 p-4 w-fit mx-auto">
            <Plus className="size-8 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">No DSA Sheet yet</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
              Create a global DSA Pattern Sheet to track student problem-solving progress across all colleges.
            </p>
          </div>
          <Button onClick={handleCreateSheet} disabled={creating} className="gap-2">
            {creating ? (
              <div className="size-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
            ) : (
              <Plus className="size-4" />
            )}
            Create DSA Sheet
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <DsaIntroEditor
        sheetId={sheet.id}
        initialMarkdown={sheet.description_md}
      />

      <DsaSheetResourcesEditor
        sheetId={sheet.id}
        initialResources={sheet.resources}
        onRefresh={onRefresh}
      />

      <DsaSpreadsheetImport sheetId={sheet.id} onImportComplete={handleImportComplete} />

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-lg font-semibold text-foreground">
              Categories ({categoryCount})
            </h2>
            <span className="text-sm text-muted-foreground">
              · {totalProblems} {totalProblems === 1 ? 'problem' : 'problems'} total
            </span>
            {hasDraft && (
              <span className="inline-flex items-center gap-1 text-xs text-amber-600 font-medium">
                <span className="size-1.5 rounded-full bg-amber-500" />
                draft
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {sheet && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  exportSheetToExcel(sheet);
                  toast.success(`Exported "${sheet.title}" to Excel`);
                }}
                className="gap-2 border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-600 hover:text-white text-emerald-600 dark:text-emerald-400 font-semibold"
              >
                <FileSpreadsheet className="size-4" />
                Download Excel
              </Button>
            )}
            <Button
              size="sm"
              onClick={() => setShowAddCategory(true)}
              className="gap-2"
            >
              <Plus className="size-4" />
              Add Category
            </Button>
          </div>
        </div>

        {categoryCount === 0 ? (
          <Card className="p-8 text-center border border-dashed border-primary/15 bg-primary/[0.02]">
            <p className="text-muted-foreground text-sm">
              No categories yet. Add your first category or import from a spreadsheet.
            </p>
          </Card>
        ) : (
          <Card className="border border-border/50 shadow-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-primary/[0.04] hover:bg-primary/[0.04]">
                  <TableHead className="w-[100px] pl-5 font-semibold text-foreground">Order</TableHead>
                  <TableHead className="font-semibold text-foreground">Category</TableHead>
                  <TableHead className="w-[120px] font-semibold text-foreground">Problems</TableHead>
                  <TableHead className="w-[300px] font-semibold text-foreground">Difficulty Breakdown</TableHead>
                  <TableHead className="w-[200px] text-right pr-5 font-semibold text-foreground">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.map((category, index) => (
                  <DsaCategoryCard
                    key={category.id}
                    category={category}
                    index={index}
                    totalCategories={categoryCount}
                    onReorder={handleReorderCategory}
                    onUpdate={handleUpdateCategory}
                    onDelete={handleDeleteCategory}
                    onAddProblem={handleAddProblem}
                    onUpdateProblem={handleUpdateProblem}
                    onDeleteProblem={handleDeleteProblem}
                    onReorderProblem={handleReorderProblem}
                  />
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>

      <DsaAddCategoryDialog
        open={showAddCategory}
        onOpenChange={setShowAddCategory}
        onAdd={handleAddCategory}
      />
    </div>
  );
}
