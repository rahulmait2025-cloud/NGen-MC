'use client';

import React, { useEffect, useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
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
  ArrowLeft,
  Loader2,
  Plus,
  Trash2,
  GripVertical,
  Upload,
  Globe,
  GlobeOff,
  Link2,
} from 'lucide-react';
import {
  getNoteCollectionAction,
  updateNoteCollectionAction,
  listNoteModulesAction,
  createNoteModuleAction,
  updateNoteModuleAction,
  deleteNoteModuleAction,
  reorderNoteModulesAction,
  listNotePagesAction,
  createNotePageAction,
  deleteNotePageAction,
  listNoteCourseLinksAction,
  upsertNoteCourseLinkAction,
  deleteNoteCourseLinkAction,
  listMasterCoursesForSelectorAction,
  getCourseCurriculumAction,
} from '../../notes-actions';

interface NoteCollection {
  id: string;
  title: string;
  slug: string;
  short_description: string | null;
  description_md: string | null;
  cover_image_path: string | null;
  publish_status: string;
  pricing_model: string;
  price_minor: number;
  currency: string;
  validity_days: number | null;
  visibility_scope: string;
  source_type: string | null;
  catalog_visibility: string | null;
  created_at: string;
  updated_at: string;
}

interface NoteModule {
  id: string;
  note_collection_id: string;
  title: string;
  slug: string;
  sort_order: number;
  is_published: boolean;
  created_at: string;
}

interface NotePage {
  id: string;
  note_module_id: string;
  image_path: string;
  title: string | null;
  image_mime: string | null;
  file_size_bytes: number | null;
  sort_order: number;
  created_at: string;
  signedUrl?: string | null;
}

interface NoteCourseLink {
  id: string;
  note_collection_id: string;
  course_id: string;
  module_id: string | null;
  item_id: string | null;
  auto_unlock_with_course: boolean;
  sort_order: number;
  created_at: string;
}

interface MasterCourseOption {
  id: string;
  title: string;
  code: string;
}

interface CurriculumModule {
  id: string;
  title: string;
  sort_order: number;
  items: CurriculumItem[];
}

