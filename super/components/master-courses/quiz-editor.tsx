'use client';

import { useState, useEffect, useCallback } from 'react';
import { ReactLenis } from 'lenis/react';
import { toast } from 'sonner';
import {
  ChevronUp,
  ChevronDown,
  Trash2,
  Plus,
  Loader2,
  Check,
  X,
  Copy,
  FileUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getQuizForItem, saveQuiz, deleteQuiz } from '@/app/(app)/master-courses/[courseId]/quiz-actions';
import type { QuizData } from '@/app/(app)/master-courses/[courseId]/quiz-actions';
import { createItemAction } from '@/app/(app)/master-courses/[courseId]/structure-actions';
import type { MasterCourseItemsRow } from '@/types/database';
import {
  QuizImportDialog,
  type QuizImportDialogResult,
} from '@/components/master-courses/quiz-import-dialog';

interface QuizEditorProps {
  /** Existing course item id when editing; null when creating a new quiz. */
  itemId: string | null;
  moduleId: string;
  masterCourseId: string;
  courseTitle: string;
  onClose: () => void;
  moduleItems?: MasterCourseItemsRow[];
}

type DraftOption = { id?: string; text: string; is_correct: boolean };
type DraftQuestion = {
  id?: string;
  text: string;
  explanation: string;
  type: 'single_choice' | 'multiple_choice' | 'true_false';
  points: number;
  options: DraftOption[];
};

const newOption = (): DraftOption => ({ text: '', is_correct: false });
const newQuestion = (): DraftQuestion => ({
  text: '',
  explanation: '',
  type: 'single_choice',
  points: 1,
  options: [newOption(), newOption(), newOption(), newOption()],
});

function isCompletelyBlankQuestion(q: DraftQuestion): boolean {
  return (
    !q.text.trim() &&
    !q.explanation.trim() &&
    q.points === 1 &&
    q.options.every((o) => !o.text.trim() && !o.is_correct)
  );
}

function isCompletelyBlankStarter(questions: DraftQuestion[]): boolean {
  return questions.length === 1 && isCompletelyBlankQuestion(questions[0]);
}

