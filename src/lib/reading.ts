import {z} from 'zod';
export const readingSchema = z.object({page: z.number().int().min(1).max(100000), totalPages: z.number().int().min(1).max(100000), completed: z.boolean().default(false)}).refine(value => value.page <= value.totalPages, {message: 'Page exceeds the document length', path: ['page']});
export function readingPercent(page: number, total: number | null, completed: boolean) {
  if (completed) return 100;
  return total ? Math.max(0, Math.min(99, Math.round(page / total * 100))) : 0;
}
