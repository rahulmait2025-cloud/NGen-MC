'use client';

import React from 'react';
import { Card } from '@/components/ui/card';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
} from '@/components/ui/table';
import {
  Loader2,
  FolderOpen,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { ModuleSummary, LinkedNoteInfo, ExcalidrawResourceInfo, ModuleVideoItem } from './types';
import { ModuleItemRow } from './module-item-row';

interface ModuleCardProps {
  module: ModuleSummary;
  isExpanded: boolean;
  isLoading: boolean;
  isLoaded: boolean;
  videoItems: ModuleVideoItem[];
  onToggle: () => void;
  getNoteForItem: (itemId: string) => LinkedNoteInfo | undefined;
  getExcalidrawForItem: (itemId: string) => ExcalidrawResourceInfo[];
  publishingNoteId: string | null;
  togglingExcalidrawId: string | null;
  onEditPages: (noteCollectionId: string) => void;
  onPublishNotes: (noteCollectionId: string, moduleId: string) => void;
  onUnpublishNotes: (noteCollectionId: string, moduleId: string) => void;
  onUnlinkNotes: (linkId: string, noteCollectionId: string, noteTitle: string, moduleId: string) => void;
  onDeleteNotes: (noteCollectionId: string, moduleId: string) => void;
  onAddNotes: (itemId: string, itemTitle: string) => void;
  onAddExcalidraw: (itemId: string, itemTitle: string) => void;
  onManageExcalidraw: (itemId: string, itemTitle: string, resource: ExcalidrawResourceInfo) => void;
  onToggleExcalidrawVisibility: (resourceId: string, isVisible: boolean, moduleId: string) => void;
  onRemoveExcalidraw: (resourceId: string, title: string, moduleId: string) => void;
}

export function ModuleCard({
  module,
  isExpanded,
  isLoading,
  isLoaded,
  videoItems,
  onToggle,
  getNoteForItem,
  getExcalidrawForItem,
  publishingNoteId,
  togglingExcalidrawId,
  onEditPages,
  onPublishNotes,
  onUnpublishNotes,
  onUnlinkNotes,
  onDeleteNotes,
  onAddNotes,
  onAddExcalidraw,
  onManageExcalidraw,
  onToggleExcalidrawVisibility,
  onRemoveExcalidraw,
}: ModuleCardProps) {
  const totalItems = module.videoCount;
  const itemsWithNotes = module.notesCount.total;
  const itemsWithExcal = module.excalidrawCount.total;

  return (
    <Card>
      {/* Module Header */}
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-muted/50 transition-colors"
      >
        {isExpanded ? (
          <ChevronDown className="size-4 text-muted-foreground shrink-0" />
        ) : (
          <ChevronRight className="size-4 text-muted-foreground shrink-0" />
        )}
        <div className="flex items-center justify-center size-8 rounded-md bg-muted shrink-0">
          <FolderOpen className="size-4 text-muted-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm">Course Module: {module.title}</div>
          <div className="text-xs text-muted-foreground">
            {totalItems} item{totalItems !== 1 ? 's' : ''}
            {itemsWithNotes > 0 && (
              <span className="text-primary ml-1 font-semibold">({itemsWithNotes} with notes)</span>
            )}
            {itemsWithExcal > 0 && (
              <span className="text-violet-600 dark:text-violet-400 ml-1 font-semibold">
                ({itemsWithExcal} with Excalidraw)
              </span>
            )}
          </div>
        </div>
        {isLoading && <Loader2 className="size-4 animate-spin text-muted-foreground shrink-0" />}
      </button>

      {/* Module Items (Lazy Loaded) */}
      {isExpanded && (
        <div className="border-t px-4 py-3 bg-muted/10">
          {isLoading && !isLoaded ? (
            <div className="flex items-center justify-center py-6 text-sm text-muted-foreground gap-2">
              <Loader2 className="size-4 animate-spin" /> Loading module contents...
            </div>
          ) : !isLoaded ? (
            <div className="text-xs text-muted-foreground/60 py-3 text-center">
              Items queued for loading...
            </div>
          ) : videoItems.length === 0 ? (
            <div className="text-sm text-muted-foreground py-3 px-2">
              No videos found in this module.
            </div>
          ) : (
            <div className="rounded-lg border bg-background shadow-xs overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 select-none hover:bg-muted/40">
                    <TableHead className="p-3 w-[40%] font-semibold uppercase tracking-wider text-[10px]">Video Item</TableHead>
                    <TableHead className="p-3 w-[30%] font-semibold uppercase tracking-wider text-[10px] border-l">Notes Collection</TableHead>
                    <TableHead className="p-3 w-[30%] font-semibold uppercase tracking-wider text-[10px] border-l">Excalidraw Whiteboard</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {videoItems.map((item) => {
                    const linkedNote = getNoteForItem(item.id);
                    const excalidrawResources = getExcalidrawForItem(item.id);

                    return (
                      <ModuleItemRow
                        key={item.id}
                        item={item}
                        linkedNote={linkedNote}
                        excalidrawResources={excalidrawResources}
                        publishingNoteId={publishingNoteId}
                        togglingExcalidrawId={togglingExcalidrawId}
                        onEditPages={onEditPages}
                        onPublishNotes={(noteCollectionId) => onPublishNotes(noteCollectionId, module.id)}
                        onUnpublishNotes={(noteCollectionId) => onUnpublishNotes(noteCollectionId, module.id)}
                        onUnlinkNotes={(linkId, noteCollectionId, noteTitle) =>
                          onUnlinkNotes(linkId, noteCollectionId, noteTitle, module.id)
                        }
                        onDeleteNotes={(noteCollectionId) => onDeleteNotes(noteCollectionId, module.id)}
                        onAddNotes={() => onAddNotes(item.id, item.title)}
                        onAddExcalidraw={() => onAddExcalidraw(item.id, item.title)}
                        onManageExcalidraw={(resource) =>
                          onManageExcalidraw(item.id, item.title, resource)
                        }
                        onToggleExcalidrawVisibility={(resourceId, isVisible) =>
                          onToggleExcalidrawVisibility(resourceId, isVisible, module.id)
                        }
                        onRemoveExcalidraw={(resourceId, title) =>
                          onRemoveExcalidraw(resourceId, title, module.id)
                        }
                      />
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
