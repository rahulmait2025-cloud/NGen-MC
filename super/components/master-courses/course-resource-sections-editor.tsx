"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  listCourseResourceSectionsAction,
  createCourseResourceSectionAction,
  updateCourseResourceSectionAction,
  deleteCourseResourceSectionAction,
  listCourseResourceItemsAction,
  createCourseResourceItemAction,
  updateCourseResourceItemAction,
  deleteCourseResourceItemAction,
  listNoteCollectionsAction,
} from "@/app/(app)/notes/notes-actions";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface CourseResourceSectionsEditorProps {
  courseId: string;
}

type ItemKind = "external_link" | "note_collection" | "markdown_text" | "file_link" | "excalidraw_link";

interface CourseResourceSection {
  id: string;
  course_id: string | null;
  title: string;
  icon: string | null;
  sort_order: number;
  visibility: "per_course" | "global";
  created_at: string;
  updated_at: string;
}

interface CourseResourceItem {
  id: string;
  section_id: string;
  kind: ItemKind;
  title: string;
  subtitle: string | null;
  icon: string | null;
  external_url: string | null;
  note_collection_id: string | null;
  file_path: string | null;
  markdown_body: string | null;
  excalidraw_url: string | null;
  sort_order: number;
  open_in_new_tab: boolean;
  is_visible: boolean;
  created_at: string;
  updated_at: string;
}

interface NoteCollection {
  id: string;
  title: string;
}

interface SectionFormState {
  title: string;
  icon: string;
  visibility: "per_course" | "global";
}

interface ItemFormState {
  kind: ItemKind;
  title: string;
  subtitle: string;
  icon: string;
  external_url: string;
  note_collection_id: string;
  file_path: string;
  markdown_body: string;
  excalidraw_url: string;
  sort_order: number;
  open_in_new_tab: boolean;
  is_visible: boolean;
}

const defaultSectionForm: SectionFormState = {
  title: "",
  icon: "",
  visibility: "per_course",
};

const defaultItemForm: ItemFormState = {
  kind: "external_link",
  title: "",
  subtitle: "",
  icon: "",
  external_url: "",
  note_collection_id: "",
  file_path: "",
  markdown_body: "",
  excalidraw_url: "",
  sort_order: 0,
  open_in_new_tab: true,
  is_visible: true,
};

const ITEM_KIND_LABELS: Record<ItemKind, string> = {
  external_link: "External Link",
  note_collection: "Note Collection",
  markdown_text: "Markdown Text",
  file_link: "File Link",
  excalidraw_link: "Excalidraw Link",
};

const ITEM_KIND_OPTIONS: ItemKind[] = [
  "external_link",
  "note_collection",
  "markdown_text",
  "file_link",
  "excalidraw_link",
];

