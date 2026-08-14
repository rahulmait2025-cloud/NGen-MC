'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  TableRow,
  TableCell,
} from '@/components/ui/table';
import {
  Loader2,
  Edit,
  Unlink,
  Plus,
  PenTool,
  Trash2,
  MoreVertical,
  Eye,
  EyeOff,
} from 'lucide-react';
import {
  LinkedNoteInfo,
  ExcalidrawResourceInfo,
  getItemTypeIcon,
  getItemTypeBadgeClass,
} from './types';

interface ModuleItemRowProps {
  item: {
    id: string;
    title: string;
    item_type: string;
    publish_status: string;
  };
  linkedNote: LinkedNoteInfo | undefined;
  excalidrawResources: ExcalidrawResourceInfo[];
  publishingNoteId: string | null;
  togglingExcalidrawId: string | null;
  onEditPages: (noteCollectionId: string) => void;
  onPublishNotes: (noteCollectionId: string) => void;
  onUnpublishNotes: (noteCollectionId: string) => void;
  onUnlinkNotes: (linkId: string, noteCollectionId: string, noteTitle: string) => void;
  onDeleteNotes: (noteCollectionId: string) => void;
  onAddNotes: () => void;
  onAddExcalidraw: () => void;
  onManageExcalidraw: (resource: ExcalidrawResourceInfo) => void;
  onToggleExcalidrawVisibility: (resourceId: string, isVisible: boolean) => void;
  onRemoveExcalidraw: (resourceId: string, title: string) => void;
}

