import { z } from 'zod';

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const createNoteCollectionSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  slug: z.string().min(2).max(100).regex(SLUG_PATTERN, 'Slug must contain only lowercase letters, numbers, and hyphens'),
  short_description: z.string().max(500).optional().nullable(),
  description_md: z.string().optional().nullable(),
  cover_image_path: z.string().optional().nullable(),
  publish_status: z.enum(['draft', 'published', 'unpublished', 'archived']).default('draft'),
  pricing_model: z.enum(['free', 'paid']).default('free'),
  price_minor: z.number().int().min(0).default(0),
  currency: z.string().default('INR'),
  validity_days: z.number().int().positive().optional().nullable(),
  source_master_course_id: z.string().uuid().optional().nullable(),
  source_type: z.enum(['standalone', 'course_linked']).default('standalone'),
  catalog_visibility: z.enum(['public_catalog', 'hidden_course_attached']).default('public_catalog'),
  visibility_scope: z.enum(['global', 'selected_colleges', 'private']).default('global'),
}).refine(
  (data) => data.pricing_model === 'paid' ? data.price_minor > 0 : true,
  { message: 'Paid notes must have a price greater than 0', path: ['price_minor'] },
).refine(
  (data) => data.pricing_model === 'free' ? data.price_minor === 0 : true,
  { message: 'Free notes must have price set to 0', path: ['price_minor'] },
);

export const updateNoteCollectionSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200).optional(),
  slug: z.string().min(2).max(100).regex(SLUG_PATTERN, 'Slug must contain only lowercase letters, numbers, and hyphens').optional(),
  short_description: z.string().max(500).optional().nullable(),
  description_md: z.string().optional().nullable(),
  cover_image_path: z.string().optional().nullable(),
  publish_status: z.enum(['draft', 'published', 'unpublished', 'archived']).optional(),
  pricing_model: z.enum(['free', 'paid']).optional(),
  price_minor: z.number().int().min(0).optional(),
  currency: z.string().optional(),
  validity_days: z.number().int().positive().optional().nullable(),
  source_master_course_id: z.string().uuid().optional().nullable(),
  visibility_scope: z.enum(['global', 'selected_colleges', 'private']).optional(),
}).refine(
  (data) => data.pricing_model === 'paid' ? (data.price_minor ?? 0) > 0 : true,
  { message: 'Paid notes must have a price greater than 0', path: ['price_minor'] },
).refine(
  (data) => data.pricing_model === 'free' ? (data.price_minor ?? 0) === 0 : true,
  { message: 'Free notes must have price set to 0', path: ['price_minor'] },
);

export const createNoteModuleSchema = z.object({
  note_collection_id: z.string().uuid(),
  title: z.string().min(1, 'Title is required').max(200),
  slug: z.string().min(2).max(100).regex(SLUG_PATTERN, 'Slug must contain only lowercase letters, numbers, and hyphens'),
  description_md: z.string().optional().nullable(),
  sort_order: z.number().int().min(0).default(0),
  is_published: z.boolean().default(true),
});

export const updateNoteModuleSchema = createNoteModuleSchema.omit({ note_collection_id: true }).partial();

export const reorderNoteModulesSchema = z.object({
  note_collection_id: z.string().uuid(),
  module_ids: z.array(z.string().uuid()),
});

export const createNotePageSchema = z.object({
  note_module_id: z.string().uuid(),
  title: z.string().max(200).optional().nullable(),
  image_path: z.string().min(1, 'Image path is required'),
  image_mime: z.enum(['image/jpeg', 'image/png', 'image/webp']),
  width: z.number().int().positive().optional().nullable(),
  height: z.number().int().positive().optional().nullable(),
  file_size_bytes: z.number().int().positive().optional().nullable(),
  alt_text: z.string().max(500).optional().nullable(),
  sort_order: z.number().int().min(0).default(0),
});

export const reorderNotePagesSchema = z.object({
  note_module_id: z.string().uuid(),
  page_ids: z.array(z.string().uuid()),
});

export const createNoteCourseLinkSchema = z.object({
  note_collection_id: z.string().uuid(),
  course_id: z.string().uuid(),
  module_id: z.string().uuid().optional().nullable(),
  item_id: z.string().uuid().optional().nullable(),
  auto_unlock_with_course: z.boolean().default(true),
  sort_order: z.number().int().min(0).default(0),
});

export const createCourseResourceSectionSchema = z.object({
  course_id: z.string().uuid().optional().nullable(),
  scope_type: z.enum(['course', 'module', 'item']).default('course'),
  module_id: z.string().uuid().optional().nullable(),
  item_id: z.string().uuid().optional().nullable(),
  title: z.string().min(1, 'Title is required').max(200),
  icon: z.string().max(100).optional().nullable(),
  sort_order: z.number().int().min(0).default(0),
  is_visible: z.boolean().default(true),
  visibility: z.enum(['per_course', 'global']).default('per_course'),
}).refine(
  (data) => data.visibility === 'per_course' ? !!data.course_id : true,
  { message: 'Per-course resources require a course', path: ['course_id'] },
).refine(
  (data) => data.scope_type === 'course' ? !data.module_id && !data.item_id : true,
  { message: 'Course scope must not have module or item set', path: ['scope_type'] },
).refine(
  (data) => data.scope_type === 'module' ? !!data.module_id && !data.item_id : true,
  { message: 'Module scope requires module_id', path: ['module_id'] },
).refine(
  (data) => data.scope_type === 'item' ? !!data.item_id : true,
  { message: 'Item scope requires item_id', path: ['item_id'] },
);

