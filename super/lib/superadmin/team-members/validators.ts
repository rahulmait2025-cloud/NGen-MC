import { z } from 'zod';

const optionalUrl = z
  .string()
  .trim()
  .optional()
  .or(z.literal(''))
  .transform((v) => v || null)
  .refine(
    (v) => v === null || /^https:\/\/.+/i.test(v),
    'Must be a valid HTTPS URL.',
  );

const optionalEmail = z
  .string()
  .trim()
  .optional()
  .or(z.literal(''))
  .transform((v) => v || null)
  .refine(
    (v) => v === null || z.string().email().safeParse(v).success,
    'Must be a valid email address.',
  );

const optionalText = z
  .string()
  .trim()
  .optional()
  .or(z.literal(''))
  .transform((v) => v || null);

const boolFromForm = z
  .union([z.literal('true'), z.literal('false'), z.literal('on'), z.literal('')])
  .optional()
  .transform((v) => v === 'true' || v === 'on');

export const teamMemberFormSchema = z.object({
  name: z.string().trim().min(1, 'Name is required.').max(120, 'Name is too long.'),
  role: z.string().trim().min(1, 'Role is required.').max(160, 'Role is too long.'),
  short_role: optionalText,
  short_bio: optionalText.refine(
    (v) => v === null || v.length <= 240,
    'Short bio must be 240 characters or fewer.',
  ),
  full_bio: optionalText.refine(
    (v) => v === null || v.length <= 2000,
    'Full bio must be 2,000 characters or fewer.',
  ),
  photo_alt_text: optionalText,
  email: optionalEmail,
  linkedin_url: optionalUrl,
  twitter_url: optionalUrl,
  github_url: optionalUrl,
  instagram_url: optionalUrl,
  youtube_url: optionalUrl,
  personal_website_url: optionalUrl,
  location: optionalText.refine(
    (v) => v === null || v.length <= 120,
    'Location is too long.',
  ),
  is_founder: boolFromForm,
  is_featured: boolFromForm,
  is_published: boolFromForm,
  display_order: z
    .string()
    .optional()
    .or(z.literal(''))
    .transform((v) => (v ? parseInt(v, 10) : 0))
    .refine((v) => !Number.isNaN(v) && v >= 0, 'Display order must be a non-negative integer.'),
});

export type TeamMemberFormData = z.infer<typeof teamMemberFormSchema>;
