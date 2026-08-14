import { z } from 'zod';

const optionalText = z
  .string()
  .trim()
  .optional()
  .or(z.literal(''))
  .transform((v) => v || null);

export const teamPageSettingsFormSchema = z.object({
  hero_title: z
    .string()
    .trim()
    .min(1, 'Hero title is required.')
    .max(100, 'Hero title must be 100 characters or fewer.'),
  hero_description: z
    .string()
    .trim()
    .min(1, 'Hero description is required.')
    .max(300, 'Hero description must be 300 characters or fewer.'),
  hero_annotation: optionalText.refine(
    (v) => v === null || v.length <= 120,
    'Hero annotation must be 120 characters or fewer.',
  ),
  hero_image_alt_text: optionalText.refine(
    (v) => v === null || v.length <= 160,
    'Alt text must be 160 characters or fewer.',
  ),
});

export type TeamPageSettingsFormData = z.infer<typeof teamPageSettingsFormSchema>;
