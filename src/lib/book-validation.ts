import {z} from 'zod';
import {BOOK_SECTIONS} from './book-sections';
export const bookSectionSchema = z.enum(BOOK_SECTIONS);

export const bookSchema = z.object({
  section: bookSectionSchema.optional(),
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

export const createBookSchema = bookSchema.extend({section: bookSectionSchema});

export function positiveInteger(value: string | null | undefined, fallback: number, max = 100000) {
  const n = Number(value);
  return Number.isSafeInteger(n) && n > 0 ? Math.min(n, max) : fallback;
}

// Zod defaults also run inside partial objects; PATCH must never apply create defaults.
export const updateBookSchema = bookSchema.partial().extend({
  description: z.string().max(20000).optional(),
  language: z.enum(['uz', 'ru', 'en']).optional(),
  status: z.enum(['ACTIVE', 'DRAFT', 'ARCHIVED']).optional(),
  featured: z.boolean().optional(),
  downloadsAllowed: z.boolean().optional(),
});
