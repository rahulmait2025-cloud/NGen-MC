import { z } from 'zod';
import { courseVisibilitySchema } from '@/lib/validation/master-course';

export const createFreeCourseSchema = z.object({
  title: z.string().min(2, 'Title must be at least 2 characters').max(200),
  short_description: z.string().max(500).optional(),
  description: z.string().max(5000).optional(),
  thumbnail_url: z
    .string()
    .optional()
    .transform((v) => (v?.trim() ? v.trim() : undefined))
    .refine((v) => v === undefined || /^https?:\/\/.+/i.test(v), 'Thumbnail must be a valid URL'),
}).merge(courseVisibilitySchema.partial());

export const updateFreeCourseBasicsSchema = z.object({
  title: z.string().min(2, 'Title must be at least 2 characters').max(200).optional(),
  short_description: z.string().max(500).optional().nullable(),
  description: z.string().max(5000).optional().nullable(),
  thumbnail_url: z
    .string()
    .optional()
    .nullable()
    .transform((v) => (v === null || v === undefined ? v : (v.trim() || null)))
    .refine(
      (v) => v === undefined || v === null || /^https?:\/\/.+/i.test(v),
      'Thumbnail must be a valid URL',
    ),
}).merge(courseVisibilitySchema.partial());

export const updateFreeCourseStatusSchema = z.object({
  publish_status: z.enum(['draft', 'published', 'unpublished']),
});

const urlOptional = z
  .string()
  .optional()
  .transform((v) => (v?.trim() ? v.trim() : undefined))
  .refine((v) => v === undefined || /^https?:\/\/.+/i.test(v), 'Must be a valid URL');

export const previewYouTubePlaylistSchema = z.object({
  courseId: z.uuid('Invalid course ID'),
  playlistUrl: z.string().min(1, 'Playlist URL is required').max(2000),
});

const importYouTubeVideoSchema = z.object({
  youtubeVideoId: z.string().min(1, 'Video ID is required').max(64),
  title: z.string().min(1, 'Title is required').max(300),
  originalTitle: z.string().max(500).optional(),
  description: z.string().max(5000).optional(),
  thumbnailUrl: urlOptional,
  position: z.number().int().min(0),
  durationSeconds: z.number().int().min(0).nullable().optional(),
  channelId: z.string().max(128).optional().nullable(),
  publishedAt: z.string().max(64).optional().nullable(),
  selected: z.boolean(),
});

export const importYouTubeVideosSchema = z
  .object({
    courseId: z.uuid('Invalid course ID'),
    moduleId: z.string().uuid('Invalid module ID').optional(),
    playlistId: z.string().min(10).max(128),
    playlistTitle: z.string().max(500).optional(),
    channelTitle: z.string().max(300).optional().nullable(),
    playlistThumbnailUrl: urlOptional,
    /** When true, newly imported lessons are published immediately. */
    publishOnImport: z.boolean().optional().default(false),
    videos: z.array(importYouTubeVideoSchema).min(1, 'At least one video is required'),
  })
  .superRefine((data, ctx) => {
    const selected = data.videos.filter((v) => v.selected);
    if (selected.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Select at least one video to import',
        path: ['videos'],
      });
    }
  });

const protectionSchema = z.enum(['drm', 'aes', 'disable']);

const resolutionsSchema = z
  .array(z.enum(['240p', '360p', '480p', '540p', '720p', '1080p']))
  .min(1, 'Select at least one resolution');

export const getFreeCourseTpUploadConfigSchema = z.object({
  courseId: z.uuid('Invalid course ID'),
  moduleId: z.uuid('Invalid module ID'),
});

export const registerFreeCourseDirectTpUploadSchema = z.object({
  courseId: z.uuid('Invalid course ID'),
  moduleId: z.uuid('Invalid module ID'),
  tpAssetId: z.string().trim().min(1, 'TPStreams asset ID is required'),
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().max(2000).optional(),
  sortOrder: z.number().int().min(0).optional(),
  contentProtectionType: protectionSchema.optional(),
  generateSubtitles: z.boolean().optional(),
  resolutions: resolutionsSchema.optional(),
});

export const updateFreeCourseLessonSchema = z.object({
  title: z.string().min(1, 'Title is required').max(300).optional(),
  thumbnail_url: z
    .string()
    .optional()
    .nullable()
    .transform((v) => (v === null || v === undefined ? v : (v.trim() || null)))
    .refine(
      (v) => v === undefined || v === null || /^https?:\/\/.+/i.test(v),
      'Thumbnail must be a valid URL',
    ),
  description: z.string().max(5000).optional().nullable(),
  publish_status: z.enum(['draft', 'published', 'unpublished']).optional(),
  sort_order: z.number().int().min(0).optional(),
});

export type CreateFreeCourseInput = z.infer<typeof createFreeCourseSchema>;
export type UpdateFreeCourseBasicsInput = z.infer<typeof updateFreeCourseBasicsSchema>;
export type PreviewYouTubePlaylistInput = z.infer<typeof previewYouTubePlaylistSchema>;
export type ImportYouTubeVideosInput = z.infer<typeof importYouTubeVideosSchema>;
export type UpdateFreeCourseLessonInput = z.infer<typeof updateFreeCourseLessonSchema>;
export type RegisterFreeCourseDirectTpUploadInput = z.infer<typeof registerFreeCourseDirectTpUploadSchema>;
