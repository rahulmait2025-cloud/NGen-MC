'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Pencil,
  FileText,
  Link as LinkIcon,
  HelpCircle,
  FileSpreadsheet,
  FileQuestion,
  ChevronUp,
  ChevronDown,
  Loader2,
  FolderOpen,
  Video,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { QuizEditor } from '@/components/master-courses/quiz-editor';

import {
  createModuleAction,
  updateModuleAction,
  deleteModuleAction,
  createItemAction,
  updateItemAction,
  deleteItemAction,
  reorderModulesAction,
  reorderItemsAction,
  uploadCourseResourceAction
} from '../structure-actions';
import type { MasterCourseModulesRow, MasterCourseItemsRow, MasterCourseItemType } from '@/types/database';

export interface CurriculumClientProps {
  course: { id: string; title: string; code: string };
  initialModules: (MasterCourseModulesRow & { items: MasterCourseItemsRow[] })[];
  videoAssets: { id: string; title: string }[];
}

const ITEM_TYPES: Array<{ value: MasterCourseItemType; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { value: 'video', label: 'Video', icon: Video },
  { value: 'document', label: 'Document', icon: FileText },
  { value: 'resource', label: 'General Resource', icon: FolderOpen },
  { value: 'assignment_placeholder', label: 'Assignment Placeholder', icon: FileSpreadsheet },
  { value: 'quiz_placeholder', label: 'Quiz Placeholder', icon: FileQuestion },
  { value: 'link', label: 'External Link', icon: LinkIcon },
  { value: 'note', label: 'Note', icon: HelpCircle },
  { value: 'worksheet', label: 'Worksheet', icon: FileText },
];

interface ModuleCardProps {
  mod: MasterCourseModulesRow & { items: MasterCourseItemsRow[] };
  modIdx: number;
  totalModules: number;
  onMoveModule: (index: number, direction: 'up' | 'down') => void;
  onEditModule: (mod: MasterCourseModulesRow) => void;
  onDeleteModule: (moduleId: string) => void;
  onMoveItem: (moduleId: string, itemIndex: number, direction: 'up' | 'down') => void;
  onEditItem: (moduleId: string, item: MasterCourseItemsRow) => void;
  onDeleteItem: (itemId: string) => void;
  onAddItem: (moduleId: string) => void;
}

