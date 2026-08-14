'use client';

import { useState, useReducer, useTransition, useEffect } from 'react';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, GripVertical, ListPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  listPaidMentorshipCategoriesAction,
  createPaidMentorshipCategoryAction,
  updatePaidMentorshipCategoryAction,
  togglePaidMentorshipCategoryAction,
  deletePaidMentorshipCategoryAction,
} from './paid-mentorship-actions';
import type { PaidMentorshipCategory, CustomQuestion } from '@/lib/services/paid-mentorship';

function generateId() {
  return `q_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

type CategoryFormState = {
  title: string;
  description: string;
  questions: CustomQuestion[];
};

type CategoryFormAction =
  | { type: 'SET_TITLE'; title: string }
  | { type: 'SET_DESCRIPTION'; description: string }
  | { type: 'SET_QUESTIONS'; questions: CustomQuestion[] }
  | { type: 'LOAD_EDIT'; title: string; description: string; questions: CustomQuestion[] }
  | { type: 'RESET' };

const initialCategoryFormState: CategoryFormState = {
  title: '',
  description: '',
  questions: [],
};

function categoryFormReducer(state: CategoryFormState, action: CategoryFormAction): CategoryFormState {
  switch (action.type) {
    case 'SET_TITLE':
      return { ...state, title: action.title };
    case 'SET_DESCRIPTION':
      return { ...state, description: action.description };
    case 'SET_QUESTIONS':
      return { ...state, questions: action.questions };
    case 'LOAD_EDIT':
      return { title: action.title, description: action.description, questions: action.questions };
    case 'RESET':
      return initialCategoryFormState;
  }
}

export function PaidMentorshipCategories() {
  const [isPending, startTransition] = useTransition();
  const [categories, setCategories] = useState<PaidMentorshipCategory[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PaidMentorshipCategory | null>(null);

  const [newForm, newDispatch] = useReducer(categoryFormReducer, initialCategoryFormState);
  const [editForm, editDispatch] = useReducer(categoryFormReducer, initialCategoryFormState);

  const loadCategories = () => {
    listPaidMentorshipCategoriesAction().then((result) => {
      if (result.ok) setCategories(result.categories);
    });
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const handleCreate = () => {
    if (!newForm.title.trim()) {
      toast.error('Title is required.');
      return;
    }
    startTransition(async () => {
      const formData = new FormData();
      formData.set('title', newForm.title);
      formData.set('description', newForm.description);
      formData.set('custom_questions', JSON.stringify(newForm.questions));
      const result = await createPaidMentorshipCategoryAction(formData);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success('Category created.');
      newDispatch({ type: 'RESET' });
      setShowAddForm(false);
      loadCategories();
    });
  };

  const handleEdit = (cat: PaidMentorshipCategory) => {
    setEditingId(cat.id);
    editDispatch({
      type: 'LOAD_EDIT',
      title: cat.title,
      description: cat.description ?? '',
      questions: cat.custom_questions ?? [],
    });
  };

  const handleSaveEdit = (id: string) => {
    if (!editForm.title.trim()) {
      toast.error('Title is required.');
      return;
    }
    startTransition(async () => {
      const formData = new FormData();
      formData.set('title', editForm.title);
      formData.set('description', editForm.description);
      formData.set('custom_questions', JSON.stringify(editForm.questions));
      const result = await updatePaidMentorshipCategoryAction(id, formData);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success('Category updated.');
      setEditingId(null);
      loadCategories();
    });
  };

  const handleToggle = (id: string, isActive: boolean) => {
    startTransition(async () => {
      const result = await togglePaidMentorshipCategoryAction(id, isActive);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(isActive ? 'Category activated.' : 'Category deactivated.');
      loadCategories();
    });
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    startTransition(async () => {
      const result = await deletePaidMentorshipCategoryAction(deleteTarget.id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success('Category deleted.');
      setDeleteTarget(null);
      loadCategories();
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold">Session Categories</h3>
          <p className="text-sm text-muted-foreground">
            Categories students can choose when booking. Add custom questions to gather more info.
          </p>
        </div>
        <Button onClick={() => setShowAddForm(true)} size="sm" disabled={showAddForm}>
          <Plus className="mr-2 size-4" />
          Add Category
        </Button>
      </div>

      {showAddForm && (
        <CategoryForm
          title={newForm.title}
          setTitle={(title) => newDispatch({ type: 'SET_TITLE', title })}
          description={newForm.description}
          setDescription={(description) => newDispatch({ type: 'SET_DESCRIPTION', description })}
          questions={newForm.questions}
          setQuestions={(questions) => newDispatch({ type: 'SET_QUESTIONS', questions })}
          onSave={handleCreate}
          onCancel={() => {
            setShowAddForm(false);
            newDispatch({ type: 'RESET' });
          }}
          isPending={isPending}
          saveLabel="Create"
        />
      )}

      <div className="rounded-xl border border-border/60 bg-card">
        {categories.length === 0 && (
          <div className="p-8 text-center text-sm text-muted-foreground">
            No categories yet. Add one to get started.
          </div>
        )}
        <div className="divide-y divide-border/60">
          {categories.map((cat) => (
            <div key={cat.id} className="p-4">
              {editingId === cat.id ? (
                <CategoryForm
                  title={editForm.title}
                  setTitle={(title) => editDispatch({ type: 'SET_TITLE', title })}
                  description={editForm.description}
                  setDescription={(description) => editDispatch({ type: 'SET_DESCRIPTION', description })}
                  questions={editForm.questions}
                  setQuestions={(questions) => editDispatch({ type: 'SET_QUESTIONS', questions })}
                  onSave={() => handleSaveEdit(cat.id)}
                  onCancel={() => setEditingId(null)}
                  isPending={isPending}
                  saveLabel="Save"
                />
              ) : (
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-medium">{cat.title}</h4>
                      {!cat.is_active && (
                        <span className="inline-flex items-center rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                          Inactive
                        </span>
                      )}
                    </div>
                    {cat.description && (
                      <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                        {cat.description}
                      </p>
                    )}
                    {cat.custom_questions && cat.custom_questions.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {cat.custom_questions.map((q) => (
                          <Badge key={q.id} variant="secondary" className="text-[10px] font-normal">
                            {q.question.length > 40 ? q.question.slice(0, 40) + '...' : q.question}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Switch
                      checked={cat.is_active}
                      onCheckedChange={(checked) => handleToggle(cat.id, checked)}
                      disabled={isPending}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8"
                      onClick={() => handleEdit(cat)}
                    >
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 text-destructive"
                      onClick={() => setDeleteTarget(cat)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Category</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deleteTarget?.title}&quot;? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── Category Form (reusable for create/edit) ────────────────────────────────

interface CategoryFormProps {
  title: string;
  setTitle: (v: string) => void;
  description: string;
  setDescription: (v: string) => void;
  questions: CustomQuestion[];
  setQuestions: (v: CustomQuestion[]) => void;
  onSave: () => void;
  onCancel: () => void;
  isPending: boolean;
  saveLabel: string;
}

function CategoryForm({
  title,
  setTitle,
  description,
  setDescription,
  questions,
  setQuestions,
  onSave,
  onCancel,
  isPending,
  saveLabel,
}: CategoryFormProps) {
  const addQuestion = () => {
    setQuestions([
      ...questions,
      {
        id: generateId(),
        question: '',
        type: 'text',
        options: [],
        required: true,
        sort_order: questions.length,
      },
    ]);
  };

  const updateQuestion = (index: number, updates: Partial<CustomQuestion>) => {
    const next = [...questions];
    next[index] = { ...next[index], ...updates };
    setQuestions(next);
  };

  const removeQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const moveQuestion = (index: number, direction: -1 | 1) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= questions.length) return;
    const next = [...questions];
    const [moved] = next.splice(index, 1);
    next.splice(newIndex, 0, moved);
    setQuestions(next.map((q, i) => ({ ...q, sort_order: i })));
  };

  return (
    <div className="rounded-xl border border-border/60 bg-card p-4 space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="cat-title">Title</Label>
        <Input
          id="cat-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Mock DSA Interview"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="cat-desc">Description</Label>
        <Textarea
          id="cat-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What students can expect from this category..."
          rows={3}
        />
      </div>

      {/* Custom Questions */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ListPlus className="size-4 text-muted-foreground" />
            <Label className="text-sm font-medium">Custom Questions</Label>
          </div>
          <Button onClick={addQuestion} size="sm" variant="outline" type="button">
            <Plus className="mr-1 size-3" />
            Add Question
          </Button>
        </div>

        {questions.length === 0 && (
          <p className="text-xs text-muted-foreground">
            No custom questions. Add questions to gather more info from students when they book.
          </p>
        )}

        <div className="space-y-3">
          {questions.map((q, idx) => (
            <div key={q.id} className="rounded-lg border border-border/40 bg-muted/20 p-3 space-y-3">
              <div className="flex items-center gap-2">
                <GripVertical className="size-4 text-muted-foreground shrink-0" />
                <span className="text-xs font-medium text-muted-foreground">Q{idx + 1}</span>
                <div className="flex-1" />
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-6"
                  onClick={() => moveQuestion(idx, -1)}
                  disabled={idx === 0}
                  type="button"
                >
                  <span className="text-xs">↑</span>
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-6"
                  onClick={() => moveQuestion(idx, 1)}
                  disabled={idx === questions.length - 1}
                  type="button"
                >
                  <span className="text-xs">↓</span>
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-6 text-destructive"
                  onClick={() => removeQuestion(idx)}
                  type="button"
                >
                  <Trash2 className="size-3" />
                </Button>
              </div>

              <Input
                value={q.question}
                onChange={(e) => updateQuestion(idx, { question: e.target.value })}
                placeholder="Enter your question..."
              />

              <div className="flex items-center gap-3">
                <Select
                  value={q.type}
                  onValueChange={(val) =>
                    updateQuestion(idx, {
                      type: val as CustomQuestion['type'],
                      options: val === 'select' || val === 'radio' ? (q.options ?? []) : [],
                    })
                  }
                >
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text">Short Text</SelectItem>
                    <SelectItem value="textarea">Long Text</SelectItem>
                    <SelectItem value="select">Dropdown</SelectItem>
                    <SelectItem value="radio">Radio Buttons</SelectItem>
                  </SelectContent>
                </Select>

                <div className="flex items-center gap-2">
                  <Switch
                    checked={q.required}
                    onCheckedChange={(checked) => updateQuestion(idx, { required: checked })}
                  />
                  <span className="text-xs text-muted-foreground">Required</span>
                </div>
              </div>

              {(q.type === 'select' || q.type === 'radio') && (
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Options (one per line)</Label>
                  <Textarea
                    value={(q.options ?? []).join('\n')}
                    onChange={(e) =>
                      updateQuestion(idx, {
                        options: e.target.value.split('\n').filter((o) => o.trim()),
                      })
                    }
                    placeholder={"Option 1\nOption 2\nOption 3"}
                    rows={3}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-2">
        <Button onClick={onSave} disabled={isPending} size="sm">
          {isPending ? 'Saving...' : saveLabel}
        </Button>
        <Button variant="outline" size="sm" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
