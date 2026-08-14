'use client';

import { useState, useCallback, useTransition, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  ChevronRight,
  ChevronDown,
  Loader2,
  Save,
  CheckCircle,
  AlertCircle,
  BookOpen,
  GitBranch,
  Package,
  FileText,
  Link2,
  Video,
} from 'lucide-react';
import {
  fetchBundleComponentLectures,
  fetchBundleComponentLabels,
  type ComponentLecture,
} from '../actions-picker';
import {
  setBundleItemSelectedItemsAction,
  getBundleSelectedItemsAction,
} from '../actions';

interface BundleSelectedItemsEditorProps {
  bundleId: string;
  bundleItems: Array<{
    id: string;
    item_type: string;
    reference_id: string;
    sort_order: number;
  }>;
}

interface ComponentLabel {
  title: string;
  subtitle?: string;
}

export function BundleSelectedItemsEditor({ bundleId, bundleItems }: BundleSelectedItemsEditorProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [labels, setLabels] = useState<Record<string, ComponentLabel>>({});
  const [selectedItemsMap, setSelectedItemsMap] = useState<Record<string, string[]>>({});
  const [expandedComponent, setExpandedComponent] = useState<string | null>(null);
  const [componentLectures, setComponentLectures] = useState<ComponentLecture[]>([]);
  const [loadingLectures, setLoadingLectures] = useState(false);
  const [editingOverrides, setEditingOverrides] = useState<Record<string, Set<string>>>({});
  const [savingItemId, setSavingItemId] = useState<string | null>(null);

  useEffect(() => {
    if (bundleItems.length === 0) return;

    fetchBundleComponentLabels(bundleItems).then((res) => {
      if ('labels' in res) setLabels(res.labels);
    });

    getBundleSelectedItemsAction(bundleId).then((res) => {
      if (res.success && res.data) {
        setSelectedItemsMap(res.data);
      }
    });
  }, [bundleId, bundleItems]);

  const handleExpandComponent = useCallback(async (bundleItemId: string, itemType: string, referenceId: string) => {
    if (expandedComponent === bundleItemId) {
      setExpandedComponent(null);
      return;
    }
    setExpandedComponent(bundleItemId);
    setLoadingLectures(true);
    setComponentLectures([]);

    const result = await fetchBundleComponentLectures(itemType, referenceId);
    if ('lectures' in result) {
      setComponentLectures(result.lectures);
    }
    setLoadingLectures(false);
  }, [expandedComponent]);

  const handleToggleLecture = useCallback((bundleItemId: string, lectureId: string) => {
    setEditingOverrides((prev) => {
      const current = prev[bundleItemId] ?? new Set(selectedItemsMap[bundleItemId] ?? []);
      const next = new Set(current);
      if (next.has(lectureId)) next.delete(lectureId);
      else next.add(lectureId);
      return { ...prev, [bundleItemId]: next };
    });
  }, [selectedItemsMap]);

  const handleSelectAll = useCallback((bundleItemId: string, lectureIds: string[]) => {
    setEditingOverrides((prev) => {
      const current = prev[bundleItemId] ?? new Set(selectedItemsMap[bundleItemId] ?? []);
      const allSelected = lectureIds.every((id) => current.has(id));
      if (allSelected) {
        return { ...prev, [bundleItemId]: new Set() };
      }
      return { ...prev, [bundleItemId]: new Set(lectureIds) };
    });
  }, [selectedItemsMap]);

  const handleSaveOverrides = useCallback((bundleItemId: string) => {
    const overrides = editingOverrides[bundleItemId];
    if (!overrides) return;

    setSavingItemId(bundleItemId);
    startTransition(async () => {
      setFeedback(null);
      const result = await setBundleItemSelectedItemsAction(bundleItemId, Array.from(overrides));
      if (result.success) {
        setFeedback({ type: 'success', message: 'Selected lectures saved.' });
        setSelectedItemsMap((prev) => ({
          ...prev,
          [bundleItemId]: Array.from(overrides),
        }));
        setEditingOverrides((prev) => {
          const next = { ...prev };
          delete next[bundleItemId];
          return next;
        });
        router.refresh();
      } else {
        setFeedback({ type: 'error', message: result.error ?? 'Failed to save selected items' });
      }
      setSavingItemId(null);
    });
  }, [editingOverrides, router]);

  const handleClearOverrides = useCallback((bundleItemId: string) => {
    setSavingItemId(bundleItemId);
    startTransition(async () => {
      setFeedback(null);
      const result = await setBundleItemSelectedItemsAction(bundleItemId, []);
      if (result.success) {
        setFeedback({ type: 'success', message: 'Overrides cleared.' });
        setSelectedItemsMap((prev) => {
          const next = { ...prev };
          delete next[bundleItemId];
          return next;
        });
        setEditingOverrides((prev) => {
          const next = { ...prev };
          delete next[bundleItemId];
          return next;
        });
        router.refresh();
      } else {
        setFeedback({ type: 'error', message: result.error ?? 'Failed to clear overrides' });
      }
      setSavingItemId(null);
    });
  }, [router]);

  if (bundleItems.length === 0) return null;

  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-base font-semibold text-foreground">Lecture Overrides</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Control which lectures are included from each component. No overrides means full content.
        </p>
      </div>

      {feedback && (
        <div className={`flex items-center gap-2 text-sm px-3 py-2 rounded-md ${
          feedback.type === 'success'
            ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20'
            : 'bg-destructive/10 text-destructive border border-destructive/20'
        }`}>
          {feedback.type === 'success' ? <CheckCircle className="size-3.5 shrink-0" /> : <AlertCircle className="size-3.5 shrink-0" />}
          {feedback.message}
        </div>
      )}

      <ScrollArea className="max-h-[500px]">
        <div className="space-y-1.5">
          {bundleItems.map((bi) => {
            const key = `${bi.item_type}:${bi.reference_id}`;
            const label = labels[key];
            const hasOverrides = (selectedItemsMap[bi.id]?.length ?? 0) > 0;
            const editingSet = editingOverrides[bi.id];
            const isEditing = editingSet !== undefined;
            const isExpanded = expandedComponent === bi.id;

            return (
              <Collapsible key={bi.id} open={isExpanded} onOpenChange={() => handleExpandComponent(bi.id, bi.item_type, bi.reference_id)}>
                <div className="border rounded-md">
                    <div className="flex items-center gap-2 px-3 py-2">
                    <CollapsibleTrigger className="flex items-center gap-2 flex-1 text-left">
                      {isExpanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                      <ComponentTypeIcon type={bi.item_type} />
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium truncate block">
                          {label?.title ?? bi.reference_id}
                        </span>
                        {label?.subtitle && (
                          <span className="text-xs text-muted-foreground">{label.subtitle}</span>
                        )}
                      </div>
                    </CollapsibleTrigger>
                    {hasOverrides && (
                      <Badge variant="outline" className="text-xs text-blue-600 dark:text-blue-400 shrink-0">
                        {selectedItemsMap[bi.id].length} selected
                      </Badge>
                    )}
                    {!hasOverrides && (
                      <span className="text-xs text-muted-foreground shrink-0">Full</span>
                    )}
                    {hasOverrides && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-xs px-2 text-muted-foreground hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleClearOverrides(bi.id);
                        }}
                        disabled={savingItemId === bi.id}
                      >
                        Clear
                      </Button>
                    )}
                  </div>

                  <CollapsibleContent>
                    <div className="border-t px-3 py-2">
                      {loadingLectures ? (
                        <div className="flex justify-center py-3">
                          <Loader2 className="size-4 animate-spin text-muted-foreground" />
                        </div>
                        ) : componentLectures.length === 0 ? (
                          <p className="text-sm text-muted-foreground text-center py-3">No lectures found.</p>
                      ) : (
                        <>
                          <div className="flex items-center gap-1.5 mb-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() => handleSelectAll(bi.id, componentLectures.map((l) => l.id))}
                            >
                              Select All
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() => setEditingOverrides((prev) => ({ ...prev, [bi.id]: new Set() }))}
                            >
                              Deselect All
                            </Button>
                            {isEditing && (
                              <Button
                                size="sm"
                                className="h-7 text-xs ml-auto"
                                onClick={() => handleSaveOverrides(bi.id)}
                                disabled={savingItemId === bi.id}
                              >
                                {savingItemId === bi.id && <Loader2 className="size-3 mr-1 animate-spin" />}
                                <Save className="size-3 mr-1" />
                                Save
                              </Button>
                            )}
                          </div>
                          <div className="space-y-0.5">
                            {componentLectures.map((lecture) => {
                              const currentSet = editingSet ?? new Set(selectedItemsMap[bi.id] ?? []);
                              const isChecked = currentSet.has(lecture.id);
                              return (
                                <label
                                  key={lecture.id}
                                  className="flex items-center gap-2 px-2 py-1.5 rounded text-sm cursor-pointer hover:bg-muted/30"
                                >
                                  <Checkbox
                                    checked={isChecked}
                                    onCheckedChange={() => handleToggleLecture(bi.id, lecture.id)}
                                  />
                                  <LectureTypeIcon type={lecture.item_type} />
                                  <span className="flex-1 truncate">{lecture.title}</span>
                                  {lecture.module_title && (
                                    <span className="text-xs text-muted-foreground truncate max-w-[120px]">
                                      {lecture.module_title}
                                    </span>
                                  )}
                                  {lecture.duration_seconds != null && lecture.duration_seconds > 0 && (
                                    <span className="text-xs text-muted-foreground tabular-nums">
                                      {Math.floor(lecture.duration_seconds / 60)}m
                                    </span>
                                  )}
                                </label>
                              );
                            })}
                          </div>
                        </>
                      )}
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}

function ComponentTypeIcon({ type }: { type: string }) {
  switch (type) {
    case 'master_course': return <BookOpen className="size-3.5 text-blue-500" />;
    case 'variant': return <GitBranch className="size-3.5 text-purple-500" />;
    case 'bundle': return <Package className="size-3.5 text-emerald-500" />;
    default: return <FileText className="size-3.5 text-orange-500" />;
  }
}

function LectureTypeIcon({ type }: { type: string }) {
  switch (type) {
    case 'video': return <Video className="size-3 text-blue-400" />;
    case 'document': return <FileText className="size-3 text-orange-400" />;
    case 'pdf': return <FileText className="size-3 text-red-400" />;
    case 'markdown': return <FileText className="size-3 text-blue-400" />;
    case 'external_link': return <Link2 className="size-3 text-purple-400" />;
    case 'note': return <FileText className="size-3 text-amber-400" />;
    case 'worksheet': return <FileText className="size-3 text-orange-400" />;
    case 'resource': return <FileText className="size-3 text-orange-400" />;
    default: return <FileText className="size-3 text-muted-foreground" />;
  }
}
