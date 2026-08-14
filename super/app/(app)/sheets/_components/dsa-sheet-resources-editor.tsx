'use client';

import React, { useState, useTransition } from 'react';
import { ArrowDown, ArrowUp, Eye, EyeOff, Plus, Save, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import type { DsaSheetResource, DsaSheetResourceType } from '@/types/dsa';
import * as actions from '../actions';

interface Props {
  sheetId: string;
  initialResources: DsaSheetResource[];
  onRefresh: () => void;
}

interface ResourceFormState {
  title: string;
  description: string;
  resource_url: string;
  resource_type: DsaSheetResourceType;
  is_visible: boolean;
}

const emptyForm: ResourceFormState = {
  title: '',
  description: '',
  resource_url: '',
  resource_type: 'auto',
  is_visible: true,
};

const resourceTypeOptions: Array<{ value: DsaSheetResourceType; label: string }> = [
  { value: 'auto', label: 'Auto detect' },
  { value: 'image', label: 'Image' },
  { value: 'svg', label: 'SVG' },
  { value: 'excalidraw', label: 'Excalidraw' },
  { value: 'iframe', label: 'Trusted iframe' },
];

function toForm(resource: DsaSheetResource): ResourceFormState {
  return {
    title: resource.title,
    description: resource.description ?? '',
    resource_url: resource.resource_url,
    resource_type: resource.resource_type,
    is_visible: resource.is_visible,
  };
}

export function DsaSheetResourcesEditor({ sheetId, initialResources, onRefresh }: Props) {
  const [resources, setResources] = useState(initialResources);
  const [form, setForm] = useState<ResourceFormState>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingForm, setEditingForm] = useState<ResourceFormState>(emptyForm);
  const [isPending, startTransition] = useTransition();

  React.useEffect(() => {
    setResources(initialResources);
  }, [initialResources]);

  const canCreate = form.title.trim().length > 0 && form.resource_url.trim().length > 0;

  function handleCreate() {
    if (!canCreate) return;

    startTransition(async () => {
      try {
        const resource = await actions.addSheetResource(sheetId, form);
        setResources((prev) => [...prev, resource]);
        setForm(emptyForm);
        toast.success('Sheet resource added');
        onRefresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to add resource');
      }
    });
  }

  function handleUpdate() {
    if (!editingId || !editingForm.title.trim() || !editingForm.resource_url.trim()) return;

    startTransition(async () => {
      try {
        const resource = await actions.editSheetResource(sheetId, editingId, editingForm);
        setResources((prev) => prev.map((item) => (item.id === editingId ? resource : item)));
        setEditingId(null);
        setEditingForm(emptyForm);
        toast.success('Sheet resource updated');
        onRefresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to update resource');
      }
    });
  }

  function handleDelete(resourceId: string) {
    if (!confirm('Delete this sheet resource?')) return;

    startTransition(async () => {
      try {
        await actions.removeSheetResource(sheetId, resourceId);
        setResources((prev) => prev.filter((item) => item.id !== resourceId));
        toast.success('Sheet resource deleted');
        onRefresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to delete resource');
      }
    });
  }

  function handleMove(resourceId: string, direction: 'up' | 'down') {
    const ids = resources.map((resource) => resource.id);
    const idx = ids.indexOf(resourceId);
    if (direction === 'up' && idx <= 0) return;
    if (direction === 'down' && (idx < 0 || idx >= ids.length - 1)) return;

    const next = [...resources];
    const swapWith = direction === 'up' ? idx - 1 : idx + 1;
    [next[idx], next[swapWith]] = [next[swapWith], next[idx]];
    setResources(next);

    startTransition(async () => {
      try {
        await actions.moveSheetResource(sheetId, resourceId, direction, ids);
        onRefresh();
      } catch {
        toast.error('Failed to reorder resource');
        setResources(resources);
      }
    });
  }

  function renderFields(state: ResourceFormState, setState: (value: ResourceFormState) => void) {
    return (
      <div className="grid gap-3 lg:grid-cols-[1fr_1.4fr_150px_auto]">
        <input
          value={state.title}
          onChange={(event) => setState({ ...state, title: event.target.value })}
          placeholder="Resource title"
          className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring"
        />
        <input
          value={state.resource_url}
          onChange={(event) => setState({ ...state, resource_url: event.target.value })}
          placeholder="PNG, SVG, or Excalidraw readonly URL"
          type="url"
          className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring"
        />
        <select
          value={state.resource_type}
          onChange={(event) => setState({ ...state, resource_type: event.target.value as DsaSheetResourceType })}
          className="h-9 rounded-md border border-input bg-background px-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring"
        >
          {resourceTypeOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <label className="flex h-9 items-center gap-2 rounded-md border border-border/60 px-3 text-xs font-medium text-muted-foreground">
          <input
            type="checkbox"
            checked={state.is_visible}
            onChange={(event) => setState({ ...state, is_visible: event.target.checked })}
            className="size-3.5"
          />
          Visible
        </label>
        <input
          value={state.description}
          onChange={(event) => setState({ ...state, description: event.target.value })}
          placeholder="Short description (optional)"
          className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring lg:col-span-4"
        />
      </div>
    );
  }

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-border/50 px-6 py-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Sheet Resources</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Add visual resources shown only inside this DSA sheet. Excalidraw URLs use the same viewer as Notes, and GitHub blob image links are converted automatically.
          </p>
        </div>
      </div>

      <div className="space-y-4 p-6">
        <div className="rounded-lg border border-border/50 bg-muted/20 p-3">
          <div className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground/70">
            Add resource
          </div>
          <div className="space-y-3">
            {renderFields(form, setForm)}
            <Button size="sm" onClick={handleCreate} disabled={isPending || !canCreate} className="gap-2">
              <Plus className="size-3.5" />
              Add Resource
            </Button>
          </div>
        </div>

        {resources.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
            No resources added yet.
          </div>
        ) : (
          <div className="space-y-2">
            {resources.map((resource, index) => (
              <div key={resource.id} className="rounded-lg border border-border/60 bg-card p-3">
                {editingId === resource.id ? (
                  <div className="space-y-3">
                    {renderFields(editingForm, setEditingForm)}
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleUpdate} disabled={isPending} className="gap-2">
                        <Save className="size-3.5" />
                        Save
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditingId(null);
                          setEditingForm(emptyForm);
                        }}
                        className="gap-2"
                      >
                        <X className="size-3.5" />
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-3">
                    <div className="flex flex-col gap-1 pt-0.5">
                      <button
                        onClick={() => handleMove(resource.id, 'up')}
                        disabled={index === 0 || isPending}
                        className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30"
                        aria-label="Move resource up"
                      >
                        <ArrowUp className="size-3.5" />
                      </button>
                      <button
                        onClick={() => handleMove(resource.id, 'down')}
                        disabled={index === resources.length - 1 || isPending}
                        className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30"
                        aria-label="Move resource down"
                      >
                        <ArrowDown className="size-3.5" />
                      </button>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium text-sm text-foreground">{resource.title}</p>
                        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                          {resource.resource_type}
                        </span>
                        {resource.is_visible ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                            <Eye className="size-3" /> Visible
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                            <EyeOff className="size-3" /> Hidden
                          </span>
                        )}
                      </div>
                      {resource.description && (
                        <p className="mt-1 text-xs text-muted-foreground">{resource.description}</p>
                      )}
                      <p className="mt-1 truncate text-xs text-primary">{resource.resource_url}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEditingId(resource.id);
                          setEditingForm(toForm(resource));
                        }}
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(resource.id)}
                        disabled={isPending}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}
