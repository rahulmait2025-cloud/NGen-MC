import { z } from 'zod';

const workModeEnum = z.enum(['remote', 'onsite', 'hybrid']);
const employmentTypeEnum = z.enum(['internship', 'full_time', 'part_time', 'contract']);
const statusEnum = z.enum(['draft', 'open', 'paused', 'closed', 'archived']);
const visibilityScopeEnum = z.enum(['all_lms', 'selected_colleges', 'global_only', 'college_only']);

const stringToArray = z
  .string()
  .optional()
  .transform((val) => {
    if (!val || val.trim() === '') return [];
    return val
      .split('\n')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  });

export const createJobSchema = z
  .object({
    title: z.string().trim().min(1, 'Job title is required.'),
    company_name: z.string().trim().min(1, 'Company name is required.'),
    company_website: z
      .string()
      .trim()
      .url('Must be a valid URL.')
      .optional()
      .or(z.literal(''))
      .transform((v) => v || null),
    company_about: z.string().trim().optional().or(z.literal('')).transform((v) => v || null),
    location: z.string().trim().optional().or(z.literal('')).transform((v) => v || null),
    work_mode: workModeEnum.optional().or(z.literal('')).transform((v) => v || null),
    employment_type: employmentTypeEnum.optional().or(z.literal('')).transform((v) => v || null),
    experience_level: z.string().trim().optional().or(z.literal('')).transform((v) => v || null),
    salary_min_minor: z
      .string()
      .optional()
      .or(z.literal(''))
      .transform((v) => (v ? parseInt(v, 10) : null))
      .refine((v) => v === null || (!isNaN(v) && v >= 0), 'Must be a non-negative number.'),
    salary_max_minor: z
      .string()
      .optional()
      .or(z.literal(''))
      .transform((v) => (v ? parseInt(v, 10) : null))
      .refine((v) => v === null || (!isNaN(v) && v >= 0), 'Must be a non-negative number.'),
    salary_currency: z.string().trim().optional().or(z.literal('')).transform((v) => v || 'INR'),
    openings: z
      .string()
      .optional()
      .or(z.literal(''))
      .transform((v) => (v ? parseInt(v, 10) : null))
      .refine((v) => v === null || (!isNaN(v) && v > 0), 'Must be a positive number.'),
    application_deadline: z
      .string()
      .optional()
      .or(z.literal(''))
      .transform((v) => v || null),
    description: z.string().trim().min(1, 'Description is required.'),
    responsibilities: stringToArray,
    requirements: stringToArray,
    skills: stringToArray,
    perks: stringToArray,
    status: statusEnum.default('draft'),
    visibility_scope: visibilityScopeEnum.default('all_lms'),
    selected_college_ids: z.string().optional().or(z.literal('')).transform((v) => {
      if (!v || v.trim() === '') return [];
      return v.split(',').map((s) => s.trim()).filter((s) => s.length > 0);
    }),
  })
  .refine(
    (data) => {
      if (data.salary_min_minor != null && data.salary_max_minor != null) {
        return data.salary_min_minor <= data.salary_max_minor;
      }
      return true;
    },
    { message: 'Minimum salary cannot be greater than maximum salary.', path: ['salary_min_minor'] }
  )
  .refine(
    (data) => {
      if (data.visibility_scope === 'selected_colleges') {
        return data.selected_college_ids.length > 0;
      }
      return true;
    },
    { message: 'Select at least one college when visibility is set to selected colleges.', path: ['selected_college_ids'] }
  );

export const updateJobSchema = createJobSchema;

export type CreateJobFormData = z.infer<typeof createJobSchema>;
export type UpdateJobFormData = z.infer<typeof updateJobSchema>;