function ModuleCard({
  mod, modIdx, totalModules, onMoveModule, onEditModule, onDeleteModule,
  onMoveItem, onEditItem, onDeleteItem, onAddItem,
}: ModuleCardProps) {
  return (
    <Card key={mod.id} className="overflow-hidden">
      <CardHeader className="bg-muted/50 py-4 border-b group flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-lg flex items-center gap-3">
            <Badge variant="outline">{modIdx + 1}</Badge>
            {mod.title}
            {mod.publish_status === 'published' ? (
              <Badge className="bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20 shadow-none border border-emerald-500/30 dark:text-emerald-400 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:hover:bg-emerald-500/20">Published</Badge>
            ) : (
              <Badge variant="secondary">Draft</Badge>
            )}
          </CardTitle>
          {mod.description && <p className="text-sm text-muted-foreground mt-1">{mod.description}</p>}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex flex-col gap-1 mr-4">
            <Button variant="ghost" size="icon" className="size-6" disabled={modIdx === 0} onClick={() => onMoveModule(modIdx, 'up')}>
              <ChevronUp className="size-4" />
            </Button>
            <Button variant="ghost" size="icon" className="size-6" disabled={modIdx === totalModules - 1} onClick={() => onMoveModule(modIdx, 'down')}>
              <ChevronDown className="size-4" />
            </Button>
          </div>
          <Button variant="outline" size="sm" onClick={() => onEditModule(mod)}>
            <Pencil className="size-4 mr-2" /> Edit
          </Button>
          <Button variant="outline" size="sm" className="text-destructive hover:bg-destructive/10" onClick={() => onDeleteModule(mod.id)}>
            <Trash2 className="size-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {mod.items.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground border-b border-dashed">
            This module is empty. Add a lesson or video to get started.
          </div>
        ) : (
          <div className="divide-y">
            {mod.items.map((item, itemIdx) => {
              const TypeIcon = ITEM_TYPES.find(t => t.value === item.item_type)?.icon || FileText;
              return (
                <div key={item.id} className="flex items-center justify-between p-4 bg-background hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="flex flex-col gap-1 items-center justify-center opacity-50 hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="size-5" disabled={itemIdx === 0} onClick={() => onMoveItem(mod.id, itemIdx, 'up')}>
                        <ChevronUp className="size-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="size-5" disabled={itemIdx === mod.items.length - 1} onClick={() => onMoveItem(mod.id, itemIdx, 'down')}>
                        <ChevronDown className="size-3" />
                      </Button>
                    </div>
                    <div className="size-10 flex items-center justify-center rounded bg-muted/80">
                      <TypeIcon className="size-5 text-muted-foreground" />
                    </div>
                    <div>
                      <div className="font-medium text-sm flex items-center gap-2">
                        {item.title}
                        {item.publish_status === 'published' ? (
                          <Badge className="bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20 shadow-none border border-emerald-500/30 text-[10px] px-1.5 py-0 dark:text-emerald-400 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:hover:bg-emerald-500/20">Published</Badge>
                        ) : (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Draft</Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground flex items-center gap-2 mt-1">
                        <span className="uppercase">{item.item_type.replace('_', ' ')}</span>
                        {item.video_asset_id && (
                          <span className="flex items-center text-blue-600 dark:text-blue-400">
                            <Video className="size-3 mr-1" />
                            Video Attached
                          </span>
                        )}
                        {item.item_type === 'quiz_placeholder' && (
                          <span className={`flex items-center ${item.quiz_id ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                            <FileQuestion className="size-3 mr-1" />
                            {item.quiz_id ? 'Quiz Configured' : 'No Quiz'}
                          </span>
                        )}
                        {(item.metadata as Record<string, string> | null)?.resource_filename && (
                          <span className="flex items-center text-emerald-600 dark:text-emerald-400 truncate max-w-xs">
                            <FileText className="size-3 mr-1 flex-shrink-0" />
                            {(item.metadata as Record<string, string>)?.resource_filename}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                     <Button variant="ghost" size="sm" onClick={() => onEditItem(mod.id, item)}>
                       <Pencil className="size-4" />
                     </Button>
                     <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10" onClick={() => onDeleteItem(item.id)}>
                       <Trash2 className="size-4" />
                     </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
        <div className="bg-muted/10 p-3 flex justify-center">
          <Button variant="ghost" size="sm" className="w-full text-muted-foreground" onClick={() => onAddItem(mod.id)}>
            <Plus className="size-4 mr-2" /> Add Lesson / Item
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function CurriculumClient({ course, initialModules, videoAssets }: CurriculumClientProps) {
  const { refresh } = useRouter();
  const [modules, setModules] = useState(initialModules);
  const prevInitialModulesRef = useRef(initialModules);
  const [loading, setLoading] = useState(false);

  if (initialModules !== prevInitialModulesRef.current) {
    prevInitialModulesRef.current = initialModules;
    setModules(initialModules);
  }

  // Modals state
  const [isModuleModalOpen, setIsModuleModalOpen] = useState(false);
  const [editingModule, setEditingModule] = useState<MasterCourseModulesRow | null>(null);
  
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MasterCourseItemsRow | null>(null);
  const activeModuleIdRef = useRef<string>('');
  const [itemTypeView, setItemTypeView] = useState<MasterCourseItemType>('video');
  const [resourceFile, setResourceFile] = useState<File | null>(null);
  const [isUploadingFile, setIsUploadingFile] = useState(false);

  // Quiz editor state
  const [isQuizEditorOpen, setIsQuizEditorOpen] = useState(false);
  const [quizEditorItemId, setQuizEditorItemId] = useState<string | null>(null);
  const [quizEditorModuleTitle, setQuizEditorModuleTitle] = useState<string>('');
  const [quizEditorModuleId, setQuizEditorModuleId] = useState<string | null>(null);

  // ─── Module Actions ──────────────────────────────────────────────────────────

  const handleSaveModule = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    formData.append('master_course_id', course.id);

    try {
      if (editingModule) {
        formData.append('module_id', editingModule.id);
        const res = await updateModuleAction(formData);
        if (res.ok) {
          toast.success('Module updated');
          refresh();
          setIsModuleModalOpen(false);
        } else throw new Error(res.error);
      } else {
        const res = await createModuleAction(formData);
        if (res.ok) {
          toast.success('Module created');
          refresh();
          setIsModuleModalOpen(false);
        } else throw new Error(res.error);
      }
    } catch {
      toast.error('Action failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteModule = async (moduleId: string) => {
    if (!confirm('Are you sure you want to delete this module and all its items?')) return;
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('module_id', moduleId);
      const res = await deleteModuleAction(fd);
      if (res.ok) {
        toast.success('Module deleted');
        refresh();
      } else throw new Error(res.error);
    } catch {
      toast.error('Action failed');
    } finally {
      setLoading(false);
    }
  };

  const handleMoveModule = async (index: number, direction: 'up' | 'down') => {
    if ((direction === 'up' && index === 0) || (direction === 'down' && index === modules.length - 1)) return;
    
    const newModules = [...modules];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    [newModules[index], newModules[targetIdx]] = [newModules[targetIdx], newModules[index]];
    
    setModules(newModules); // Optimistic UI
    
    try {
      await reorderModulesAction(course.id, newModules.map(m => m.id));
      refresh();
    } catch {
      toast.error('Failed to reorder modules');
      setModules(initialModules); // Revert
    }
  };

  // ─── Item Actions ───────────────────────────────────────────────────────────

  const handleSaveItem = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    formData.append('master_course_id', course.id);
    formData.append('module_id', activeModuleIdRef.current);

    try {
      let finalMetadata: Record<string, string> = { ...(editingItem?.metadata as Record<string, unknown> || {}) as Record<string, string> };

      // If there's a file attached to upload
      if (resourceFile) {
        setIsUploadingFile(true);
        const fileFd = new FormData();
        fileFd.append('master_course_id', course.id);
        fileFd.append('file', resourceFile);
        const uploadRes = await uploadCourseResourceAction(fileFd);
        setIsUploadingFile(false);

        if (!uploadRes.ok || !uploadRes.data) {
           throw new Error(uploadRes.error || 'File upload failed');
        }

        finalMetadata = {
           ...finalMetadata,
           resource_url: uploadRes.data.url,
           resource_filename: resourceFile.name,
        };
      }

      formData.append('metadata', JSON.stringify(finalMetadata));

      if (editingItem) {
        formData.append('item_id', editingItem.id);
        const res = await updateItemAction(formData);
        if (res.ok) {
          toast.success('Item updated');
          refresh();
          setIsItemModalOpen(false);
          setResourceFile(null);
        } else throw new Error(res.error);
      } else {
        const res = await createItemAction(formData);
        if (res.ok) {
          toast.success('Item created');
          refresh();
          setIsItemModalOpen(false);
          setResourceFile(null);
        } else throw new Error(res.error);
      }
    } catch {
      toast.error('Action failed');
      setIsUploadingFile(false);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return;
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('item_id', itemId);
      const res = await deleteItemAction(fd);
      if (res.ok) {
        toast.success('Item deleted');
        refresh();
      } else throw new Error(res.error);
    } catch {
      toast.error('Action failed');
    } finally {
      setLoading(false);
    }
  };

  const handleMoveItem = async (moduleId: string, itemIndex: number, direction: 'up' | 'down') => {
    const moduleObj = modules.find(m => m.id === moduleId);
    if (!moduleObj) return;
    
    if ((direction === 'up' && itemIndex === 0) || (direction === 'down' && itemIndex === moduleObj.items.length - 1)) return;

    const newItems = [...moduleObj.items];
    const targetIdx = direction === 'up' ? itemIndex - 1 : itemIndex + 1;
    [newItems[itemIndex], newItems[targetIdx]] = [newItems[targetIdx], newItems[itemIndex]];

    const newModules = modules.map(m => m.id === moduleId ? { ...m, items: newItems } : m);
    setModules(newModules);

    try {
      await reorderItemsAction(moduleId, newItems.map(i => i.id));
      refresh();
    } catch {
      toast.error('Failed to reorder items');
      setModules(initialModules);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild className="text-muted-foreground">
            <Link href={`/master-courses/${course.id}`}>
              <ArrowLeft className="size-4 mr-1" /> Back
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Curriculum Builder</h1>
            <p className="text-sm text-muted-foreground font-mono">{course.code} - {course.title}</p>
          </div>
        </div>
        <Button onClick={() => { setEditingModule(null); setIsModuleModalOpen(true); }}>
          <Plus className="size-4 mr-2" /> Add Module
        </Button>
      </div>

      {modules.length === 0 ? (
        <Card className="flex flex-col items-center justify-center p-12 border-dashed">
          <div className="rounded-full bg-muted p-4 mb-4">
            <Plus className="size-8 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-medium">No Curriculum Yet</h3>
          <p className="text-muted-foreground text-center mt-2 max-w-md">
            Start structuring your course by adding modules. Once modules are created, you can insert lessons, videos, and worksheets into them.
          </p>
          <Button className="mt-6" onClick={() => { setEditingModule(null); setIsModuleModalOpen(true); }}>
            Add First Module
          </Button>
        </Card>
      ) : (
        <div className="space-y-6">
          {modules.map((mod, modIdx) => (
            <ModuleCard
              key={mod.id}
              mod={mod}
              modIdx={modIdx}
              totalModules={modules.length}
              onMoveModule={handleMoveModule}
              onEditModule={(m) => { setEditingModule(m); setIsModuleModalOpen(true); }}
              onDeleteModule={handleDeleteModule}
              onMoveItem={handleMoveItem}
              onEditItem={(moduleId, item) => {
                if (item.item_type === 'quiz_placeholder') {
                  const mod = modules.find((m) => m.id === moduleId);
                  setQuizEditorItemId(item.id);
                  setQuizEditorModuleTitle(mod?.title ?? '');
                  setQuizEditorModuleId(moduleId);
                  setIsQuizEditorOpen(true);
                } else {
                  activeModuleIdRef.current = moduleId;
                  setEditingItem(item);
                  setItemTypeView(item.item_type);
                  setResourceFile(null);
                  setIsItemModalOpen(true);
                }
              }}
              onDeleteItem={handleDeleteItem}
              onAddItem={(moduleId) => {
                activeModuleIdRef.current = moduleId;
                setEditingItem(null);
                setItemTypeView('video');
                setResourceFile(null);
                setIsItemModalOpen(true);
              }}
            />
          ))}
        </div>
      )}

      {/* Module Modal */}
      <Dialog open={isModuleModalOpen} onOpenChange={setIsModuleModalOpen}>
        <DialogContent>
          <form onSubmit={handleSaveModule}>
            <DialogHeader>
              <DialogTitle>{editingModule ? 'Edit Module' : 'Create Module'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input id="title" name="title" defaultValue={editingModule?.title || ''} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" name="description" defaultValue={editingModule?.description || ''} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="publish_status">Status</Label>
                <Select name="publish_status" defaultValue={editingModule?.publish_status || 'draft'}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="unpublished">Unpublished</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
               <Button type="button" variant="ghost" onClick={() => setIsModuleModalOpen(false)}>Cancel</Button>
               <Button type="submit" disabled={loading}>
                 {loading && <Loader2 className="mr-2 size-4 animate-spin" />} Save Module
               </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Item Modal */}
      <Dialog open={isItemModalOpen} onOpenChange={setIsItemModalOpen}>
        <DialogContent>
          <form onSubmit={handleSaveItem}>
            <DialogHeader>
              <DialogTitle>{editingItem ? 'Edit Item' : 'Add Item'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="item_type">Item Type *</Label>
                <Select name="item_type" value={itemTypeView} onValueChange={(val: MasterCourseItemType) => setItemTypeView(val)} required>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ITEM_TYPES.map(t => (
                      <SelectItem key={t.value} value={t.value}>
                        <div className="flex items-center"><t.icon className="size-4 mr-2 text-muted-foreground" /> {t.label}</div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="item_title">Title *</Label>
                <Input id="item_title" name="title" defaultValue={editingItem?.title || ''} required />
              </div>

              {itemTypeView === 'video' && (
                <div className="space-y-2">
                  <Label htmlFor="video_asset_id">Link Video Asset (Optional)</Label>
                  <Select name="video_asset_id" defaultValue={editingItem?.video_asset_id || ''}>
                    <SelectTrigger><SelectValue placeholder="No Video Attached" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__no_video__">No Video Attached</SelectItem>
                      {videoAssets.map(v => (
                        <SelectItem key={v.id} value={v.id}>{v.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">Select a registered video from TPStreams to be the main content of this lesson.</p>
                </div>
              )}

              {['document', 'resource', 'worksheet', 'note'].includes(itemTypeView) && (
                <div className="space-y-2 p-4 border rounded-md bg-muted/30">
                  <Label>Attach File (PDF, Docs, General files)</Label>
                  <Input type="file" onChange={e => setResourceFile(e.target.files?.[0] || null)} />
                  {editingItem && (editingItem.metadata as Record<string, string> | null)?.resource_filename && !resourceFile && (
                    <p className="text-xs text-muted-foreground mt-2 flex items-center">
                      <FileText className="size-3 mr-1" />
                      Currently attached: {(editingItem.metadata as Record<string, string>)?.resource_filename}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">Files are securely stored in the course_resources bucket.</p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="item_description">Instructions / Description</Label>
                <Textarea id="item_description" name="description" defaultValue={editingItem?.description || ''} />
              </div>
            </div>
            <DialogFooter>
               <Button type="button" variant="ghost" onClick={() => setIsItemModalOpen(false)}>Cancel</Button>
               <Button type="submit" disabled={loading || isUploadingFile}>
                 {(loading || isUploadingFile) && <Loader2 className="mr-2 size-4 animate-spin" />} 
                 {isUploadingFile ? 'UpLoading...' : 'Save Item'}
               </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Quiz Editor */}
      <Dialog open={isQuizEditorOpen} onOpenChange={setIsQuizEditorOpen}>
        <DialogContent
          className="sm:max-w-3xl max-h-[90vh] h-[90vh] flex flex-col gap-0 p-0 overflow-hidden"
          data-lenis-prevent
        >
          {quizEditorItemId && quizEditorModuleId && (
            <QuizEditor
              itemId={quizEditorItemId}
              moduleId={quizEditorModuleId}
              masterCourseId={course.id}
              courseTitle={`${course.title} — ${quizEditorModuleTitle}`}
              moduleItems={modules.find((m) => m.id === quizEditorModuleId)?.items}
              onClose={() => {
                setIsQuizEditorOpen(false);
                setQuizEditorItemId(null);
                setQuizEditorModuleId(null);
                refresh();
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
