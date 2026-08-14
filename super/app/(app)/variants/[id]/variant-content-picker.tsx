'use client';

import { useState, useCallback, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  ChevronRight,
  ChevronDown,
  Plus,
  Video,
  FileText,
  Link2,
  Clock,
  Loader2,
  CheckCircle,
  AlertCircle,
  Trash2,
} from 'lucide-react';
import {
  addVariantItemsAction,
  removeVariantItemAction,
} from '../actions';
import type { PickerModule, PickerItem } from '@/lib/types/proposal-picker';

interface VariantContentPickerProps {
  variantId: string;
  existingItemIds: Set<string>;
  modules: PickerModule[];
}

const itemTypeIcon: Record<string, React.ReactNode> = {
  video: <Video className="size-3.5 text-blue-500" />,
  document: <FileText className="size-3.5 text-orange-500" />,
  link: <Link2 className="size-3.5 text-purple-500" />,
  pdf: <FileText className="size-3.5 text-red-500" />,
  markdown: <FileText className="size-3.5 text-blue-500" />,
  external_link: <Link2 className="size-3.5 text-purple-500" />,
  note: <FileText className="size-3.5 text-amber-500" />,
  worksheet: <FileText className="size-3.5 text-orange-500" />,
  resource: <FileText className="size-3.5 text-orange-500" />,
};

