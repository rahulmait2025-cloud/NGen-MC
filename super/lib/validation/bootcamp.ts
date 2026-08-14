import { z } from 'zod';

/**
 * Validation schemas for Bootcamps.
 *
 * The create schema is used by {@link createBootcampAction} to provision
 * the canonical Bootcamp from the UI when none exists.
 */

export const createBootcampSchema = z.object({
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
  description: z.string().max(5000).optional(),
  short_description: z.string().max(500).optional(),
  thumbnail_url: z.url().optional().or(z.literal('')),
  cover_image_url: z.url().optional().or(z.literal('')),
  sort_order: z.number().int().min(0).default(0),
  publish_status: z.enum(['draft', 'published', 'archived']).default('draft'),
});

export type CreateBootcampInput = z.infer<typeof createBootcampSchema>;