export const updateCourseResourceSectionSchema = z.object({
  scope_type: z.enum(['course', 'module', 'item']).optional(),
  module_id: z.string().uuid().optional().nullable(),
  item_id: z.string().uuid().optional().nullable(),
  title: z.string().min(1, 'Title is required').max(200).optional(),
  icon: z.string().max(100).optional().nullable(),
  sort_order: z.number().int().min(0).optional(),
  is_visible: z.boolean().optional(),
  visibility: z.enum(['per_course', 'global']).optional(),
}).refine(
  (data) => data.scope_type === 'course' ? !data.module_id && !data.item_id : true,
  { message: 'Course scope must not have module or item set', path: ['scope_type'] },
).refine(
  (data) => data.scope_type === 'module' ? !!data.module_id && !data.item_id : true,
  { message: 'Module scope requires module_id', path: ['module_id'] },
).refine(
  (data) => data.scope_type === 'item' ? !!data.item_id : true,
  { message: 'Item scope requires item_id', path: ['item_id'] },
);

export const createCourseResourceItemSchema = z.object({
  section_id: z.string().uuid(),
  kind: z.enum(['external_link', 'note_collection', 'markdown_text', 'file_link', 'excalidraw_link']),
  title: z.string().min(1, 'Title is required').max(200),
  subtitle: z.string().max(500).optional().nullable(),
  icon: z.string().max(100).optional().nullable(),
  external_url: z.string().url().optional().nullable(),
  note_collection_id: z.string().uuid().optional().nullable(),
  file_path: z.string().optional().nullable(),
  markdown_body: z.string().optional().nullable(),
  excalidraw_url: z.string().url().optional().nullable(),
  open_in_new_tab: z.boolean().default(true),
  sort_order: z.number().int().min(0).default(0),
  is_visible: z.boolean().default(true),
}).refine(
  (data) => data.kind === 'external_link' ? !!data.external_url : true,
  { message: 'External link requires a URL', path: ['external_url'] },
).refine(
  (data) => data.kind === 'note_collection' ? !!data.note_collection_id : true,
  { message: 'Note collection requires a note collection ID', path: ['note_collection_id'] },
).refine(
  (data) => data.kind === 'markdown_text' ? !!data.markdown_body : true,
  { message: 'Markdown text requires content', path: ['markdown_body'] },
).refine(
  (data) => data.kind === 'file_link' ? !!data.file_path : true,
  { message: 'File link requires a file path', path: ['file_path'] },
).refine(
  (data) => data.kind === 'excalidraw_link' ? !!data.excalidraw_url : true,
  { message: 'Excalidraw link requires a URL', path: ['excalidraw_url'] },
);

export const updateCourseResourceItemSchema = z.object({
  kind: z.enum(['external_link', 'note_collection', 'markdown_text', 'file_link', 'excalidraw_link']).optional(),
  title: z.string().min(1, 'Title is required').max(200).optional(),
  subtitle: z.string().max(500).optional().nullable(),
  icon: z.string().max(100).optional().nullable(),
  external_url: z.string().url().optional().nullable(),
  note_collection_id: z.string().uuid().optional().nullable(),
  file_path: z.string().optional().nullable(),
  markdown_body: z.string().optional().nullable(),
  excalidraw_url: z.string().url().optional().nullable(),
  open_in_new_tab: z.boolean().optional(),
  sort_order: z.number().int().min(0).optional(),
  is_visible: z.boolean().optional(),
}).refine(
  (data) => data.kind === 'external_link' ? !!data.external_url : true,
  { message: 'External link requires a URL', path: ['external_url'] },
).refine(
  (data) => data.kind === 'note_collection' ? !!data.note_collection_id : true,
  { message: 'Note collection requires a note collection ID', path: ['note_collection_id'] },
).refine(
  (data) => data.kind === 'markdown_text' ? !!data.markdown_body : true,
  { message: 'Markdown text requires content', path: ['markdown_body'] },
).refine(
  (data) => data.kind === 'file_link' ? !!data.file_path : true,
  { message: 'File link requires a file path', path: ['file_path'] },
).refine(
  (data) => data.kind === 'excalidraw_link' ? !!data.excalidraw_url : true,
  { message: 'Excalidraw link requires a URL', path: ['excalidraw_url'] },
);

export const reorderCourseResourceSectionsSchema = z.object({
  course_id: z.string().uuid(),
  section_ids: z.array(z.string().uuid()),
});

export const reorderCourseResourceItemsSchema = z.object({
  section_id: z.string().uuid(),
  item_ids: z.array(z.string().uuid()),
});
