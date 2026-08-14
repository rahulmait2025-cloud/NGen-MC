'use client';

import React, { useState, useEffect, useTransition, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Plus,
  Search,
  BookOpen,
  Users,
  ChevronRight,
  FileCode,
  Trash2,
  FileSpreadsheet,
} from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import * as actions from '../actions';
import { exportSheetToExcel } from '@/lib/utils/dsa-excel-export';

const MARKDOWN_STRIP_RE = /[#*`_ -]/g;

interface SheetItem {
  id: string;
  title: string;
  description_md: string;
  is_active: boolean;
  student_count: number;
  category_count: number;
  problem_count: number;
  created_at: string;
}

interface Props {
  initialSheets: SheetItem[];
  initialReadme: string;
}

export function DsaSheetsListClient({ initialSheets, initialReadme }: Props) {
  const [sheets, setSheets] = useState<SheetItem[]>(initialSheets);
  const [readme, setReadme] = useState(initialReadme);
  const [isEditingReadme, setIsEditingReadme] = useState(false);
  const [isSavingReadme, setIsSavingReadme] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const handleDownloadExcel = useCallback(async (sheetId: string, sheetTitle: string) => {
    setDownloadingId(sheetId);
    try {
      const fullData = await actions.fetchSheetData(sheetId);
      if (!fullData) {
        toast.error('Sheet data not found');
        return;
      }
      exportSheetToExcel(fullData);
      toast.success(`Exported "${sheetTitle}" to Excel`);
    } catch (err) {
      toast.error(`Failed to export sheet: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setDownloadingId(null);
    }
  }, []);
  const [newTitle, setNewTitle] = useState('');
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  useEffect(() => {
    setSheets(initialSheets);
  }, [initialSheets]);

  useEffect(() => {
    setReadme(initialReadme);
  }, [initialReadme]);

  const handleSaveReadme = useCallback(async () => {
    setIsSavingReadme(true);
    try {
      await actions.saveDsaReadmeMarkdown(readme);
      toast.success('LMS Banner readme saved successfully!');
      setIsEditingReadme(false);
      router.refresh();
    } catch (_err) {
      toast.error('Failed to save banner readme');
    } finally {
      setIsSavingReadme(false);
    }
  }, [readme, router]);

  const filteredSheets = useMemo(() => sheets.filter((sheet) =>
    sheet.title.toLowerCase().includes(searchQuery.toLowerCase())
  ), [sheets, searchQuery]);

  const handleCreate = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    startTransition(async () => {
      try {
        const newSheet = await actions.createSheet(newTitle.trim());
        toast.success(`DSA Sheet "${newTitle}" created successfully!`);
        setDialogOpen(false);
        setNewTitle('');
        router.push(`/sheets/${newSheet.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}`);
      } catch (_err) {
        toast.error('Failed to create sheet');
      }
    });
  }, [newTitle, router]);

  const handleDelete = useCallback((sheetId: string) => {
    startTransition(async () => {
      try {
        await actions.deleteSheet(sheetId);
        setSheets((prev) => prev.filter((s) => s.id !== sheetId));
        toast.success('DSA Sheet deleted successfully');
        router.refresh();
      } catch (_err) {
        toast.error('Failed to delete DSA sheet');
      }
    });
  }, [router]);

  const handleToggleActive = useCallback((sheetId: string, currentStatus: boolean) => {
    const nextStatus = !currentStatus;
    setSheets((prev) =>
      prev.map((s) => (s.id === sheetId ? { ...s, is_active: nextStatus } : s))
    );
    startTransition(async () => {
      try {
        await actions.toggleSheetActive(sheetId, nextStatus);
        toast.success(`Sheet status updated to ${nextStatus ? 'Published' : 'Draft'}`);
      } catch (_err) {
        setSheets((prev) =>
          prev.map((s) => (s.id === sheetId ? { ...s, is_active: currentStatus } : s))
        );
        toast.error('Failed to update sheet status');
      }
    });
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">DSA Practice Sheets</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Create, manage and track problem-solving sheets for student placement preparation
          </p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 shrink-0">
              <Plus className="size-4" />
              Create New Sheet
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <form onSubmit={handleCreate}>
              <DialogHeader>
                <DialogTitle>Create DSA Sheet</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="title">Sheet Title</Label>
                  <Input
                    id="title"
                    placeholder="e.g., C Language Sheet, Java Programming Sheet"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    required
                    disabled={isPending}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={isPending}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isPending}>
                  {isPending ? 'Creating...' : 'Create Sheet'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Readme Configuration Panel */}
      <Card className="border-border/50 bg-card overflow-hidden shadow-xs">
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Custom LMS Banner (Markdown/README)</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Customize the landing page hero banner displayed to students in LMS.</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditingReadme(!isEditingReadme)}
            >
              {isEditingReadme ? 'Hide Editor' : 'Edit Banner'}
            </Button>
          </div>

          {isEditingReadme && (
            <div className="space-y-3 pt-2 border-t border-border/30">
              <Textarea
                value={readme}
                onChange={(e) => setReadme(e.target.value)}
                placeholder="# Placement Practice Sheets&#10;&#10;Curated DSA tracks, college-certified. Solve patterns, track progress, and ace your placements."
                rows={8}
                className="font-mono text-sm border-border focus-visible:ring-primary focus-visible:border-primary"
              />
              <div className="flex items-center justify-between pt-1">
                <p className="text-[11px] text-muted-foreground">
                  {"Supports headers, lists, links, alerts (e.g. `> [!NOTE]`), and standard markdown."}
                </p>
                <Button
                  onClick={handleSaveReadme}
                  disabled={isSavingReadme}
                  size="sm"
                  className="gap-1.5"
                >
                  {isSavingReadme ? 'Saving...' : 'Save Banner'}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          placeholder="Search sheets..."
          className="pl-9 bg-card border-border/50 focus-visible:ring-primary shadow-sm"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredSheets.map((sheet) => (
          <Card key={sheet.id} className="group relative flex flex-col h-full bg-card border-border/50 hover:border-primary/30 card-tier-1 card-hover-lift transition-[box-shadow,border-color] duration-200 overflow-hidden">
            <CardContent className="p-5 flex flex-col h-full">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold transition-colors line-clamp-1 group-hover:text-primary">
                    {sheet.title}
                  </h3>
                  <p className="text-sm text-muted-foreground line-clamp-2 mt-1 min-h-[40px]">
                    {sheet.description_md ? sheet.description_md.replace(MARKDOWN_STRIP_RE, '').slice(0, 100) : 'No description provided.'}
                  </p>
                </div>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 shrink-0"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete DSA Sheet?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete &quot;{sheet.title}&quot;? This will permanently delete all categories, problems, student enrollments, and progress associated with this sheet. This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleDelete(sheet.id)}
                        className="bg-red-600 hover:bg-red-700 focus:ring-red-600 text-white"
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>

              <div className="grid grid-cols-3 gap-1.5 sm:gap-2 mt-auto pt-4 border-t border-border/50">
                <div className="flex flex-col items-center p-2 rounded-lg bg-primary/5 group-hover:bg-primary/10 transition-colors">
                  <FileCode className="size-4 text-primary/60 mb-1" />
                  <span className="text-sm font-semibold">{sheet.category_count}</span>
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Categories</span>
                </div>
                <div className="flex flex-col items-center p-2 rounded-lg bg-primary/5 group-hover:bg-primary/10 transition-colors">
                  <BookOpen className="size-4 text-primary/60 mb-1" />
                  <span className="text-sm font-semibold">{sheet.problem_count}</span>
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Problems</span>
                </div>
                <div className="flex flex-col items-center p-2 rounded-lg bg-primary/5 group-hover:bg-primary/10 transition-colors">
                  <Users className="size-4 text-primary/60 mb-1" />
                  <span className="text-sm font-semibold">{sheet.student_count}</span>
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Enrolled</span>
                </div>
              </div>

              <div className="flex flex-col gap-2.5 mt-4 pt-3 border-t border-border/50">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Switch
                      id={`active-${sheet.id}`}
                      checked={sheet.is_active}
                      onCheckedChange={() => handleToggleActive(sheet.id, sheet.is_active)}
                      disabled={isPending}
                    />
                    <Label htmlFor={`active-${sheet.id}`} className="text-xs font-semibold cursor-pointer select-none">
                      {sheet.is_active ? 'Published' : 'Draft'}
                    </Label>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownloadExcel(sheet.id, sheet.title)}
                    disabled={downloadingId === sheet.id}
                    title="Download Sheet in Excel Format"
                    className="group/btn h-8 px-2.5 border-emerald-500/30 bg-emerald-500/10 hover:!bg-emerald-600 hover:!text-white hover:!border-emerald-600 text-emerald-600 dark:text-emerald-400 gap-1.5 transition-all duration-200"
                  >
                    {downloadingId === sheet.id ? (
                      <div className="size-3.5 border-2 border-emerald-600/30 border-t-emerald-600 rounded-full animate-spin" />
                    ) : (
                      <FileSpreadsheet className="size-3.5 group-hover/btn:scale-110 transition-transform" />
                    )}
                    <span className="text-xs font-semibold">Download Excel</span>
                  </Button>
                </div>

                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="w-full h-9 group/btn text-foreground border-primary/30 bg-primary/5 hover:!bg-primary hover:!text-primary-foreground hover:!border-primary transition-all duration-200"
                >
                  <Link href={`/sheets/${sheet.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}`}>
                    Manage Sheet
                    <ChevronRight className="size-4 ml-1 group-hover/btn:translate-x-1 transition-transform" />
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}

        <button
          onClick={() => setDialogOpen(true)}
          className="w-full h-full min-h-[220px] flex flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed border-primary/20 hover:border-primary/40 hover:bg-primary/5 transition-[border-color,background-color] duration-200 group card-tier-1"
        >
          <div className="p-4 rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors">
            <Plus className="size-8 text-primary [@media(hover:hover)_and_(pointer:fine)]:group-hover:scale-110 transition-transform ease-[var(--ease-out)]" />
          </div>
          <div className="text-center px-6">
            <span className="block font-semibold text-lg text-foreground group-hover:text-primary transition-colors">Create New Sheet</span>
            <p className="text-xs text-muted-foreground mt-1">Add a new distinct DSA practice sheet</p>
          </div>
        </button>
      </div>

      {filteredSheets.length === 0 && searchQuery ? (
        <div className="text-center py-20 border-2 border-dashed rounded-xl">
          <p className="text-muted-foreground">No sheets found matching &quot;{searchQuery}&quot;</p>
          <Button variant="link" onClick={() => setSearchQuery('')} className="text-violet-600">
            Clear Search
          </Button>
        </div>
      ) : null}
    </div>
  );
}
