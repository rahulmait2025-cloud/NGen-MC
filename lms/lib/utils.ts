import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Compare Supabase UUIDs with route params (casing/whitespace can differ). */
export function normUuid(id: string | null | undefined): string {
  return (id ?? '').trim().toLowerCase();
}
