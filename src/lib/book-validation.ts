import {z} from 'zod';

export const bookSchema = z.object({
  title: z.string().trim().min(1).max(300),
  slug: z.string().trim().min(1).max(320).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  description: z.string().max(20000).default(''),
  isbn: z.string().trim().max(20).nullable().optional(),
  language: z.enum(['uz', 'ru', 'en']).default('uz'),
  publicationYear: z.number().int().min(1400).max(new Date().getFullYear() + 1).nullable().optional(),
  pages: z.number().int().positive().max(2147483647).nullable().optional(),
  status: z.enum(['ACTIVE', 'DRAFT', 'ARCHIVED']).default('DRAFT'),
  featured: z.boolean().default(false),
  downloadsAllowed: z.boolean().default(false),
  authorNames: z.array(z.string().trim().min(1).max(160)).max(20).optional(),
});

export function positiveInteger(value: string | null | undefined, fallback: number, max = 100000) {
  const n = Number(value);
  return Number.isSafeInteger(n) && n > 0 ? Math.min(n, max) : fallback;
}