export function ModuleItemRow({
  item,
  linkedNote,
  excalidrawResources,
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
}: ModuleItemRowProps) {
  const hasExcalidraw = excalidrawResources.length > 0;
  const excalResource = excalidrawResources[0];

  return (
    <TableRow>
      {/* Item info column */}
      <TableCell className="whitespace-normal">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center size-8 rounded border bg-muted/40 text-muted-foreground shrink-0">
            {getItemTypeIcon(item.item_type)}
          </div>
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium text-foreground truncate max-w-[220px] sm:max-w-none" title={item.title}>
                {item.title}
              </span>
              <span
                className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium uppercase border ${getItemTypeBadgeClass(
                  item.item_type,
                )}`}
              >
                {item.item_type}
              </span>
              {item.publish_status !== 'published' && (
                <span className="shrink-0 rounded bg-yellow-100/80 border border-yellow-200/50 text-yellow-800 px-1.5 py-0.5 text-[10px] font-medium uppercase dark:bg-yellow-950/20 dark:border-yellow-900/30 dark:text-yellow-400">
                  {item.publish_status}
                </span>
              )}
            </div>
          </div>
        </div>
      </TableCell>

      {/* Notes status & actions column */}
      <TableCell className="border-l whitespace-normal">
        <div className="flex flex-col gap-2">
          {/* Status info */}
          <div className="flex items-center gap-1.5">
            {linkedNote ? (
              <span
                className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${
                  linkedNote.note_publish_status === 'published'
                    ? 'bg-green-500/10 text-green-700 border-green-500/20 dark:bg-green-500/20 dark:text-green-400 dark:border-green-500/30'
                    : 'bg-amber-500/10 text-amber-700 border-amber-500/20 dark:bg-amber-500/20 dark:text-amber-400 dark:border-amber-500/30'
                }`}
              >
                <span className={`size-1.5 rounded-full ${
                  linkedNote.note_publish_status === 'published' ? 'bg-green-500' : 'bg-amber-500'
                }`} />
                {linkedNote.note_publish_status === 'published' ? 'Published' : 'Draft'}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-muted/40 px-2 py-0.5 rounded-full border border-border/40">
                <span className="size-1.5 rounded-full bg-muted-foreground/40" />
                Not Created
              </span>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1 flex-wrap">
            {linkedNote ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs px-2.5"
                  onClick={() => onEditPages(linkedNote.note_collection_id)}
                >
                  <Edit className="size-3 mr-1" />
                  Edit Pages
                </Button>
                
                {linkedNote.note_publish_status === 'published' ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs px-2.5"
                    disabled={publishingNoteId === linkedNote.note_collection_id}
                    onClick={() => onUnpublishNotes(linkedNote.note_collection_id)}
                  >
                    {publishingNoteId === linkedNote.note_collection_id ? (
                      <Loader2 className="size-3 mr-1 animate-spin" />
                    ) : (
                      <EyeOff className="size-3 mr-1" />
                    )}
                    Unpublish
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs px-2.5 border-emerald-500/30 bg-emerald-500/5 text-emerald-600 hover:bg-emerald-500/10 dark:bg-emerald-950/20 dark:text-emerald-400 dark:hover:bg-emerald-950/30"
                    disabled={publishingNoteId === linkedNote.note_collection_id}
                    onClick={() => onPublishNotes(linkedNote.note_collection_id)}
                  >
                    {publishingNoteId === linkedNote.note_collection_id ? (
                      <Loader2 className="size-3 mr-1 animate-spin" />
                    ) : (
                      <Eye className="size-3 mr-1" />
                    )}
                    Publish
                  </Button>
                )}

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon-sm" className="size-7">
                      <MoreVertical className="size-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-36">
                    <DropdownMenuItem
                      className="cursor-pointer text-destructive focus:text-destructive hover:bg-red-50 dark:hover:bg-red-950/20"
                      onClick={() =>
                        onUnlinkNotes(linkedNote.link_id, linkedNote.note_collection_id, linkedNote.note_title)
                      }
                    >
                      <Unlink className="size-3 mr-2" />
                      Unlink
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="cursor-pointer text-red-600 focus:text-red-600 dark:text-red-400 hover:bg-red-100/50"
                      onClick={() => onDeleteNotes(linkedNote.note_collection_id)}
                    >
                      <Trash2 className="size-3 mr-2" />
                      Delete Note
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <Button variant="outline" size="sm" className="h-7 text-xs px-2.5" onClick={onAddNotes}>
                <Plus className="size-3 mr-1" />
                Create Notes
              </Button>
            )}
          </div>
        </div>
      </TableCell>

      {/* Excalidraw status & actions column */}
      <TableCell className="border-l whitespace-normal">
        <div className="flex flex-col gap-2">
          {/* Status info */}
          <div className="flex items-center gap-1.5">
            {hasExcalidraw ? (
              <span
                className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${
                  excalResource.is_visible
                    ? 'bg-violet-500/10 text-violet-700 border-violet-500/20 dark:bg-violet-500/20 dark:text-violet-400 dark:border-violet-500/30'
                    : 'bg-amber-500/10 text-amber-700 border-amber-500/20 dark:bg-amber-500/20 dark:text-amber-400 dark:border-amber-500/30'
                }`}
              >
                <span className={`size-1.5 rounded-full ${
                  excalResource.is_visible ? 'bg-violet-500' : 'bg-amber-500'
                }`} />
                {excalResource.is_visible ? 'Published' : 'Hidden'}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-muted/40 px-2 py-0.5 rounded-full border border-border/40">
                <span className="size-1.5 rounded-full bg-muted-foreground/40" />
                Not Added
              </span>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1 flex-wrap">
            {hasExcalidraw ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs px-2.5"
                  onClick={() => onManageExcalidraw(excalResource)}
                >
                  <PenTool className="size-3 mr-1" />
                  Manage
                </Button>
                
                {excalResource.is_visible ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs px-2.5"
                    disabled={togglingExcalidrawId === excalResource.resource_item_id}
                    onClick={() =>
                      onToggleExcalidrawVisibility(
                        excalResource.resource_item_id,
                        excalResource.is_visible,
                      )
                    }
                  >
                    {togglingExcalidrawId === excalResource.resource_item_id ? (
                      <Loader2 className="size-3 mr-1 animate-spin" />
                    ) : (
                      <EyeOff className="size-3 mr-1" />
                    )}
                    Hide
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs px-2.5 border-emerald-500/30 bg-emerald-500/5 text-emerald-600 hover:bg-emerald-500/10 dark:bg-emerald-950/20 dark:text-emerald-400 dark:hover:bg-emerald-950/30"
                    disabled={togglingExcalidrawId === excalResource.resource_item_id}
                    onClick={() =>
                      onToggleExcalidrawVisibility(
                        excalResource.resource_item_id,
                        excalResource.is_visible,
                      )
                    }
                  >
                    {togglingExcalidrawId === excalResource.resource_item_id ? (
                      <Loader2 className="size-3 mr-1 animate-spin" />
                    ) : (
                      <Eye className="size-3 mr-1" />
                    )}
                    Publish
                  </Button>
                )}

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon-sm" className="size-7">
                      <MoreVertical className="size-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-36">
                    <DropdownMenuItem
                      className="cursor-pointer text-destructive focus:text-destructive hover:bg-red-50 dark:hover:bg-red-950/20"
                      onClick={() =>
                        onRemoveExcalidraw(
                          excalResource.resource_item_id,
                          excalResource.title,
                        )
                      }
                    >
                      <Trash2 className="size-3 mr-2" />
                      Remove
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <Button variant="outline" size="sm" className="h-7 text-xs px-2.5" onClick={onAddExcalidraw}>
                <Plus className="size-3 mr-1" />
                Add Whiteboard
              </Button>
            )}
          </div>
        </div>
      </TableCell>
    </TableRow>
  );
}