interface CurriculumItem {
  id: string;
  title: string;
  kind: string;
  sort_order: number;
  module_id: string;
}

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export default function NoteEditPage({ params }: { params: Promise<{ noteId: string }> }) {
  const unwrappedParams = React.use(params);
  const noteId = unwrappedParams.noteId;
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab') || 'details';
  const initialModuleId = searchParams.get('moduleId');
  const [pending, startTransition] = useTransition();
  const [loading, setLoading] = useState(true);

  const [collection, setCollection] = useState<NoteCollection | null>(null);
  const [modules, setModules] = useState<NoteModule[]>([]);
  const [pagesByModule, setPagesByModule] = useState<Record<string, NotePage[]>>({});
  const [courseLinks, setCourseLinks] = useState<NoteCourseLink[]>([]);
  const [courseOptions, setCourseOptions] = useState<MasterCourseOption[]>([]);
  const [curriculum, setCurriculum] = useState<CurriculumModule[]>([]);

  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [shortDescription, setShortDescription] = useState('');
  const [descriptionMd, setDescriptionMd] = useState('');
  const [pricingModel, setPricingModel] = useState('free');
  const [priceMinor, setPriceMinor] = useState(0);
  const [currency, setCurrency] = useState('INR');
  const [validityDays, setValidityDays] = useState('');
  const [visibilityScope, setVisibilityScope] = useState('global');
  const [publishStatus, setPublishStatus] = useState('draft');
  const [sourceType, setSourceType] = useState<string>('standalone');
  const [catalogVisibility, setCatalogVisibility] = useState<string>('public_catalog');
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);

  const [showModuleForm, setShowModuleForm] = useState(false);
  const [editingModule, setEditingModule] = useState<NoteModule | null>(null);
  const [moduleTitle, setModuleTitle] = useState('');
  const [moduleSlug, setModuleSlug] = useState('');

  const [pageUploadModuleId, setPageUploadModuleId] = useState<string | null>(null);
  const [pageUploadItems, setPageUploadItems] = useState<{ file: File; title: string; altText: string }[]>([]);
  const [pageUploadProgress, setPageUploadProgress] = useState<{ current: number; total: number } | null>(null);

  const [linkCourseId, setLinkCourseId] = useState('');
  const [linkModuleId, setLinkModuleId] = useState('');
  const [linkItemId, setLinkItemId] = useState('');
  const [linkAutoUnlock, setLinkAutoUnlock] = useState(true);

  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

  // State for confirm dialog
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTitle, setConfirmTitle] = useState('');
  const [confirmDescription, setConfirmDescription] = useState('');
  const [onConfirmAction, setOnConfirmAction] = useState<(() => void) | null>(null);

  const triggerConfirm = (title: string, description: string, action: () => void) => {
    setConfirmTitle(title);
    setConfirmDescription(description);
    setOnConfirmAction(() => action);
    setConfirmOpen(true);
  };

  useEffect(() => {
    let cancelled = false;
    async function fetchData() {
      try {
        const [colRes, modRes, linkRes, courseRes] = await Promise.all([
          getNoteCollectionAction(noteId),
          listNoteModulesAction(noteId),
          listNoteCourseLinksAction(noteId),
          listMasterCoursesForSelectorAction(),
        ]);
        if (cancelled) return;

        if (!colRes.ok || !colRes.data) {
          toast.error('Failed to load collection');
          setLoading(false);
          return;
        }
        const col = colRes.data as NoteCollection;
        setCollection(col);
        setTitle(col.title);
        setSlug(col.slug);
        setShortDescription(col.short_description ?? '');
        setDescriptionMd(col.description_md ?? '');
        setPricingModel(col.pricing_model ?? 'free');
        setPriceMinor(col.price_minor ?? 0);
        setCurrency(col.currency ?? 'INR');
        setValidityDays(col.validity_days?.toString() ?? '');
        setVisibilityScope(col.visibility_scope ?? 'global');
        setPublishStatus(col.publish_status ?? 'draft');
        setSourceType(col.source_type ?? 'standalone');
        setCatalogVisibility(col.catalog_visibility ?? 'public_catalog');
        if (col.cover_image_path) setCoverPreview(col.cover_image_path);

        if (modRes.ok && modRes.data) setModules(modRes.data as NoteModule[]);
        if (linkRes.ok && linkRes.data) setCourseLinks(linkRes.data as NoteCourseLink[]);
        if (courseRes.ok && courseRes.data) setCourseOptions(courseRes.data as MasterCourseOption[]);

        // For course-linked notes, fetch curriculum for each linked course to show module/video names
        if (col.source_type === 'course_linked' && linkRes.ok && linkRes.data) {
          const links = linkRes.data as NoteCourseLink[];
          const uniqueCourseIds = [...new Set(links.map((l) => l.course_id).filter(Boolean))];
          const allCurriculum: CurriculumModule[] = [];
          for (const cid of uniqueCourseIds) {
            const currRes = await getCourseCurriculumAction(cid);
            if (!cancelled && currRes.ok && currRes.data) {
              const data = currRes.data as { modules: CurriculumModule[] };
              allCurriculum.push(...(data.modules ?? []));
            }
          }
          if (!cancelled && allCurriculum.length > 0) {
            setCurriculum(allCurriculum);
          }
        }
      } catch {
        if (!cancelled) toast.error('Failed to load data');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchData();
    return () => { cancelled = true; };
  }, [noteId]);

  useEffect(() => {
    if (modules.length === 0) return;
    setExpandedModules((prev) => {
      const next = new Set(prev);
      // Always expand all modules for course-linked notes
      if (sourceType === 'course_linked') {
        modules.forEach((m) => next.add(m.id));
      }
      // Also expand the initial module from URL params
      if (initialModuleId) {
        next.add(initialModuleId);
      }
      return next;
    });
  }, [modules, sourceType, initialModuleId]);

  useEffect(() => {
    if (expandedModules.size === 0) return;
    let cancelled = false;
    async function fetchPages() {
      for (const moduleId of expandedModules) {
        if (pagesByModule[moduleId]) continue;
        const res = await listNotePagesAction(moduleId);
        if (cancelled) return;
        if (res.ok && res.data) {
          const pages = res.data as NotePage[];
          const withUrls = pages.map((p) => ({
            ...p,
            signedUrl: `/api/notes/pages/${p.id}/image`,
          }));
          if (!cancelled) setPagesByModule((prev) => ({ ...prev, [moduleId]: withUrls }));
        }
      }
    }
    fetchPages();
    return () => { cancelled = true; };
  }, [expandedModules, pagesByModule]);

  // Fetch curriculum when selecting a course for linking
  useEffect(() => {
    if (!linkCourseId) {
      setCurriculum([]);
      setLinkModuleId('');
      setLinkItemId('');
      return;
    }
    let cancelled = false;
    getCourseCurriculumAction(linkCourseId).then((res) => {
      if (cancelled) return;
      if (res.ok && res.data) {
        const data = res.data as { modules: CurriculumModule[] };
        setCurriculum(data.modules ?? []);
      }
    });
    return () => { cancelled = true; };
  }, [linkCourseId]);

  function handleTitleChange(val: string) {
    setTitle(val);
    setSlug(generateSlug(val));
  }

  function handleModuleTitleChange(val: string) {
    setModuleTitle(val);
    setModuleSlug(generateSlug(val));
  }

  function handleCoverFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setCoverFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setCoverPreview(reader.result as string);
    reader.readAsDataURL(file);
  }

  async function refreshModules() {
    const res = await listNoteModulesAction(noteId);
    if (res.ok && res.data) setModules(res.data as NoteModule[]);
  }

  async function refreshPages(moduleId: string) {
    const res = await listNotePagesAction(moduleId);
    if (res.ok && res.data) {
      const pages = res.data as NotePage[];
      const withUrls = pages.map((p) => ({
        ...p,
        signedUrl: `/api/notes/pages/${p.id}/image`,
      }));
      setPagesByModule((prev) => ({ ...prev, [moduleId]: withUrls }));
    }
  }

  async function refreshCourseLinks() {
    const res = await listNoteCourseLinksAction(noteId);
    if (res.ok && res.data) setCourseLinks(res.data as NoteCourseLink[]);
  }

  function handleDetailsSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const fd = new FormData();
      fd.append('title', title);
      fd.append('slug', slug);
      fd.append('short_description', shortDescription);
      fd.append('description_md', descriptionMd);
      fd.append('pricing_model', pricingModel);
      fd.append('price_minor', priceMinor.toString());
      fd.append('currency', currency);
      fd.append('validity_days', validityDays);
      fd.append('visibility_scope', visibilityScope);
      fd.append('publish_status', publishStatus);
      fd.append('source_type', sourceType);
      fd.append('catalog_visibility', catalogVisibility);

      if (coverFile) {
        const uploadFd = new FormData();
        uploadFd.append('file', coverFile);
        uploadFd.append('collection_id', noteId);
        try {
          const resp = await fetch('/api/upload/note-cover', { method: 'POST', body: uploadFd });
          if (resp.ok) {
            const result = await resp.json();
            fd.append('cover_image_path', result.storagePath);
          }
        } catch {
          // continue without cover update
        }
      }

      const result = await updateNoteCollectionAction(noteId, fd);
      if (!result.ok) {
        toast.error(result.error || 'Failed to update');
        return;
      }
      toast.success('Collection updated');
      router.refresh();
    });
  }

  async function handleTogglePublish() {
    const newStatus = publishStatus === 'published' ? 'draft' : 'published';
    const fd = new FormData();
    fd.append('publish_status', newStatus);
    const result = await updateNoteCollectionAction(noteId, fd);
    if (!result.ok) {
      toast.error(result.error || 'Failed to update status');
      return;
    }
    setPublishStatus(newStatus);
    toast.success(newStatus === 'published' ? 'Collection published' : 'Collection unpublished');
    router.refresh();
  }

  function handleModuleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const fd = new FormData();
      fd.append('title', moduleTitle);
      fd.append('slug', moduleSlug);

      const result = editingModule
        ? await updateNoteModuleAction(editingModule.id, fd)
        : await createNoteModuleAction(noteId, fd);

      if (!result.ok) {
        toast.error(result.error || 'Failed to save module');
        return;
      }
      toast.success(editingModule ? 'Module updated' : 'Module created');
      setShowModuleForm(false);
      setEditingModule(null);
      setModuleTitle('');
      setModuleSlug('');
      await refreshModules();
    });
  }

  function handleModuleDelete(moduleId: string) {
    triggerConfirm(
      'Delete module?',
      'Are you sure you want to delete this module and all its pages? This action cannot be undone.',
      () => {
        startTransition(async () => {
          const result = await deleteNoteModuleAction(moduleId);
          if (!result.ok) {
            toast.error(result.error || 'Failed to delete');
            return;
          }
          toast.success('Module deleted');
          setModules((prev) => prev.filter((m) => m.id !== moduleId));
          setPagesByModule((prev) => {
            const next = { ...prev };
            delete next[moduleId];
            return next;
          });
        });
      }
    );
  }

  function handleModuleReorder(moduleId: string, direction: 'up' | 'down') {
    const idx = modules.findIndex((m) => m.id === moduleId);
    if (idx === -1) return;
    const newIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= modules.length) return;
    const next = [...modules];
    [next[idx], next[newIdx]] = [next[newIdx], next[idx]];
    setModules(next);
    startTransition(async () => {
      const result = await reorderNoteModulesAction(
        noteId,
        next.map((m) => m.id),
      );
      if (!result.ok) {
        toast.error(result.error || 'Failed to reorder');
        await refreshModules();
      }
    });
  }

  function handlePageUpload(moduleId: string) {
    if (pageUploadItems.length === 0) {
      toast.error('Select at least one file');
      return;
    }
    startTransition(async () => {
      const totalPages = pageUploadItems.length;
      setPageUploadProgress({ current: 0, total: totalPages });
      let successCount = 0;
      let failCount = 0;
      const existingPages = pagesByModule[moduleId]?.length || 0;

      for (let i = 0; i < totalPages; i++) {
        setPageUploadProgress({ current: i + 1, total: totalPages });
        const item = pageUploadItems[i];
        const fd = new FormData();
        fd.append('note_module_id', moduleId);
        fd.append('collection_id', noteId);
        fd.append('file', item.file);
        fd.append('title', item.title);
        fd.append('alt_text', item.altText);
        fd.append('sort_order', (existingPages + i).toString());
        const result = await createNotePageAction(fd);
        if (result.ok) {
          successCount++;
        } else {
          failCount++;
        }
      }

      setPageUploadProgress(null);
      if (failCount === 0) {
        toast.success(`${successCount} page${successCount !== 1 ? 's' : ''} uploaded`);
      } else {
        toast.warning(`${successCount} uploaded, ${failCount} failed`);
      }
      setPageUploadItems([]);
      setPageUploadModuleId(null);
      await refreshPages(moduleId);
    });
  }

  function handlePageDelete(moduleId: string, pageId: string, storagePath: string) {
    triggerConfirm(
      'Delete page?',
      'Are you sure you want to delete this page? This action cannot be undone.',
      () => {
        startTransition(async () => {
          const result = await deleteNotePageAction(pageId, storagePath);
          if (!result.ok) {
            toast.error(result.error || 'Failed to delete');
            return;
          }
          toast.success('Page deleted');
          await refreshPages(moduleId);
        });
      }
    );
  }

  function handleCourseLinkAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!linkCourseId) {
      toast.error('Select a course');
      return;
    }
    startTransition(async () => {
      const fd = new FormData();
      fd.append('note_collection_id', noteId);
      fd.append('course_id', linkCourseId);
      if (linkModuleId) fd.append('module_id', linkModuleId);
      if (linkItemId) fd.append('item_id', linkItemId);
      fd.append('auto_unlock_with_course', linkAutoUnlock.toString());
      const result = await upsertNoteCourseLinkAction(fd);
      if (!result.ok) {
        toast.error(result.error || 'Failed to link');
        return;
      }
      toast.success('Course linked');
      setLinkCourseId('');
      setLinkModuleId('');
      setLinkItemId('');
      setLinkAutoUnlock(true);
      await refreshCourseLinks();
    });
  }

  function handleCourseLinkDelete(linkId: string) {
    triggerConfirm(
      'Remove course link?',
      'Are you sure you want to remove this course link?',
      () => {
        startTransition(async () => {
          const result = await deleteNoteCourseLinkAction(linkId);
          if (!result.ok) {
            toast.error(result.error || 'Failed to remove');
            return;
          }
          toast.success('Link removed');
          setCourseLinks((prev) => prev.filter((l) => l.id !== linkId));
        });
      }
    );
  }

  function toggleModule(moduleId: string) {
    setExpandedModules((prev) => {
      const next = new Set(prev);
      if (next.has(moduleId)) next.delete(moduleId);
      else next.add(moduleId);
      return next;
    });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!collection) {
    return (
      <div className="space-y-6 pb-16">
        <Button variant="ghost" size="sm" asChild className="text-muted-foreground">
          <Link href="/notes">
            <ArrowLeft className="size-4 mr-1" /> Back
          </Link>
        </Button>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Collection not found.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild className="text-muted-foreground">
            <Link href="/notes">
              <ArrowLeft className="size-4 mr-1" /> Back
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">{collection.title}</h1>
            <p className="text-sm text-muted-foreground font-mono">{collection.slug}</p>
          </div>
        </div>
        <Button
          variant={publishStatus === 'published' ? 'default' : 'outline'}
          size="sm"
          onClick={handleTogglePublish}
          className={publishStatus === 'published'
            ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
            : 'text-muted-foreground'
          }
        >
          {publishStatus === 'published' ? (
            <>
              <Globe className="size-3.5 mr-1.5" />
              Published — Unpublish
            </>
          ) : (
            <>
              <GlobeOff className="size-3.5 mr-1.5" />
              Draft — Publish
            </>
          )}
        </Button>
      </div>

      {sourceType === 'course_linked' && (
        <p className="text-xs text-muted-foreground -mt-3">
          {publishStatus === 'published'
            ? 'Students with active course access can see this note. Unpublish to hide it.'
            : 'Publishing this note makes it available to students who already have access to the linked course.'
          }
        </p>
      )}

      <Tabs defaultValue={initialTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="modules">Modules ({modules.length})</TabsTrigger>
          <TabsTrigger value="pages">Pages</TabsTrigger>
          <TabsTrigger value="course-links">Course Links ({courseLinks.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="details">
          <form onSubmit={handleDetailsSubmit} className="space-y-6">
            {sourceType === 'course_linked' && (
              <Card className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30">
                <CardContent className="pt-4">
                  <div className="flex items-start gap-3">
                    <Link2 className="size-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                        Course-Linked Note
                      </p>
                      <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
                        This note is linked to one or more courses. Access is derived from course enrollment.
                        Pricing is managed by the course. The note is not listed in the standalone notes catalog.
                      </p>
                      {courseLinks.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {courseLinks.map((link) => (
                            <span key={link.id} className="inline-flex items-center rounded-md bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800 dark:bg-amber-900/50 dark:text-amber-300">
                              {courseOptions.find((c) => c.id === link.course_id)?.title ?? link.course_id?.slice(0, 8)}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Title *</Label>
                    <Input id="title" value={title} onChange={(e) => handleTitleChange(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="slug">Slug *</Label>
                    <Input id="slug" value={slug} onChange={(e) => setSlug(e.target.value)} required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="short_description">Short Description</Label>
                  <Textarea id="short_description" value={shortDescription} onChange={(e) => setShortDescription(e.target.value)} rows={2} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description_md">Description (Markdown)</Label>
                  <Textarea id="description_md" value={descriptionMd} onChange={(e) => setDescriptionMd(e.target.value)} rows={6} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Cover Image</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {coverPreview && (
                  <div className="relative w-full max-w-md aspect-video rounded-lg overflow-hidden border">
                    <Image src={coverPreview} alt="Cover preview" fill className="object-cover" unoptimized />
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="cover_image">Upload Cover Image</Label>
                  <Input id="cover_image" type="file" accept="image/*" onChange={handleCoverFileChange} />
                </div>
              </CardContent>
            </Card>

            {sourceType !== 'course_linked' && (
              <Card>
                <CardHeader>
                  <CardTitle>Pricing</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Pricing Model</Label>
                      <Select value={pricingModel} onValueChange={setPricingModel}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="free">Free</SelectItem>
                          <SelectItem value="paid">Paid</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {pricingModel === 'paid' && (
                      <>
                        <div className="space-y-2">
                          <Label htmlFor="price_minor">Price (₹)</Label>
                          <Input id="price_minor" type="number" min="0" value={priceMinor} onChange={(e) => setPriceMinor(Number(e.target.value))} />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="currency">Currency</Label>
                          <Input id="currency" value={currency} onChange={(e) => setCurrency(e.target.value)} />
                        </div>
                      </>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="validity_days">Validity (days)</Label>
                    <Input id="validity_days" type="number" min="1" value={validityDays} onChange={(e) => setValidityDays(e.target.value)} placeholder="No expiry" />
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Visibility & Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Visibility Scope</Label>
                    <Select value={visibilityScope} onValueChange={setVisibilityScope}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="global">Global</SelectItem>
                        <SelectItem value="selected_colleges">Selected Colleges</SelectItem>
                        <SelectItem value="private">Private</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Publish Status</Label>
                    <Select value={publishStatus} onValueChange={setPublishStatus}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="published">Published</SelectItem>
                        <SelectItem value="unpublished">Unpublished</SelectItem>
                        <SelectItem value="archived">Archived</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-3">
              <Button type="submit" disabled={pending}>
                {pending ? <><Loader2 className="size-4 mr-2 animate-spin" /> Saving...</> : 'Save Changes'}
              </Button>
              <Button type="button" variant="outline" onClick={() => router.push('/notes')} disabled={pending}>
                Cancel
              </Button>
            </div>
          </form>
        </TabsContent>

        <TabsContent value="modules">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">
                  {sourceType === 'course_linked' ? 'Sections' : 'Modules'}
                </h2>
                {sourceType === 'course_linked' && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    This section is only used to organize pages inside this video note.
                  </p>
                )}
              </div>
              <Button
                size="sm"
                onClick={() => {
                  setShowModuleForm(true);
                  setEditingModule(null);
                  setModuleTitle('');
                  setModuleSlug('');
                }}
              >
                <Plus className="size-4 mr-1" /> Add Module
              </Button>
            </div>

            {showModuleForm && (
              <Card>
                <CardHeader>
                  <CardTitle>{editingModule ? 'Edit Module' : 'New Module'}</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleModuleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="module_title">Title *</Label>
                        <Input id="module_title" value={moduleTitle} onChange={(e) => handleModuleTitleChange(e.target.value)} required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="module_slug">Slug *</Label>
                        <Input id="module_slug" value={moduleSlug} onChange={(e) => setModuleSlug(e.target.value)} required />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button type="submit" size="sm" disabled={pending}>
                        {pending ? <Loader2 className="size-4 animate-spin" /> : editingModule ? 'Update' : 'Create'}
                      </Button>
                      <Button type="button" variant="outline" size="sm" onClick={() => { setShowModuleForm(false); setEditingModule(null); }}>
                        Cancel
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}

            {modules.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center">
                  {sourceType === 'course_linked' ? (
                    <div className="space-y-2">
                      <p className="text-muted-foreground">No sections yet. Create a default section to start adding pages.</p>
                      <Button
                        size="sm"
                        onClick={() => {
                          setModuleTitle(`${title} - Notes`);
                          setModuleSlug(generateSlug(`${title} - Notes`));
                          setShowModuleForm(true);
                        }}
                      >
                        <Plus className="size-4 mr-1" /> Create default section
                      </Button>
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No modules yet. Add your first module.</p>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {modules.map((mod, index) => (
                  <div key={mod.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="flex flex-col gap-0.5">
                        <Button variant="ghost" size="sm" className="size-6 p-0" disabled={index === 0} onClick={() => handleModuleReorder(mod.id, 'up')}>
                          <GripVertical className="size-3 rotate-180" />
                        </Button>
                        <Button variant="ghost" size="sm" className="size-6 p-0" disabled={index === modules.length - 1} onClick={() => handleModuleReorder(mod.id, 'down')}>
                          <GripVertical className="size-3" />
                        </Button>
                      </div>
                      <div>
                        <div className="font-medium">{mod.title}</div>
                        <div className="text-sm text-muted-foreground font-mono">{mod.slug}</div>
                      </div>
                      <Badge variant={mod.is_published ? 'default' : 'secondary'}>
                        {mod.is_published ? 'Published' : 'Draft'}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingModule(mod);
                          setModuleTitle(mod.title);
                          setModuleSlug(mod.slug);
                          setShowModuleForm(true);
                        }}
                      >
                        Edit
                      </Button>
                      <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleModuleDelete(mod.id)}>
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="pages">
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Pages</h2>
            {modules.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center">
                  {sourceType === 'course_linked' ? (
                    <div className="space-y-2">
                      <p className="text-muted-foreground">No sections yet. Create a default section first.</p>
                      <Button
                        size="sm"
                        onClick={() => {
                          setModuleTitle(`${title} - Notes`);
                          setModuleSlug(generateSlug(`${title} - Notes`));
                          setShowModuleForm(true);
                        }}
                      >
                        <Plus className="size-4 mr-1" /> Create default section
                      </Button>
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No modules yet. Create modules first to add pages.</p>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {modules.map((mod) => {
                  const isExpanded = expandedModules.has(mod.id);
                  const modPages = pagesByModule[mod.id] || [];
                  return (
                    <Card key={mod.id}>
                      <button type="button" className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/50 transition-colors" onClick={() => toggleModule(mod.id)}>
                        <div className="flex items-center gap-2">
                          <GripVertical className="size-4 text-muted-foreground" />
                          <div>
                            <div className="font-medium">{mod.title}</div>
                            <div className="text-sm text-muted-foreground">{modPages.length} page{modPages.length !== 1 ? 's' : ''}</div>
                          </div>
                        </div>
                        <svg className={`size-4 text-muted-foreground transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      {isExpanded && (
                        <div className="border-t p-4 space-y-4">
                          {modPages.length > 0 && (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                              {modPages.map((page) => (
                                <div key={page.id} className="relative group border rounded-lg overflow-hidden">
                                  {page.signedUrl ? (
                                    <button
                                      type="button"
                                      className="aspect-[3/4] relative cursor-zoom-in"
                                      onClick={() => setPreviewImageUrl(page.signedUrl ?? null)}
                                    >
                                      <Image src={page.signedUrl} alt={page.title || 'Note page'} fill className="object-cover" unoptimized />
                                    </button>
                                  ) : (
                                    <div className="aspect-[3/4] flex items-center justify-center bg-muted">
                                      <Loader2 className="size-5 animate-spin text-muted-foreground" />
                                    </div>
                                  )}
                                  <button
                                    type="button"
                                    className="absolute top-1 right-1 p-1 bg-destructive text-destructive-foreground rounded opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={() => handlePageDelete(mod.id, page.id, page.image_path)}
                                  >
                                    <Trash2 className="size-3" />
                                  </button>
                                  <div className="p-2 text-xs text-muted-foreground truncate">{page.title || 'Untitled'}</div>
                                </div>
                              ))}
                            </div>
                          )}
                          <div className="border-t pt-4">
                            <h4 className="text-sm font-medium mb-2">Upload Pages</h4>
                            <div className="space-y-3">
                              <div className="space-y-1">
                                <Label className="text-xs">Select Images</Label>
                                <Input
                                  type="file"
                                  accept="image/*"
                                  multiple
                                  onChange={(e) => {
                                    setPageUploadModuleId(mod.id);
                                    const newFiles = Array.from(e.target.files || []);
                                    const newItems = newFiles.map((file) => ({
                                      file,
                                      title: file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' '),
                                      altText: '',
                                    }));
                                    setPageUploadItems((prev) => [...prev, ...newItems]);
                                    e.target.value = '';
                                  }}
                                />
                              </div>

                              {pageUploadItems.length > 0 && pageUploadModuleId === mod.id && (
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <p className="text-xs text-muted-foreground">{pageUploadItems.length} file{pageUploadItems.length !== 1 ? 's' : ''} ready</p>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 text-xs text-destructive"
                                      onClick={() => { setPageUploadItems([]); setPageUploadModuleId(null); }}
                                    >
                                      Clear all
                                    </Button>
                                  </div>
                                  <div className="max-h-64 overflow-y-auto space-y-2">
                                    {pageUploadItems.map((item, idx) => {
                                      const previewUrl = URL.createObjectURL(item.file);
                                      return (
                                        <div key={idx} className="flex items-start gap-3 p-2 border rounded-lg bg-muted/30">
                                          <div className="relative w-16 h-20 flex-shrink-0 rounded overflow-hidden border">
                                            <Image src={previewUrl} alt={item.title} fill className="object-cover" unoptimized />
                                          </div>
                                          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                                            <div className="space-y-1">
                                              <Label className="text-[10px] text-muted-foreground">Title</Label>
                                              <Input
                                                value={item.title}
                                                onChange={(e) => {
                                                  const updated = [...pageUploadItems];
                                                  updated[idx] = { ...updated[idx], title: e.target.value };
                                                  setPageUploadItems(updated);
                                                }}
                                                className="h-7 text-xs"
                                              />
                                            </div>
                                            <div className="space-y-1">
                                              <Label className="text-[10px] text-muted-foreground">Alt Text</Label>
                                              <Input
                                                value={item.altText}
                                                onChange={(e) => {
                                                  const updated = [...pageUploadItems];
                                                  updated[idx] = { ...updated[idx], altText: e.target.value };
                                                  setPageUploadItems(updated);
                                                }}
                                                placeholder="Optional"
                                                className="h-7 text-xs"
                                              />
                                            </div>
                                          </div>
                                          <div className="flex flex-col gap-0.5 flex-shrink-0">
                                            <Button
                                              type="button"
                                              variant="ghost"
                                              size="sm"
                                              className="size-5 p-0"
                                              disabled={idx === 0}
                                              onClick={() => {
                                                const updated = [...pageUploadItems];
                                                [updated[idx - 1], updated[idx]] = [updated[idx], updated[idx - 1]];
                                                setPageUploadItems(updated);
                                              }}
                                            >
                                              <svg className="size-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
                                            </Button>
                                            <Button
                                              type="button"
                                              variant="ghost"
                                              size="sm"
                                              className="size-5 p-0"
                                              disabled={idx === pageUploadItems.length - 1}
                                              onClick={() => {
                                                const updated = [...pageUploadItems];
                                                [updated[idx], updated[idx + 1]] = [updated[idx + 1], updated[idx]];
                                                setPageUploadItems(updated);
                                              }}
                                            >
                                              <svg className="size-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                            </Button>
                                            <Button
                                              type="button"
                                              variant="ghost"
                                              size="sm"
                                              className="size-5 p-0 text-destructive"
                                              onClick={() => {
                                                setPageUploadItems((prev) => prev.filter((_, i) => i !== idx));
                                              }}
                                            >
                                              <Trash2 className="size-3" />
                                            </Button>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}

                              {pageUploadProgress && pageUploadModuleId === mod.id ? (
                                <div className="space-y-2">
                                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Loader2 className="size-4 animate-spin" />
                                    Uploading {pageUploadProgress.current} of {pageUploadProgress.total} ({Math.round((pageUploadProgress.current / pageUploadProgress.total) * 100)}%)
                                  </div>
                                  <div className="w-full bg-muted rounded-full h-2">
                                    <div
                                      className="bg-primary h-2 rounded-full transition-[width] duration-200 ease-[var(--ease-out)]"
                                      style={{ width: `${(pageUploadProgress.current / pageUploadProgress.total) * 100}%` }}
                                    />
                                  </div>
                                </div>
                              ) : (
                                <Button
                                  size="sm"
                                  disabled={pending || pageUploadItems.length === 0 || pageUploadModuleId !== mod.id}
                                  onClick={() => handlePageUpload(mod.id)}
                                >
                                  {pending ? <><Loader2 className="size-4 mr-2 animate-spin" /> Uploading...</> : <><Upload className="size-4 mr-1" /> Upload {pageUploadItems.length > 0 ? `(${pageUploadItems.length})` : ''}</>}
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="course-links">
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Course Links</h2>

            {/* Read-only info card for course-linked notes */}
            {sourceType === 'course_linked' && courseLinks.length > 0 ? (
              <>
                <Card className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30">
                  <CardContent className="pt-4">
                    <div className="flex items-start gap-3">
                      <Link2 className="size-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                          Course-linked Note
                        </p>
                        <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
                          This note is linked from the Course-linked Notes Manager. Students unlock it through course access.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Linked target summary */}
                {courseLinks.map((link) => {
                  const course = courseOptions.find((c) => c.id === link.course_id);
                  let moduleName: string | null = null;
                  let itemName: string | null = null;
                  if (link.module_id) {
                    for (const m of curriculum) {
                      if (m.id === link.module_id) {
                        moduleName = m.title;
                        if (link.item_id) {
                          for (const it of m.items) {
                            if (it.id === link.item_id) {
                              itemName = it.title;
                              break;
                            }
                          }
                        }
                        break;
                      }
                    }
                  }
                  return (
                    <Card key={link.id}>
                      <CardContent className="pt-4">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Course</span>
                            <span className="font-medium">{course?.title ?? link.course_id}</span>
                          </div>
                          {moduleName && (
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Course Module</span>
                              <span>{moduleName}</span>
                            </div>
                          )}
                          {itemName && (
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Linked Video</span>
                              <span>{itemName}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Auto-unlock</span>
                            <span>{link.auto_unlock_with_course ? 'Yes' : 'No'}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}

                <div className="flex gap-2">
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/notes/new?sourceType=course_linked">
                      Back to Course-linked Notes Manager
                    </Link>
                  </Button>
                </div>
              </>
            ) : courseLinks.length > 0 ? (
              /* Standalone notes: show existing course links with delete option */
              <div className="space-y-2">
                {courseLinks.map((link) => {
                  const course = courseOptions.find((c) => c.id === link.course_id);
                  let moduleName: string | null = null;
                  let itemName: string | null = null;
                  if (link.module_id) {
                    for (const m of curriculum) {
                      if (m.id === link.module_id) {
                        moduleName = m.title;
                        if (link.item_id) {
                          for (const it of m.items) {
                            if (it.id === link.item_id) {
                              itemName = it.title;
                              break;
                            }
                          }
                        }
                        break;
                      }
                    }
                  }
                  return (
                    <div key={link.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <div className="font-medium">{course?.title ?? link.course_id}</div>
                        <div className="text-sm text-muted-foreground">
                          Auto-unlock: {link.auto_unlock_with_course ? 'Yes' : 'No'}
                        </div>
                        {(moduleName || itemName) && (
                          <div className="text-xs text-muted-foreground mt-1">
                            {moduleName && <span>Module: {moduleName}</span>}
                            {moduleName && itemName && <span> → </span>}
                            {itemName && <span>Item: {itemName}</span>}
                          </div>
                        )}
                      </div>
                      <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleCourseLinkDelete(link.id)}>
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* No course links: show manual form for standalone notes only */
              sourceType !== 'course_linked' ? (
                <Card>
                  <CardHeader>
                    <CardTitle>Link to Course</CardTitle>
                    <CardDescription>Link this note collection to a master course.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleCourseLinkAdd} className="space-y-3">
                      <div className="flex flex-col sm:flex-row gap-3">
                        <div className="flex-1">
                          <Label className="text-xs mb-1 block">Course *</Label>
                          <Select value={linkCourseId} onValueChange={(v) => { setLinkCourseId(v); setLinkModuleId(''); setLinkItemId(''); }}>
                            <SelectTrigger><SelectValue placeholder="Select a course..." /></SelectTrigger>
                            <SelectContent>
                              {courseOptions.map((c) => (
                                <SelectItem key={c.id} value={c.id}>{c.title} ({c.code})</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        {linkCourseId && curriculum.length > 0 && (
                          <>
                            <div className="flex-1">
                              <Label className="text-xs mb-1 block">Module (optional)</Label>
                              <Select value={linkModuleId || '_all'} onValueChange={(v) => { setLinkModuleId(v === '_all' ? '' : v); setLinkItemId(''); }}>
                                <SelectTrigger><SelectValue placeholder="All modules" /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="_all">All modules</SelectItem>
                                  {curriculum.map((m) => (
                                    <SelectItem key={m.id} value={m.id}>{m.title}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            {linkModuleId && (() => {
                              const selectedModule = curriculum.find((m) => m.id === linkModuleId);
                              return selectedModule && selectedModule.items.length > 0;
                            })() && (
                              <div className="flex-1">
                                <Label className="text-xs mb-1 block">Item (optional)</Label>
                                <Select value={linkItemId || '_all'} onValueChange={(v) => setLinkItemId(v === '_all' ? '' : v)}>
                                  <SelectTrigger><SelectValue placeholder="All items" /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="_all">All items</SelectItem>
                                    {curriculum.find((m) => m.id === linkModuleId)?.items?.map((item) => (
                                      <SelectItem key={item.id} value={item.id}>{item.title}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <label className="flex items-center gap-2 text-sm">
                          <input type="checkbox" checked={linkAutoUnlock} onChange={(e) => setLinkAutoUnlock(e.target.checked)} className="rounded border-input" />
                          Auto-unlock
                        </label>
                        <Button type="submit" size="sm" disabled={pending || !linkCourseId}>
                          {pending ? <Loader2 className="size-4 animate-spin" /> : 'Link'}
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="py-8 text-center">
                    <p className="text-muted-foreground">No courses linked yet.</p>
                  </CardContent>
                </Card>
              )
            )}
          </div>
        </TabsContent>
      </Tabs>

      {previewImageUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 cursor-zoom-out"
          onClick={() => setPreviewImageUrl(null)}
        >
          <button
            type="button"
            className="absolute top-4 right-4 p-2 text-white/80 hover:text-white rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            onClick={() => setPreviewImageUrl(null)}
          >
            <svg className="size-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
          <Image
            src={previewImageUrl}
            alt="Preview"
            width={1200}
            height={900}
            unoptimized
            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmTitle}</AlertDialogTitle>
            <AlertDialogDescription>{confirmDescription}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (onConfirmAction) onConfirmAction();
              }}
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