export function QuizEditor({ itemId, moduleId, masterCourseId, courseTitle, onClose, moduleItems }: QuizEditorProps) {
  const [loading, setLoading] = useState(Boolean(itemId));
  const [saving, setSaving] = useState(false);
  const [quizTitle, setQuizTitle] = useState('');
  const [quizDescription, setQuizDescription] = useState('');
  const [timeLimitMinutes, setTimeLimitMinutes] = useState<number | ''>('');
  const [passingScore, setPassingScore] = useState<number | ''>('');
  const [shuffleQuestions, setShuffleQuestions] = useState(true);
  const [shuffleOptions, setShuffleOptions] = useState(true);
  const [showCorrectAnswers, setShowCorrectAnswers] = useState(true);
  const [quizStatus, setQuizStatus] = useState<'draft' | 'published'>('published');
  const [quizPosition, setQuizPosition] = useState<'end' | 'start' | 'custom' | 'after_video'>('end');
  const [customSortOrder, setCustomSortOrder] = useState<number>(0);
  const [afterVideoId, setAfterVideoId] = useState<string>('');
  const [questions, setQuestions] = useState<DraftQuestion[]>([newQuestion()]);
  const [originalQuiz, setOriginalQuiz] = useState<QuizData | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  const isCreateMode = !itemId;
  const currentItem = itemId ? moduleItems?.find((i) => i.id === itemId) : undefined;

  // Load existing position settings
  useEffect(() => {
    if (!currentItem || !moduleItems) return;

    const metadata = currentItem.metadata ?? {};
    const linkedVideoId =
      typeof metadata.linked_video_id === 'string' ? metadata.linked_video_id : undefined;

    if (linkedVideoId) {
      setQuizPosition('after_video');
      setAfterVideoId(linkedVideoId);
    } else {
      const sort = currentItem.sort_order;
      if (sort === 999999) {
        setQuizPosition('end');
      } else if (sort === -1) {
        setQuizPosition('start');
      } else {
        const videos = moduleItems.filter((i) => i.item_type === 'video');
        let bestVideo: typeof currentItem | null = null;
        for (const v of videos) {
          if (v.sort_order < sort) {
            if (!bestVideo || v.sort_order > bestVideo.sort_order) {
              bestVideo = v;
            }
          }
        }
        if (bestVideo && sort - bestVideo.sort_order < 10) {
          setQuizPosition('after_video');
          setAfterVideoId(bestVideo.id);
        } else {
          setQuizPosition('custom');
          setCustomSortOrder(sort);
        }
      }
    }
  }, [currentItem, moduleItems]);

  // Load existing quiz (edit mode only)
  useEffect(() => {
    if (!itemId) {
      setLoading(false);
      return;
    }

    let mounted = true;
    (async () => {
      const res = await getQuizForItem(itemId);
      if (!mounted) return;
      if (res.ok && res.data) {
        setOriginalQuiz(res.data);
        const q = res.data;
        setQuizTitle(q.title);
        setQuizDescription(q.description ?? '');
        setTimeLimitMinutes(q.time_limit_minutes ?? '');
        setPassingScore(q.passing_percentage ?? '');
        setShuffleQuestions(q.shuffle_questions);
        setShuffleOptions(q.shuffle_options);
        setShowCorrectAnswers(q.show_correct_answers);
        setQuizStatus(q.publish_status as 'draft' | 'published');
        if (q.questions.length) {
          setQuestions(
            q.questions.map((question) => ({
              id: question.id,
              text: question.question_text,
              explanation: question.explanation ?? '',
              type: question.question_type,
              points: question.points,
              options: question.options.map((opt) => ({
                id: opt.id,
                text: opt.option_text,
                is_correct: opt.is_correct,
              })),
            })),
          );
        }
      }
      setLoading(false);
    })();
    return () => { mounted = false; };
  }, [itemId]);

  // ─── Question CRUD ────────────────────────────────────────────────────────

  const addQuestion = useCallback(() => {
    for (let i = 0; i < questions.length; i++) {
      const hasCorrect = questions[i].options.some((o) => o.is_correct);
      if (!hasCorrect) {
        toast.error(`Please select a correct answer for Question ${i + 1} before adding a new one.`);
        return;
      }
      if (!questions[i].explanation.trim()) {
        toast.error(`Please add an answer explanation for Question ${i + 1} before adding a new one.`);
        return;
      }
    }
    setQuestions((prev) => [...prev, newQuestion()]);
  }, [questions]);

  const removeQuestion = useCallback((index: number) => {
    setQuestions((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const moveQuestion = useCallback((index: number, dir: 'up' | 'down') => {
    setQuestions((prev) => {
      const arr = [...prev];
      const target = dir === 'up' ? index - 1 : index + 1;
      if (target < 0 || target >= arr.length) return prev;
      [arr[index], arr[target]] = [arr[target], arr[index]];
      return arr;
    });
  }, []);

  const duplicateQuestion = useCallback((index: number) => {
    setQuestions((prev) => {
      const q = prev[index];
      return [
        ...prev.slice(0, index + 1),
        {
          text: q.text,
          explanation: q.explanation,
          type: q.type,
          points: q.points,
          options: q.options.map((o) => ({ text: o.text, is_correct: o.is_correct })),
        },
        ...prev.slice(index + 1),
      ];
    });
  }, []);

  // ─── Option CRUD ──────────────────────────────────────────────────────────

  const updateQuestion = useCallback((qi: number, patch: Partial<DraftQuestion>) => {
    setQuestions((prev) => prev.map((q, i) => {
      if (i !== qi) return q;
      const updated = { ...q, ...patch };
      // If type changed to true_false, enforce exactly 2 options: True/False
      if (patch.type === 'true_false' && q.type !== 'true_false') {
        updated.options = [
          { text: 'True', is_correct: true },
          { text: 'False', is_correct: false },
        ];
      }
      return updated;
    }));
  }, []);

  const updateOption = useCallback((qi: number, oi: number, patch: Partial<DraftOption>) => {
    setQuestions((prev) =>
      prev.map((q, i) =>
        i === qi
          ? { ...q, options: q.options.map((o, j) => (j === oi ? { ...o, ...patch } : o)) }
          : q,
      ),
    );
  }, []);

  const addOption = useCallback((qi: number) => {
    setQuestions((prev) =>
      prev.map((q, i) => (i === qi ? { ...q, options: [...q.options, newOption()] } : q)),
    );
  }, []);

  const removeOption = useCallback((qi: number, oi: number) => {
    setQuestions((prev) =>
      prev.map((q, i) =>
        i === qi ? { ...q, options: q.options.filter((_, j) => j !== oi) } : q,
      ),
    );
  }, []);

  // ─── Import ───────────────────────────────────────────────────────────────

  const applyImportResult = useCallback((result: QuizImportDialogResult) => {
    const incoming = result.questions.map((q) => ({
      text: q.text,
      explanation: q.explanation,
      type: q.type,
      points: q.points,
      options: q.options.map((o) => ({ text: o.text, is_correct: o.is_correct })),
    }));

    setQuestions((prev) => {
      if (result.mode === 'replace') {
        if (isCompletelyBlankStarter(prev)) {
          return incoming;
        }
        return incoming;
      }
      // append: keep existing then add imported
      const base = isCompletelyBlankStarter(prev) ? [] : prev;
      return [...base, ...incoming];
    });

    if (result.mode === 'append') {
      const total = (isCompletelyBlankStarter(questions) ? 0 : questions.length) + result.applied;
      toast.success(`${result.applied} questions imported. This quiz now contains ${total} questions.`);
    } else {
      toast.success(`${result.applied} questions imported into this quiz. Review them and click Save Changes to persist.`);
    }
  }, [questions]);

  const moveOption = useCallback((qi: number, oi: number, dir: 'up' | 'down') => {
    setQuestions((prev) =>
      prev.map((q, i) => {
        if (i !== qi) return q;
        const arr = [...q.options];
        const target = dir === 'up' ? oi - 1 : oi + 1;
        if (target < 0 || target >= arr.length) return q;
        [arr[oi], arr[target]] = [arr[target], arr[oi]];
        return { ...q, options: arr };
      }),
    );
  }, []);

  // ─── Save ─────────────────────────────────────────────────────────────────

  const handleSave = useCallback(async () => {
    if (!quizTitle.trim()) {
      toast.error('Quiz title is required');
      return;
    }
    if (questions.length === 0) {
      toast.error('Add at least one question');
      return;
    }
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.text.trim()) {
        toast.error(`Question ${i + 1} text is empty`);
        return;
      }
      if (q.type === 'true_false') {
        if (q.options.length !== 2) {
          toast.error(`Question ${i + 1}: true/false must have exactly 2 options`);
          return;
        }
      } else if (q.options.length < 2) {
        toast.error(`Question ${i + 1} needs at least 2 options`);
        return;
      }
      if (!q.options.some((o) => o.is_correct)) {
        toast.error(`Question ${i + 1} has no correct answer marked`);
        return;
      }
      if (q.options.some((o) => !o.text.trim())) {
        toast.error(`Question ${i + 1} has empty options`);
        return;
      }
      if (!q.explanation.trim()) {
        toast.error(`Question ${i + 1} needs an answer explanation`);
        return;
      }
    }

    setSaving(true);
    try {
      // Calculate sort_order based on position selection
      let sortOrder: number | null = null;
      if (quizPosition === 'end') {
        sortOrder = 999999;
      } else if (quizPosition === 'start') {
        sortOrder = -1;
      } else if (quizPosition === 'after_video') {
        const targetVideo = moduleItems?.find((v) => v.id === afterVideoId);
        if (targetVideo) {
          sortOrder = targetVideo.sort_order + 5;
        } else {
          sortOrder = 999999;
        }
      } else if (quizPosition === 'custom') {
        sortOrder = customSortOrder;
      }

      // Create the course item only when the admin confirms Create Quiz
      let resolvedItemId = itemId;
      if (!resolvedItemId) {
        const fd = new FormData();
        fd.append('master_course_id', masterCourseId);
        fd.append('module_id', moduleId);
        fd.append('title', quizTitle.trim());
        fd.append('item_type', 'quiz_placeholder');
        if (sortOrder != null) {
          fd.append('sort_order', String(sortOrder));
        }
        const createRes = await createItemAction(fd);
        if (!createRes.ok || !createRes.id) {
          toast.error(createRes.error || 'Failed to create quiz');
          return;
        }
        resolvedItemId = createRes.id;
      }

      const res = await saveQuiz({
        itemId: resolvedItemId,
        masterCourseId,
        title: quizTitle.trim(),
        description: quizDescription.trim() || undefined,
        timeLimitMinutes: timeLimitMinutes === '' ? null : Number(timeLimitMinutes),
        passingScore: passingScore === '' ? null : Number(passingScore),
        shuffleQuestions,
        shuffleOptions,
        showCorrectAnswers,
        sort_order: sortOrder,
        status: quizStatus,
        linkedVideoId: quizPosition === 'after_video' ? afterVideoId : null,
        questions: questions.map((q) => ({
          id: q.id,
          text: q.text.trim(),
          type: q.type,
          points: q.points,
          explanation: q.explanation.trim() || undefined,
          options: q.options.map((o) => ({
            id: o.id,
            text: o.text.trim(),
            is_correct: o.is_correct,
          })),
        })),
      });
      if (res.ok) {
        if (isCreateMode) {
          toast.success('New quiz created');
        } else if (res.data?.versioned) {
          toast.success(`This quiz had submitted attempts, so a new version was created with ${questions.length} questions and ${questions.reduce((acc, q) => acc + q.options.length, 0)} options.`);
        } else {
          toast.success(`Quiz saved with ${questions.length} questions and ${questions.reduce((acc, q) => acc + q.options.length, 0)} options.`);
        }
        onClose();
      } else {
        toast.error(res.error || 'Failed to save quiz');
      }
    } catch {
      toast.error('Failed to save quiz');
    } finally {
      setSaving(false);
    }
  }, [quizTitle, questions, quizPosition, moduleItems, afterVideoId, customSortOrder, itemId, moduleId, masterCourseId, quizDescription, timeLimitMinutes, passingScore, shuffleQuestions, shuffleOptions, showCorrectAnswers, quizStatus, isCreateMode, onClose]);

  // ─── Delete ───────────────────────────────────────────────────────────────

  const handleDelete = useCallback(async () => {
    if (!itemId) return;
    setSaving(true);
    try {
      const res = await deleteQuiz(itemId);
      if (res.ok) {
        toast.success('Quiz deleted');
        onClose();
      } else {
        toast.error(res.error || 'Failed to delete quiz');
      }
    } catch {
      toast.error('Failed to delete quiz');
    } finally {
      setSaving(false);
      setConfirmDelete(false);
    }
  }, [itemId, onClose]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Loading quiz...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 h-full w-full bg-background rounded-lg overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border/60 flex items-center justify-between shrink-0">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold tracking-tight text-foreground">
            {originalQuiz ? 'Edit Quiz' : 'Create Quiz'}
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5 truncate">{courseTitle}</p>
        </div>
        {originalQuiz ? (
          <Button
            variant="ghost"
            size="icon"
            className="size-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0 ml-4 mr-6"
            onClick={() => setConfirmDelete(true)}
            title="Delete quiz"
          >
            <Trash2 className="size-4" />
          </Button>
        ) : null}
      </div>

      {/* Scrollable Body — nested Lenis (same pattern as sidebar) */}
      <ReactLenis
        data-lenis-prevent
        options={{
          lerp: 0.1,
          duration: 1.2,
          smoothWheel: true,
          allowNestedScroll: true,
        }}
        className="flex-1 min-h-0 overflow-y-auto overscroll-contain"
      >
        <div className="p-6 space-y-6">
        {/* Quiz Settings */}
        <div className="rounded-xl border border-border/50 p-5 space-y-4 bg-muted/5">
          <h3 className="text-sm font-semibold text-foreground">Quiz Settings</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Title *</Label>
              <Input
                value={quizTitle}
                onChange={(e) => setQuizTitle(e.target.value)}
                placeholder="e.g. Module 3 Knowledge Check"
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Passing Score (%)</Label>
              <Input
                type="number"
                min={0}
                max={100}
                value={passingScore}
                onChange={(e) => setPassingScore(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="e.g. 70"
                className="h-9"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Description (optional)</Label>
            <Textarea
              value={quizDescription}
              onChange={(e) => setQuizDescription(e.target.value)}
              placeholder="Instructions for students..."
              rows={2}
              className="resize-none"
            />
          </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Time Limit (minutes)</Label>
            <Input
              type="number"
              min={0}
              value={timeLimitMinutes}
              onChange={(e) => setTimeLimitMinutes(e.target.value === '' ? '' : Number(e.target.value))}
              placeholder="0 = no limit"
              className="h-9"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Position in Module</Label>
            <Select
              value={quizPosition}
              onValueChange={(val: 'end' | 'start' | 'custom' | 'after_video') => setQuizPosition(val)}
            >
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="end">End of module (after videos)</SelectItem>
                <SelectItem value="start">Start of module (before videos)</SelectItem>
                <SelectItem value="after_video">After specific video</SelectItem>
                <SelectItem value="custom">Custom position</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        {quizPosition === 'after_video' ? (
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Select Video</Label>
            <Select
              value={afterVideoId}
              onValueChange={setAfterVideoId}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Choose a video..." />
              </SelectTrigger>
              <SelectContent>
                {moduleItems && moduleItems.filter((i) => i.item_type === 'video').length > 0 ? (
                  moduleItems
                    .filter((i) => i.item_type === 'video')
                    .sort((a, b) => a.sort_order - b.sort_order)
                    .map((video) => (
                      <SelectItem key={video.id} value={video.id}>
                        {video.title}
                      </SelectItem>
                    ))
                ) : (
                  <SelectItem value="_none" disabled>
                    No videos in this module
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
        ) : null}
        {quizPosition === 'custom' ? (
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Sort Order</Label>
            <Input
              type="number"
              min={0}
              value={customSortOrder}
              onChange={(e) => setCustomSortOrder(Number(e.target.value) || 0)}
              placeholder="0"
              className="h-9 w-32"
            />
          </div>
        ) : null}
          <div className="flex flex-wrap gap-x-6 gap-y-3 pt-1">
            <label className="flex items-center gap-2.5 cursor-pointer group">
              <Switch checked={shuffleQuestions} onCheckedChange={setShuffleQuestions} />
              <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">Shuffle question order</span>
            </label>
            <label className="flex items-center gap-2.5 cursor-pointer group">
              <Switch checked={shuffleOptions} onCheckedChange={setShuffleOptions} />
              <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">Shuffle option order</span>
            </label>
            <label className="flex items-center gap-2.5 cursor-pointer group">
              <Switch checked={showCorrectAnswers} onCheckedChange={setShowCorrectAnswers} />
              <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">Show correct answers after submit</span>
            </label>
            <div className="h-4 w-px bg-border" />
            <label className="flex items-center gap-2.5 cursor-pointer group">
              <Switch checked={quizStatus === 'published'} onCheckedChange={(v) => setQuizStatus(v ? 'published' : 'draft')} />
              <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                {quizStatus === 'published' ? 'Published' : 'Draft'}
              </span>
              <Badge variant={quizStatus === 'published' ? 'default' : 'secondary'} className="text-[10px]">
                {quizStatus === 'published' ? 'Visible to students' : 'Hidden from students'}
              </Badge>
            </label>
          </div>
        </div>

        {/* Questions */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">
              Questions
              <Badge variant="secondary" className="ml-2 text-xs tabular-nums">{questions.length}</Badge>
            </h3>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 text-xs font-medium"
              onClick={() => setImportOpen(true)}
              title="Import questions from Excel or CSV"
            >
              <FileUp className="size-3.5 mr-1.5" />
              Import Questions
            </Button>
          </div>

          {questions.map((q, qi) => (
            <div key={qi} className="rounded-xl border border-border/50 bg-card p-5 space-y-4 transition-[box-shadow,border-color] ease-[var(--ease-out)] hover:shadow-[0_4px_12px_oklch(0_0_0/0.03)] hover:border-border/80">
              {/* Question Header */}
              <div className="flex items-start gap-3">
                <div className="flex items-center gap-1 shrink-0 pt-0.5">
                  <div className="flex flex-col">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-5 text-muted-foreground hover:text-foreground"
                      disabled={qi === 0}
                      onClick={() => moveQuestion(qi, 'up')}
                    >
                      <ChevronUp className="size-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-5 text-muted-foreground hover:text-foreground"
                      disabled={qi === questions.length - 1}
                      onClick={() => moveQuestion(qi, 'down')}
                    >
                      <ChevronDown className="size-3.5" />
                    </Button>
                  </div>
                  <Badge variant="outline" className="text-[11px] font-semibold tabular-nums px-1.5 py-0">
                    Q{qi + 1}
                  </Badge>
                </div>

                <div className="flex-1 min-w-0 space-y-3">
                  <div className="flex items-center gap-2">
                    <Input
                      value={q.text}
                      onChange={(e) => updateQuestion(qi, { text: e.target.value })}
                      placeholder={`Question ${qi + 1}`}
                      className="font-medium h-9"
                    />
                    <div className="w-24 shrink-0 flex items-center gap-1 rounded-md border border-input px-2.5 bg-background focus-within:ring-1 focus-within:ring-ring focus-within:border-ring">
                      <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider select-none">Pts</span>
                      <Input
                        type="number"
                        min={0.5}
                        step={0.5}
                        value={q.points}
                        onChange={(e) =>
                          updateQuestion(qi, { points: Number(e.target.value) || 1 })
                        }
                        className="text-right text-xs h-8 p-0 border-0 focus-visible:ring-0 focus-visible:ring-offset-0 tabular-nums font-semibold bg-transparent"
                        title="Points"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">Answer Explanation</Label>
                    <Textarea
                      value={q.explanation}
                      onChange={(e) => updateQuestion(qi, { explanation: e.target.value })}
                      placeholder="Explain why this is the correct answer (shown to students after submission)"
                      className="text-sm min-h-[60px] resize-y"
                    />
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Select
                      value={q.type}
                      onValueChange={(val: 'single_choice' | 'multiple_choice' | 'true_false') =>
                        updateQuestion(qi, { type: val })
                      }
                    >
                      <SelectTrigger className="w-[160px] h-8 text-xs font-medium">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="single_choice">Single Choice</SelectItem>
                        <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
                        <SelectItem value="true_false">True / False</SelectItem>
                      </SelectContent>
                    </Select>
                    <span className="text-xs text-muted-foreground font-medium">
                      {q.type === 'true_false'
                        ? 'Exactly one correct answer'
                        : q.type === 'single_choice'
                          ? 'One correct answer'
                          : 'Multiple correct answers'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-0.5 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7 text-muted-foreground hover:text-foreground"
                    onClick={() => duplicateQuestion(qi)}
                    title="Duplicate question"
                  >
                    <Copy className="size-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    disabled={questions.length <= 1}
                    onClick={() => removeQuestion(qi)}
                    title="Delete question"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>

              {/* Options */}
              <div className="pl-9 space-y-2">
                {q.options.map((opt, oi) => (
                  <div key={oi} className="flex items-center gap-3 group/py">
                    <div className="flex items-center shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-4 opacity-0 group-hover/py:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
                        disabled={oi === 0}
                        onClick={() => moveOption(qi, oi, 'up')}
                      >
                        <ChevronUp className="size-2.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-4 opacity-0 group-hover/py:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
                        disabled={oi === q.options.length - 1}
                        onClick={() => moveOption(qi, oi, 'down')}
                      >
                        <ChevronDown className="size-2.5" />
                      </Button>
                    </div>

                    {q.type === 'single_choice' || q.type === 'true_false' ? (
                      <RadioGroup
                        value={q.options.findIndex((o) => o.is_correct)?.toString() ?? ''}
                        onValueChange={(val) =>
                          updateQuestion(qi, {
                            options: q.options.map((o, j) => ({
                              ...o,
                              is_correct: j === Number(val),
                            })),
                          })
                        }
                      >
                        <div className="flex items-center">
                          <RadioGroupItem className="border-zinc-400 dark:border-zinc-600" value={oi.toString()} id={`q${qi}o${oi}`} />
                        </div>
                      </RadioGroup>
                    ) : (
                      <Checkbox
                        className="border-zinc-400 dark:border-zinc-600"
                        checked={opt.is_correct}
                        onCheckedChange={(checked) => updateOption(qi, oi, { is_correct: !!checked })}
                      />
                    )}

                    <Input
                      value={opt.text}
                      onChange={(e) => updateOption(qi, oi, { text: e.target.value })}
                      placeholder={`Option ${oi + 1}`}
                      className="flex-1 h-8 text-sm"
                    />

                    {opt.is_correct ? (
                      <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-500/30 text-[10px] font-semibold shrink-0 px-1.5 py-0.5 dark:text-emerald-400 dark:border-emerald-500/20 dark:bg-emerald-500/10">
                        <Check className="size-3 mr-0.5" /> Correct
                      </Badge>
                    ) : null}

                    {q.options.length > 2 ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-6 opacity-0 group-hover/py:opacity-100 transition-opacity text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        onClick={() => removeOption(qi, oi)}
                        title="Remove option"
                      >
                        <X className="size-3" />
                      </Button>
                    ) : null}
                  </div>
                ))}

                {q.type !== 'true_false' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-muted-foreground hover:text-foreground mt-1 h-7 font-medium"
                    onClick={() => addOption(qi)}
                  >
                    <Plus className="size-3.5 mr-1" /> Add Option
                  </Button>
                )}
              </div>
            </div>
          ))}

          <Button variant="outline" size="sm" className="w-full h-9 font-medium" onClick={addQuestion}>
            <Plus className="size-4 mr-2" /> Add Question
          </Button>
        </div>
        </div>
      </ReactLenis>

      {/* Save / Sticky Footer */}
      <div className="px-6 py-4 border-t border-border/60 flex justify-end gap-2 shrink-0 bg-muted/5">
        <Button variant="ghost" onClick={onClose} className="h-9">
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={saving} className="h-9">
          {saving && <Loader2 className="size-4 mr-2 animate-spin" />}
          {originalQuiz ? 'Save Changes' : 'Create Quiz'}
        </Button>
      </div>

      {/* Delete Confirmation */}
      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Quiz</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will permanently delete this quiz and all student attempts. This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmDelete(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={saving}
            >
              {saving && <Loader2 className="size-4 mr-2 animate-spin" />}
              Delete Quiz
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Questions */}
      <QuizImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        hasExistingQuestions={!isCompletelyBlankStarter(questions)}
        existingQuestionCount={isCompletelyBlankStarter(questions) ? 0 : questions.length}
        onApply={applyImportResult}
      />
    </div>
  );
}