function formatDuration(seconds: number | null): string {
  if (!seconds) return '';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function VariantContentPicker({
  variantId,
  existingItemIds,
  modules,
}: VariantContentPickerProps) {
  const { refresh } = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [openModules, setOpenModules] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [removingIds, setRemovingIds] = useState<Set<string>>(new Set());

  const toggleModule = useCallback((moduleId: string) => {
    setOpenModules((prev) => {
      const next = new Set(prev);
      if (next.has(moduleId)) next.delete(moduleId);
      else next.add(moduleId);
      return next;
    });
  }, []);

  const toggleItem = useCallback((itemId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  }, []);

  const selectAllInModule = useCallback((mod: PickerModule) => {
    setSelected((prev) => {
      const next = new Set(prev);
      const available = mod.items.filter((i) => !existingItemIds.has(i.id));
      const allSelected = available.every((i) => next.has(i.id));
      if (allSelected) {
        available.forEach((i) => next.delete(i.id));
      } else {
        available.forEach((i) => next.add(i.id));
      }
      return next;
    });
  }, [existingItemIds]);

  const handleAddSelected = useCallback(() => {
    if (selected.size === 0) return;

    startTransition(async () => {
      setFeedback(null);
      const result = await addVariantItemsAction({
        course_variant_id: variantId,
        master_course_item_ids: Array.from(selected),
        inclusion_type: 'selected_item',
      });

      if (result.success) {
        setFeedback({ type: 'success', message: `Added ${selected.size} item(s) to variant.` });
        setSelected(new Set());
        refresh();
      } else {
        setFeedback({ type: 'error', message: result.error ?? 'Failed to add items' });
      }
    });
  }, [selected, variantId, refresh]);

  const handleRemoveItem = useCallback((itemId: string) => {
    if (!window.confirm('Remove this item from the variant?')) return;

    setRemovingIds((prev) => new Set(prev).add(itemId));
    startTransition(async () => {
      await removeVariantItemAction(variantId, itemId);
      refresh();
    });
  }, [variantId, refresh]);

  const availableModules = modules.filter(
    (mod) => mod.items.some((i) => !existingItemIds.has(i.id)),
  );

  if (availableModules.length === 0 && modules.length > 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="size-5" />
            Add Content
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            All items from the parent course are already included in this variant.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Plus className="size-5" />
              Add Content from Parent Course
            </CardTitle>
            <CardDescription className="mt-1">
              Select modules or individual items to include in this variant.
            </CardDescription>
          </div>
          {selected.size > 0 && (
            <Button onClick={handleAddSelected} disabled={isPending} size="sm">
              {isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              Add {selected.size} Item{selected.size !== 1 ? 's' : ''}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {feedback && (
          <div className={`flex items-center gap-2 text-sm p-3 rounded-md ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20'
              : 'bg-destructive/10 text-destructive border border-destructive/30'
          }`}>
            {feedback.type === 'success' ? (
              <CheckCircle className="size-4 shrink-0" />
            ) : (
              <AlertCircle className="size-4 shrink-0" />
            )}
            {feedback.message}
          </div>
        )}

        <ScrollArea className="max-h-[500px] overflow-y-auto">
          <div className="space-y-1">
            {modules.map((mod) => {
              const availableItems = mod.items.filter((i) => !existingItemIds.has(i.id));
              const allModuleSelected = availableItems.length > 0 && availableItems.every((i) => selected.has(i.id));
              const someModuleSelected = availableItems.some((i) => selected.has(i.id));
              const isOpen = openModules.has(mod.id);

              return (
                <Collapsible key={mod.id} open={isOpen} onOpenChange={() => toggleModule(mod.id)}>
                  <div className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted/50">
                    {availableItems.length > 0 && (
                      <Checkbox
                        checked={allModuleSelected ? true : someModuleSelected ? 'indeterminate' : false}
                        onCheckedChange={() => selectAllInModule(mod)}
                        aria-label={`Select all in ${mod.title}`}
                      />
                    )}
                    <CollapsibleTrigger className="flex items-center gap-1.5 flex-1 text-left text-sm font-medium">
                      {isOpen ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                      {mod.title}
                      <Badge variant="secondary" className="ml-auto text-xs">
                        {mod.items.length} item{mod.items.length !== 1 ? 's' : ''}
                      </Badge>
                      {availableItems.length < mod.items.length && (
                        <Badge variant="outline" className="text-xs text-emerald-600 dark:text-emerald-400">
                          {mod.items.length - availableItems.length} added
                        </Badge>
                      )}
                    </CollapsibleTrigger>
                  </div>
                  <CollapsibleContent>
                    <div className="ml-8 space-y-0.5 pb-2">
                      {mod.items.map((item) => {
                        const alreadyAdded = existingItemIds.has(item.id);
                        return (
                          <ItemRow
                            key={item.id}
                            item={item}
                            alreadyAdded={alreadyAdded}
                            isSelected={selected.has(item.id)}
                            onToggle={() => toggleItem(item.id)}
                            isRemoving={removingIds.has(item.id)}
                            onRemove={() => handleRemoveItem(item.id)}
                          />
                        );
                      })}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

function ItemRow({
  item,
  alreadyAdded,
  isSelected,
  onToggle,
  isRemoving,
  onRemove,
}: {
  item: PickerItem;
  alreadyAdded: boolean;
  isSelected: boolean;
  onToggle: () => void;
  isRemoving: boolean;
  onRemove: () => void;
}) {
  return (
    <div className={`flex items-center gap-2 px-2 py-1 rounded text-sm ${
      alreadyAdded ? 'opacity-50' : 'hover:bg-muted/30'
    }`}>
      <Checkbox
        checked={alreadyAdded || isSelected}
        disabled={alreadyAdded || isRemoving}
        onCheckedChange={alreadyAdded ? undefined : onToggle}
      />
      {itemTypeIcon[item.item_type] ?? <FileText className="size-3.5 text-muted-foreground" />}
      <span className="flex-1 truncate">{item.title}</span>
      {item.duration_seconds != null && item.duration_seconds > 0 && (
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="size-3" />
          {formatDuration(item.duration_seconds)}
        </span>
      )}
      {item.video_asset_id && (
        <Badge variant="outline" className="text-xs">
          {item.video_status === 'completed' ? 'Ready' : item.video_status ?? 'Linked'}
        </Badge>
      )}
      {item.tp_asset_id && (
        <span className="text-[10px] font-mono text-muted-foreground max-w-[80px] truncate" title={item.tp_asset_id}>
          TP:{item.tp_asset_id.slice(0, 8)}
        </span>
      )}
      {alreadyAdded && !isRemoving && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onRemove}
          className="h-6 px-2 text-xs text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="size-3 mr-1" />
          Remove
        </Button>
      )}
      {isRemoving && (
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <Loader2 className="size-3 animate-spin" />
          Removing...
        </span>
      )}
    </div>
  );
}
