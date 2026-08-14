import { z } from 'zod';

export const STUDENT_USERNAME_MIN_LENGTH = 4;
export const STUDENT_USERNAME_MAX_LENGTH = 20;
export const STUDENT_USERNAME_PATTERN = /^[a-z0-9_]+$/;

export const studentUsernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(STUDENT_USERNAME_MIN_LENGTH, `Username must be at least ${STUDENT_USERNAME_MIN_LENGTH} characters.`)
  .max(STUDENT_USERNAME_MAX_LENGTH, `Username must be at most ${STUDENT_USERNAME_MAX_LENGTH} characters.`)
  .refine((val) => !/[.\s\-]/.test(val), {
    message: 'Username cannot contain dots, spaces, or hyphens.',
  })
  .refine((val) => STUDENT_USERNAME_PATTERN.test(val), {
    message: 'Username must contain only lowercase letters, numbers, and underscores.',
  });