export default function CourseResourceSectionsEditor({
  courseId,
}: CourseResourceSectionsEditorProps) {
  const [sections, setSections] = useState<CourseResourceSection[]>([]);
  const [itemsBySection, setItemsBySection] = useState<
    Record<string, CourseResourceItem[]>
  >({});
  const [expandedSections, setExpandedSections] = useState<
    Record<string, boolean>
  >({});
  const [noteCollections, setNoteCollections] = useState<NoteCollection[]>([]);

  const [sectionForm, setSectionForm] =
    useState<SectionFormState>(defaultSectionForm);
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [editingSectionForm, setEditingSectionForm] =
    useState<SectionFormState>(defaultSectionForm);

  const [itemFormsBySection, setItemFormsBySection] = useState<
    Record<string, ItemFormState>
  >({});
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingItemForm, setEditingItemForm] =
    useState<ItemFormState>(defaultItemForm);

  const [isPending, startTransition] = useTransition();
  const [loadingSections, setLoadingSections] = useState(true);
  const [loadingItems, setLoadingItems] = useState<Record<string, boolean>>({});

  const loadSections = useCallback(async () => {
    setLoadingSections(true);
    try {
      const result = await listCourseResourceSectionsAction(courseId);
      if (result.ok) {
        setSections(result.data as CourseResourceSection[]);
      } else {
        toast.error(result.error ?? "Failed to load sections");
      }
    } catch {
      toast.error("Failed to load sections");
    } finally {
      setLoadingSections(false);
    }
  }, [courseId]);

  const loadNoteCollections = useCallback(async () => {
    try {
      const result = await listNoteCollectionsAction();
      if (result.ok) {
        setNoteCollections(result.data as NoteCollection[]);
      }
    } catch {
      // Silently fail — note collection selector will just be empty
    }
  }, []);

  useEffect(() => {
    void loadSections();
    void loadNoteCollections();
  }, [loadSections, loadNoteCollections]);

  async function loadItems(sectionId: string) {
    setLoadingItems((prev) => ({ ...prev, [sectionId]: true }));
    try {
      const result = await listCourseResourceItemsAction(sectionId);
      if (result.ok) {
        setItemsBySection((prev) => ({
          ...prev,
          [sectionId]: result.data as CourseResourceItem[],
        }));
      } else {
        toast.error(result.error ?? "Failed to load items");
      }
    } catch {
      toast.error("Failed to load items");
    } finally {
      setLoadingItems((prev) => ({ ...prev, [sectionId]: false }));
    }
  }

  function toggleSection(sectionId: string) {
    const isCurrentlyExpanded = expandedSections[sectionId] ?? false;
    const willBeExpanded = !isCurrentlyExpanded;

    setExpandedSections((prev) => ({
      ...prev,
      [sectionId]: willBeExpanded,
    }));

    if (willBeExpanded && !itemsBySection[sectionId]) {
      loadItems(sectionId);
    }
  }

  // ─── Section Mutations ─────────────────────────────────────────────────────

  function handleCreateSection() {
    if (!sectionForm.title.trim()) {
      toast.error("Section title is required");
      return;
    }

    startTransition(async () => {
      const formData = new FormData();
      if (sectionForm.visibility === "global") {
        formData.append("course_id", "");
      } else {
        formData.append("course_id", courseId);
      }
      formData.append("title", sectionForm.title.trim());
      formData.append("icon", sectionForm.icon.trim());
      formData.append("sort_order", String(sections.length));
      formData.append("visibility", sectionForm.visibility);

      try {
        const result = await createCourseResourceSectionAction(formData);
        if (result.ok) {
          toast.success("Section created");
          setSectionForm(defaultSectionForm);
          loadSections();
        } else {
          toast.error(result.error ?? "Failed to create section");
        }
      } catch {
        toast.error("Failed to create section");
      }
    });
  }

  function startEditSection(section: CourseResourceSection) {
    setEditingSectionId(section.id);
    setEditingSectionForm({
      title: section.title,
      icon: section.icon ?? "",
      visibility: section.visibility ?? "per_course",
    });
  }

  function cancelEditSection() {
    setEditingSectionId(null);
    setEditingSectionForm(defaultSectionForm);
  }

  function handleUpdateSection(id: string) {
    if (!editingSectionForm.title.trim()) {
      toast.error("Section title is required");
      return;
    }

    startTransition(async () => {
      const formData = new FormData();
      formData.append("title", editingSectionForm.title.trim());
      formData.append("icon", editingSectionForm.icon.trim());
      formData.append("visibility", editingSectionForm.visibility);

      try {
        const result = await updateCourseResourceSectionAction(id, formData);
        if (result.ok) {
          toast.success("Section updated");
          cancelEditSection();
          loadSections();
        } else {
          toast.error(result.error ?? "Failed to update section");
        }
      } catch {
        toast.error("Failed to update section");
      }
    });
  }

  function handleDeleteSection(id: string) {
    if (!confirm("Delete this section and all its items?")) return;

    startTransition(async () => {
      try {
        const result = await deleteCourseResourceSectionAction(id);
        if (result.ok) {
          toast.success("Section deleted");
          setExpandedSections((prev) => {
            const next = { ...prev };
            delete next[id];
            return next;
          });
          setItemsBySection((prev) => {
            const next = { ...prev };
            delete next[id];
            return next;
          });
          loadSections();
        } else {
          toast.error(result.error ?? "Failed to delete section");
        }
      } catch {
        toast.error("Failed to delete section");
      }
    });
  }

  // ─── Item Mutations ────────────────────────────────────────────────────────

  function getItemFormForSection(sectionId: string): ItemFormState {
    return itemFormsBySection[sectionId] ?? defaultItemForm;
  }

  function setItemFormForSection(sectionId: string, form: ItemFormState) {
    setItemFormsBySection((prev) => ({ ...prev, [sectionId]: form }));
  }

  function handleCreateItem(sectionId: string) {
    const form = getItemFormForSection(sectionId);
    if (!form.title.trim()) {
      toast.error("Item title is required");
      return;
    }

    const items = itemsBySection[sectionId] ?? [];

    startTransition(async () => {
      const formData = new FormData();
      formData.append("section_id", sectionId);
      formData.append("kind", form.kind);
      formData.append("title", form.title.trim());
      formData.append("subtitle", form.subtitle.trim());
      formData.append("icon", form.icon.trim());
      formData.append("sort_order", String(items.length));
      formData.append("open_in_new_tab", String(form.open_in_new_tab));
      formData.append("is_visible", String(form.is_visible));

      if (form.kind === "external_link") {
        formData.append("external_url", form.external_url.trim());
      } else if (form.kind === "note_collection") {
        formData.append("note_collection_id", form.note_collection_id);
      } else if (form.kind === "markdown_text") {
        formData.append("markdown_body", form.markdown_body);
      } else if (form.kind === "file_link") {
        formData.append("file_path", form.file_path.trim());
      } else if (form.kind === "excalidraw_link") {
        formData.append("excalidraw_url", form.excalidraw_url.trim());
      }

      try {
        const result = await createCourseResourceItemAction(formData);
        if (result.ok) {
          toast.success("Item created");
          setItemFormForSection(sectionId, defaultItemForm);
          loadItems(sectionId);
        } else {
          toast.error(result.error ?? "Failed to create item");
        }
      } catch {
        toast.error("Failed to create item");
      }
    });
  }

  function startEditItem(item: CourseResourceItem) {
    setEditingItemId(item.id);
    setEditingItemForm({
      kind: item.kind,
      title: item.title,
      subtitle: item.subtitle ?? "",
      icon: item.icon ?? "",
      external_url: item.external_url ?? "",
      note_collection_id: item.note_collection_id ?? "",
      file_path: item.file_path ?? "",
      markdown_body: item.markdown_body ?? "",
      excalidraw_url: item.excalidraw_url ?? "",
      sort_order: item.sort_order,
      open_in_new_tab: item.open_in_new_tab,
      is_visible: item.is_visible,
    });
  }

  function cancelEditItem() {
    setEditingItemId(null);
    setEditingItemForm(defaultItemForm);
  }

  function handleUpdateItem(id: string) {
    if (!editingItemForm.title.trim()) {
      toast.error("Item title is required");
      return;
    }

    startTransition(async () => {
      const formData = new FormData();
      formData.append("kind", editingItemForm.kind);
      formData.append("title", editingItemForm.title.trim());
      formData.append("subtitle", editingItemForm.subtitle.trim());
      formData.append("icon", editingItemForm.icon.trim());
      formData.append("sort_order", String(editingItemForm.sort_order));
      formData.append(
        "open_in_new_tab",
        String(editingItemForm.open_in_new_tab)
      );
      formData.append("is_visible", String(editingItemForm.is_visible));

      if (editingItemForm.kind === "external_link") {
        formData.append("external_url", editingItemForm.external_url.trim());
      } else if (editingItemForm.kind === "note_collection") {
        formData.append("note_collection_id", editingItemForm.note_collection_id);
      } else if (editingItemForm.kind === "markdown_text") {
        formData.append("markdown_body", editingItemForm.markdown_body);
      } else if (editingItemForm.kind === "file_link") {
        formData.append("file_path", editingItemForm.file_path.trim());
      } else if (editingItemForm.kind === "excalidraw_link") {
        formData.append("excalidraw_url", editingItemForm.excalidraw_url.trim());
      }

      try {
        const result = await updateCourseResourceItemAction(id, formData);
        if (result.ok) {
          toast.success("Item updated");
          cancelEditItem();
          // Reload items for the section that contains this item
          const sectionId = sections.find((s) =>
            (itemsBySection[s.id] ?? []).some((i) => i.id === id)
          )?.id;
          if (sectionId) loadItems(sectionId);
        } else {
          toast.error(result.error ?? "Failed to update item");
        }
      } catch {
        toast.error("Failed to update item");
      }
    });
  }

  function handleDeleteItem(sectionId: string, itemId: string) {
    if (!confirm("Delete this item?")) return;

    startTransition(async () => {
      try {
        const result = await deleteCourseResourceItemAction(itemId);
        if (result.ok) {
          toast.success("Item deleted");
          loadItems(sectionId);
        } else {
          toast.error(result.error ?? "Failed to delete item");
        }
      } catch {
        toast.error("Failed to delete item");
      }
    });
  }

  // ─── Kind-Specific Field Renderers ─────────────────────────────────────────

  function renderItemKindFields(
    form: ItemFormState,
    onChange: (updated: ItemFormState) => void,
    _isEditing: boolean
  ) {
    switch (form.kind) {
      case "external_link":
        return (
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              External URL
            </label>
            <input
              type="url"
              value={form.external_url}
              onChange={(e) => onChange({ ...form, external_url: e.target.value })}
              placeholder="https://..."
              className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
        );

      case "note_collection":
        return (
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              Note Collection
            </label>
            <Select
              value={form.note_collection_id || "_none"}
              onValueChange={(val) =>
                onChange({ ...form, note_collection_id: val === "_none" ? "" : val })
              }
            >
              <SelectTrigger className="w-full bg-background h-9">
                <SelectValue placeholder="Select a collection..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_none">Select a collection...</SelectItem>
                {noteCollections.map((nc) => (
                  <SelectItem key={nc.id} value={nc.id}>
                    {nc.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );

      case "markdown_text":
        return (
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              Markdown Body
            </label>
            <textarea
              value={form.markdown_body}
              onChange={(e) => onChange({ ...form, markdown_body: e.target.value })}
              rows={4}
              placeholder="Write markdown content..."
              className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring font-mono"
            />
          </div>
        );

      case "file_link":
        return (
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              File Path
            </label>
            <input
              type="text"
              value={form.file_path}
              onChange={(e) => onChange({ ...form, file_path: e.target.value })}
              placeholder="/path/to/file.pdf"
              className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
        );

      case "excalidraw_link":
        return (
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              Excalidraw URL
            </label>
            <input
              type="url"
              value={form.excalidraw_url}
              onChange={(e) => onChange({ ...form, excalidraw_url: e.target.value })}
              placeholder="https://excalidraw.com/..."
              className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
        );

      default:
        return null;
    }
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-border pb-4">
        <h2 className="text-lg font-semibold text-foreground">
          {courseId === "00000000-0000-0000-0000-000000000000"
            ? "Global Resource Sections"
            : "Course Resource Sections"}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {courseId === "00000000-0000-0000-0000-000000000000"
            ? "Global resources appear in every course player."
            : "Manage resource sections and items for this course."}
        </p>
      </div>

      {/* Create Section Form */}
      <div className="rounded-lg border border-border bg-muted/40 p-4">
        <h3 className="mb-3 text-sm font-medium text-foreground">
          Create New Section
        </h3>
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            type="text"
            value={sectionForm.title}
            onChange={(e) =>
              setSectionForm((prev) => ({ ...prev, title: e.target.value }))
            }
            placeholder="Section title"
            className="flex-1 rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <input
            type="text"
            value={sectionForm.icon}
            onChange={(e) =>
              setSectionForm((prev) => ({ ...prev, icon: e.target.value }))
            }
            placeholder="Icon (optional)"
            className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring sm:w-40"
          />
          <Select
            value={sectionForm.visibility}
            onValueChange={(val: "per_course" | "global") =>
              setSectionForm((prev) => ({ ...prev, visibility: val }))
            }
          >
            <SelectTrigger className="w-full sm:w-40 bg-background h-[34px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="per_course">This Course</SelectItem>
              <SelectItem value="global">All Courses</SelectItem>
            </SelectContent>
          </Select>
          <button
            onClick={handleCreateSection}
            disabled={isPending || !sectionForm.title.trim()}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPending ? "Creating..." : "Add Section"}
          </button>
        </div>
      </div>

      {/* Sections List */}
      {loadingSections ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-primary" />
          <span className="ml-2 text-sm text-muted-foreground">Loading sections...</span>
        </div>
      ) : sections.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border py-12 text-center">
          <p className="text-sm text-muted-foreground">
            No resource sections yet. Create one above to get started.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {sections.map((section) => {
            const isExpanded = expandedSections[section.id] ?? false;
            const isEditing = editingSectionId === section.id;
            const items = itemsBySection[section.id] ?? [];
            const itemsLoading = loadingItems[section.id] ?? false;

            return (
              <div
                key={section.id}
                className="overflow-hidden rounded-lg border border-border bg-card"
              >
                {/* Section Header */}
                <div className="flex items-center gap-3 bg-muted/40 px-4 py-3">
                  {/* Expand/Collapse */}
                  <button
                    onClick={() => toggleSection(section.id)}
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded hover:bg-muted"
                    aria-label={isExpanded ? "Collapse section" : "Expand section"}
                    aria-expanded={isExpanded}
                  >
                    <svg
                      className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${
                        isExpanded ? "rotate-90" : ""
                      }`}
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M8.25 4.5l7.5 7.5-7.5 7.5"
                      />
                    </svg>
                  </button>

                  {isEditing ? (
                    <div className="flex flex-1 items-center gap-2">
                      <input
                        type="text"
                        value={editingSectionForm.title}
                        onChange={(e) =>
                          setEditingSectionForm((prev) => ({
                            ...prev,
                            title: e.target.value,
                          }))
                        }
                        className="flex-1 rounded-md border border-input bg-background px-2 py-1 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring"
                        autoFocus
                      />
                      <input
                        type="text"
                        value={editingSectionForm.icon}
                        onChange={(e) =>
                          setEditingSectionForm((prev) => ({
                            ...prev,
                            icon: e.target.value,
                          }))
                        }
                        placeholder="Icon"
                        className="w-24 rounded-md border border-input bg-background px-2 py-1 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring"
                      />
                      <button
                        onClick={() => handleUpdateSection(section.id)}
                        disabled={isPending}
                        className="inline-flex items-center rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                      >
                        Save
                      </button>
                      <button
                        onClick={cancelEditSection}
                        className="inline-flex items-center rounded-md bg-muted px-2.5 py-1 text-xs font-medium text-foreground hover:bg-muted/80"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex flex-1 items-center gap-2">
                        {section.icon && (
                          <span className="text-base">{section.icon}</span>
                        )}
                        <span className="text-sm font-medium text-foreground">
                          {section.title}
                        </span>
                        {section.visibility === "global" && (
                          <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                            Global
                          </span>
                        )}
                        <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                          {items.length} item{items.length !== 1 ? "s" : ""}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => startEditSection(section)}
                          className="inline-flex items-center rounded px-2 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteSection(section.id)}
                          disabled={isPending}
                          className="inline-flex items-center rounded px-2 py-1 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                        >
                          Delete
                        </button>
                      </div>
                    </>
                  )}
                </div>

                {/* Section Body (Expanded) */}
                {isExpanded && (
                  <div className="border-t border-border px-4 py-4">
                    {/* Items Loading */}
                    {itemsLoading ? (
                      <div className="flex items-center justify-center py-6">
                        <div className="h-5 w-5 animate-spin rounded-full border-2 border-border border-t-primary" />
                        <span className="ml-2 text-xs text-muted-foreground">
                          Loading items...
                        </span>
                      </div>
                    ) : (
                      <>
                        {/* Items List */}
                        {items.length > 0 ? (
                          <div className="mb-4 space-y-2">
                            {items.map((item) => {
                              const isItemEditing = editingItemId === item.id;

                              return (
                                <div
                                  key={item.id}
                                  className="rounded-md border border-border bg-muted/30 px-3 py-2.5"
                                >
                                  {isItemEditing ? (
                                    <div className="space-y-3">
                                      {/* Edit Kind */}
                                      <div className="flex flex-col gap-3 sm:flex-row">
                                        <div className="flex-1">
                                          <label className="mb-1 block text-xs font-medium text-muted-foreground">
                                            Kind
                                          </label>
                                          <Select
                                            value={editingItemForm.kind}
                                            onValueChange={(val: ItemKind) =>
                                              setEditingItemForm((prev) => ({
                                                ...prev,
                                                kind: val,
                                              }))
                                            }
                                          >
                                            <SelectTrigger className="w-full bg-background h-9">
                                              <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                              {ITEM_KIND_OPTIONS.map((k) => (
                                                <SelectItem key={k} value={k}>
                                                  {ITEM_KIND_LABELS[k]}
                                                </SelectItem>
                                              ))}
                                            </SelectContent>
                                          </Select>
                                        </div>
                                        <div className="flex-1">
                                          <label className="mb-1 block text-xs font-medium text-muted-foreground">
                                            Title
                                          </label>
                                          <input
                                            type="text"
                                            value={editingItemForm.title}
                                            onChange={(e) =>
                                              setEditingItemForm((prev) => ({
                                                ...prev,
                                                title: e.target.value,
                                              }))
                                            }
                                            className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring"
                                          />
                                        </div>
                                      </div>

                                      {/* Edit Subtitle & Icon */}
                                      <div className="flex flex-col gap-3 sm:flex-row">
                                        <div className="flex-1">
                                          <label className="mb-1 block text-xs font-medium text-muted-foreground">
                                            Subtitle
                                          </label>
                                          <input
                                            type="text"
                                            value={editingItemForm.subtitle}
                                            onChange={(e) =>
                                              setEditingItemForm((prev) => ({
                                                ...prev,
                                                subtitle: e.target.value,
                                              }))
                                            }
                                            className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring"
                                          />
                                        </div>
                                        <div className="flex-1">
                                          <label className="mb-1 block text-xs font-medium text-muted-foreground">
                                            Icon
                                          </label>
                                          <input
                                            type="text"
                                            value={editingItemForm.icon}
                                            onChange={(e) =>
                                              setEditingItemForm((prev) => ({
                                                ...prev,
                                                icon: e.target.value,
                                              }))
                                            }
                                            className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring"
                                          />
                                        </div>
                                      </div>

                                      {/* Kind-Specific Fields */}
                                      {renderItemKindFields(
                                        editingItemForm,
                                        setEditingItemForm,
                                        true
                                      )}

                                      {/* Sort Order & Flags */}
                                      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                                        <div className="w-24">
                                          <label className="mb-1 block text-xs font-medium text-muted-foreground">
                                            Sort
                                          </label>
                                          <input
                                            type="number"
                                            value={editingItemForm.sort_order}
                                            onChange={(e) =>
                                              setEditingItemForm((prev) => ({
                                                ...prev,
                                                sort_order: Number(e.target.value),
                                              }))
                                            }
                                            className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring"
                                          />
                                        </div>
                                        <label className="flex items-center gap-2 text-sm text-foreground">
                                          <input
                                            type="checkbox"
                                            checked={editingItemForm.open_in_new_tab}
                                            onChange={(e) =>
                                              setEditingItemForm((prev) => ({
                                                ...prev,
                                                open_in_new_tab: e.target.checked,
                                              }))
                                            }
                                            className="h-4 w-4 rounded border-input text-primary focus:ring-1 focus:ring-ring"
                                          />
                                          Open in new tab
                                        </label>
                                        <label className="flex items-center gap-2 text-sm text-foreground">
                                          <input
                                            type="checkbox"
                                            checked={editingItemForm.is_visible}
                                            onChange={(e) =>
                                              setEditingItemForm((prev) => ({
                                                ...prev,
                                                is_visible: e.target.checked,
                                              }))
                                            }
                                            className="h-4 w-4 rounded border-input text-primary focus:ring-1 focus:ring-ring"
                                          />
                                          Visible
                                        </label>
                                        <div className="flex-1" />
                                        <div className="flex items-center gap-2">
                                          <button
                                            onClick={() =>
                                              handleUpdateItem(item.id)
                                            }
                                            disabled={isPending}
                                            className="inline-flex items-center rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                                          >
                                            Save
                                          </button>
                                          <button
                                            onClick={cancelEditItem}
                                            className="inline-flex items-center rounded-md bg-muted px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted/80"
                                          >
                                            Cancel
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="flex items-start justify-between gap-3">
                                      <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2">
                                          {item.icon && (
                                            <span className="text-sm">
                                              {item.icon}
                                            </span>
                                          )}
                                          <span className="text-sm font-medium text-foreground">
                                            {item.title}
                                          </span>
                                          <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                                            {ITEM_KIND_LABELS[item.kind]}
                                          </span>
                                          {!item.is_visible && (
                                            <span className="rounded-full bg-yellow-100 px-1.5 py-0.5 text-[10px] font-medium text-yellow-700">
                                              Hidden
                                            </span>
                                          )}
                                        </div>
                                        {item.subtitle && (
                                          <p className="mt-0.5 text-xs text-muted-foreground">
                                            {item.subtitle}
                                          </p>
                                        )}
                                        {item.kind === "external_link" &&
                                          item.external_url && (
                                            <p className="mt-0.5 truncate text-xs text-primary">
                                              {item.external_url}
                                            </p>
                                          )}
                                        {item.kind === "file_link" &&
                                          item.file_path && (
                                            <p className="mt-0.5 truncate text-xs text-muted-foreground font-mono">
                                              {item.file_path}
                                            </p>
                                          )}
                                        {item.kind === "note_collection" &&
                                          item.note_collection_id && (
                                            <p className="mt-0.5 text-xs text-muted-foreground">
                                              Collection: {item.note_collection_id.slice(0, 8)}...
                                            </p>
                                          )}
                                        {item.kind === "markdown_text" &&
                                          item.markdown_body && (
                                            <p className="mt-0.5 text-xs text-muted-foreground italic">
                                              {item.markdown_body.slice(0, 60)}
                                              {item.markdown_body.length > 60
                                                ? "..."
                                                : ""}
                                            </p>
                                          )}
                                        {item.kind === "excalidraw_link" &&
                                          item.excalidraw_url && (
                                            <p className="mt-0.5 truncate text-xs text-primary">
                                              {item.excalidraw_url}
                                            </p>
                                          )}
                                      </div>
                                      <div className="flex shrink-0 items-center gap-1">
                                        <button
                                          onClick={() => startEditItem(item)}
                                          className="inline-flex items-center rounded px-2 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
                                        >
                                          Edit
                                        </button>
                                        <button
                                          onClick={() =>
                                            handleDeleteItem(section.id, item.id)
                                          }
                                          disabled={isPending}
                                          className="inline-flex items-center rounded px-2 py-1 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                                        >
                                          Delete
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="mb-4 rounded-md border border-dashed border-border py-6 text-center">
                            <p className="text-xs text-muted-foreground">
                              No items in this section yet.
                            </p>
                          </div>
                        )}

                        {/* Create Item Form */}
                        <div className="rounded-md border border-border bg-card p-3">
                          <h4 className="mb-3 text-xs font-medium text-foreground">
                            Add New Item
                          </h4>
                          {(() => {
                            const form = getItemFormForSection(section.id);
                            const update = (updated: ItemFormState) =>
                              setItemFormForSection(section.id, updated);

                            return (
                              <div className="space-y-3">
                                {/* Kind & Title — always visible */}
                                <div className="flex flex-col gap-3 sm:flex-row">
                                  <div className="w-full sm:w-44">
                                    <label className="mb-1 block text-xs font-medium text-muted-foreground">
                                      Kind
                                    </label>
                                    <Select
                                      value={form.kind}
                                      onValueChange={(val: ItemKind) =>
                                        update({
                                          ...form,
                                          kind: val,
                                        })
                                      }
                                    >
                                      <SelectTrigger className="w-full bg-background h-9">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {ITEM_KIND_OPTIONS.map((k) => (
                                          <SelectItem key={k} value={k}>
                                            {ITEM_KIND_LABELS[k]}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div className="flex-1">
                                    <label className="mb-1 block text-xs font-medium text-muted-foreground">
                                      Title *
                                    </label>
                                    <input
                                      type="text"
                                      value={form.title}
                                      onChange={(e) =>
                                        update({ ...form, title: e.target.value })
                                      }
                                      placeholder="Item title"
                                      className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring"
                                    />
                                  </div>
                                </div>

                                {/* Kind-specific fields — visible when kind is selected */}
                                {renderItemKindFields(form, update, false)}

                                {/* Advanced options — collapsible */}
                                <details className="group">
                                  <summary className="flex cursor-pointer items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground list-none">
                                    <svg
                                      className="h-3 w-3 transition-transform group-open:rotate-90"
                                      fill="none"
                                      viewBox="0 0 24 24"
                                      strokeWidth={2}
                                      stroke="currentColor"
                                    >
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                                    </svg>
                                    More options
                                  </summary>
                                  <div className="mt-3 space-y-3">
                                    <div className="flex flex-col gap-3 sm:flex-row">
                                      <div className="flex-1">
                                        <label className="mb-1 block text-xs font-medium text-muted-foreground">
                                          Subtitle
                                        </label>
                                        <input
                                          type="text"
                                          value={form.subtitle}
                                          onChange={(e) =>
                                            update({ ...form, subtitle: e.target.value })
                                          }
                                          placeholder="Optional subtitle"
                                          className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring"
                                        />
                                      </div>
                                      <div className="flex-1">
                                        <label className="mb-1 block text-xs font-medium text-muted-foreground">
                                          Icon
                                        </label>
                                        <input
                                          type="text"
                                          value={form.icon}
                                          onChange={(e) =>
                                            update({ ...form, icon: e.target.value })
                                          }
                                          placeholder="Emoji or character"
                                          className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring"
                                        />
                                      </div>
                                    </div>
                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                                      <div className="w-24">
                                        <label className="mb-1 block text-xs font-medium text-muted-foreground">
                                          Sort
                                        </label>
                                        <input
                                          type="number"
                                          value={form.sort_order}
                                          onChange={(e) =>
                                            update({
                                              ...form,
                                              sort_order: Number(e.target.value),
                                            })
                                          }
                                          className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring"
                                        />
                                      </div>
                                      <label className="flex items-center gap-2 text-sm text-foreground">
                                        <input
                                          type="checkbox"
                                          checked={form.open_in_new_tab}
                                          onChange={(e) =>
                                            update({
                                              ...form,
                                              open_in_new_tab: e.target.checked,
                                            })
                                          }
                                          className="h-4 w-4 rounded border-input text-primary focus:ring-1 focus:ring-ring"
                                        />
                                        New tab
                                      </label>
                                      <label className="flex items-center gap-2 text-sm text-foreground">
                                        <input
                                          type="checkbox"
                                          checked={form.is_visible}
                                          onChange={(e) =>
                                            update({
                                              ...form,
                                              is_visible: e.target.checked,
                                            })
                                          }
                                          className="h-4 w-4 rounded border-input text-primary focus:ring-1 focus:ring-ring"
                                        />
                                        Visible
                                      </label>
                                    </div>
                                  </div>
                                </details>

                                {/* Submit */}
                                <div className="flex justify-end pt-1">
                                  <button
                                    onClick={() => handleCreateItem(section.id)}
                                    disabled={isPending || !form.title.trim()}
                                    className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                  >
                                    {isPending ? "Adding..." : "Add Item"}
                                  </button>
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
