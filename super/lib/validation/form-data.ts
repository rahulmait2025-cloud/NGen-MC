import { z, type ZodTypeAny } from 'zod';

function formDataToObject(formData: FormData): Record<string, string> {
  const obj: Record<string, string> = {};

  for (const [key, value] of formData.entries()) {
    if (typeof value === 'string') {
      obj[key] = value;
      continue;
    }

    obj[key] = value.name;
  }

  return obj;
}

export function parseFormData<TSchema extends ZodTypeAny>(
  schema: TSchema,
  formData: FormData
):
  | { ok: true; data: z.infer<TSchema> }
  | { ok: false; error: string } {
  const parsed = schema.safeParse(formDataToObject(formData));
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? 'Invalid input.';
    return { ok: false, error: message };
  }

  return { ok: true, data: parsed.data };
}
