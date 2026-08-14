import { z } from 'zod';

/**
 * Validation schemas for Master Course Modules (Phase 5).
 */

const _moduleVisibilitySchema = z.object({
  visible_to_students: z.boolean().default(true),
});

export const createModuleInsideCourseSchema = z.object({
  pillar_id: z.uuid('Pillar ID is required'),
  course_id: z.uuid('Course ID is required'),
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().max(2000).optional(),
  sort_order: z.number().int().min(0).optional(),
  visible_to_students: z.boolean().default(true),
});

export const updateModuleInsideCourseSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200).optional(),
  description: z.string().max(2000).optional(),
  sort_order: z.number().int().min(0).optional(),
  publish_status: z.enum(['draft', 'published', 'unpublished']).optional(),
});

export type CreateModuleInput = z.infer<typeof createModuleInsideCourseSchema>;
export type UpdateModuleInput = z.infer<typeof updateModuleInsideCourseSchema>;
export type ModuleVisibilityInput = z.infer<typeof _moduleVisibilitySchema>;