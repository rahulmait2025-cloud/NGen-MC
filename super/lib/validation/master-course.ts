import { z } from 'zod';

/**
 * Validation schemas for Master Courses (Phase 4).
 */

export const courseVisibilitySchema = z.object({
  visible_to_college_admins: z.boolean().default(false),
  visible_to_college_students: z.boolean().default(false),
  visible_to_global_students: z.boolean().default(true),
});



const landingPageSchema = z.object({
  hero: z.object({
    title: z.string().default(''),
    subtitle: z.string().default(''),
    video_url: z.string().default(''),
    image_url: z.string().default(''),
  }).optional(),
  pricing: z.object({
    sale_price: z.number().default(0),
    original_price: z.number().default(0),
    currency: z.string().default('INR'),
    tiers: z.array(z.object({
      name: z.string().default(''),
      price: z.number().default(0),
      features: z.array(z.string()).default(['']),
      is_popular: z.boolean().default(false),
    })).default([]),
  }).optional(),
  learning_outcomes: z.array(z.string()).default(['']),
  instructors: z.array(z.object({
    name: z.string().default(''),
    designation: z.string().default(''),
    image_url: z.string().default(''),
    bio: z.string().default(''),
  })).default([]),
  curriculum: z.array(z.object({
    title: z.string().default(''),
    description: z.string().default(''),
    lessons: z.array(z.string()).default(['']),
  })).default([]),
  testimonials: z.array(z.object({
    name: z.string().default(''),
    role: z.string().default(''),
    content: z.string().default(''),
    avatar_url: z.string().default(''),
    rating: z.number().default(5),
  })).default([]),
  faq: z.array(z.object({
    question: z.string().default(''),
    answer: z.string().default(''),
  })).default([]),
}).optional();

export const createCourseInsidePillarSchema = z.object({
  pillar_id: z.uuid('Pillar ID is required'),
  code: z
    .string()
    .min(2, 'Code must be at least 2 characters')
    .max(50)
    .regex(/^[A-Z0-9-]+$/, 'Code must contain only uppercase letters, numbers, and hyphens'),
  title: z.string().min(2, 'Title must be at least 2 characters').max(200),
  slug: z
    .string()
    .min(2, 'Slug must be at least 2 characters')
    .max(100)
    .regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens'),
  description: z.string().max(2000).optional(),
  short_description: z.string().max(500).optional(),
  publish_status: z.enum(['draft', 'published', 'unpublished']).default('draft'),
  metadata: z.object({
    landing_page: landingPageSchema.optional(),
  }).catchall(z.any()).optional(),
}).merge(courseVisibilitySchema);

/**
 * Bootcamp course creation schema.
 *
 * Reuses the same field shape as Pillar courses so the same UI template
 * can render both. Visibility is NOT user-controllable for bootcamp
 * courses — it is force-set to false in the server action.
 */
export const createCourseInsideBootcampSchema = z.object({
  bootcamp_id: z.uuid('Bootcamp ID is required'),
  code: z
    .string()
    .min(2, 'Code must be at least 2 characters')
    .max(50)
    .regex(/^[A-Z0-9-]+$/, 'Code must contain only uppercase letters, numbers, and hyphens'),
  title: z.string().min(2, 'Title must be at least 2 characters').max(200),
  slug: z
    .string()
    .min(2, 'Slug must be at least 2 characters')
    .max(100)
    .regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens'),
  description: z.string().max(2000).optional(),
  short_description: z.string().max(500).optional(),
  publish_status: z.enum(['draft', 'published', 'unpublished']).default('draft'),
  metadata: z.object({
    landing_page: landingPageSchema.optional(),
  }).catchall(z.any()).optional(),
});

export const updateCourseInsidePillarSchema = z.object({
  title: z.string().min(2, 'Title must be at least 2 characters').max(200).optional(),
  slug: z
    .string()
    .min(2, 'Slug must be at least 2 characters')
    .max(100)
    .regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens')
    .optional(),
  description: z.string().max(2000).optional(),
  short_description: z.string().max(500).optional(),
  publish_status: z.enum(['draft', 'published', 'unpublished']).optional(),
  metadata: z.object({
    landing_page: landingPageSchema.optional(),
  }).catchall(z.any()).optional(),
}).merge(courseVisibilitySchema.partial());

export type CreateCourseInput = z.infer<typeof createCourseInsidePillarSchema>;
export type CreateBootcampCourseInput = z.infer<typeof createCourseInsideBootcampSchema>;
export type UpdateCourseInput = z.infer<typeof updateCourseInsidePillarSchema>;
export type CourseVisibilityInput = z.infer<typeof courseVisibilitySchema>;

