import { z } from 'zod';

/**
 * Validation schemas for Master Course Pillars.
 */

const pillarVisibilitySchema = z.object({
  visible_to_college_admins: z.boolean().default(false),
  visible_to_college_students: z.boolean().default(false),
  visible_to_global_students: z.boolean().default(true),
});

export const createPillarSchema = z.object({
  code: z
    .string()
    .min(2, 'Code must be at least 2 characters')
    .max(50)
    .regex(/^[a-z0-9-]+$/, 'Code must contain only lowercase letters, numbers, and hyphens'),
  title: z.string().min(3, 'Title must be at least 3 characters').max(200),
  slug: z
    .string()
    .min(2, 'Slug must be at least 2 characters')
    .max(100)
    .regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens'),
  description: z.string().max(2000).optional(),
  short_description: z.string().max(500).optional(),
  sort_order: z.number().int().min(0).default(0),
  publish_status: z.enum(['draft', 'published', 'unpublished']).default('draft'),
  tp_folder_uuid: z.string().optional(),
}).merge(pillarVisibilitySchema);

export const updatePillarSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(200).optional(),
  slug: z
    .string()
    .min(2, 'Slug must be at least 2 characters')
    .max(100)
    .regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens')
    .optional(),
  description: z.string().max(2000).optional(),
  short_description: z.string().max(500).optional(),
  sort_order: z.number().int().min(0).optional(),
  publish_status: z.enum(['draft', 'published', 'unpublished']).optional(),
}).merge(pillarVisibilitySchema.partial());

export type CreatePillarInput = z.infer<typeof createPillarSchema>;
export type UpdatePillarInput = z.infer<typeof updatePillarSchema>;
