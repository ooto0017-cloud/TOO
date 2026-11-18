export const BOOK_SECTIONS = ['METHODICAL', 'FICTION', 'EDUCATIONAL', 'LANGUAGE'] as const;
export type BookSectionKey = typeof BOOK_SECTIONS[number];
export function isBookSection(value: unknown): value is BookSectionKey {
  return typeof value === 'string' && (BOOK_SECTIONS as readonly string[]).includes(value);
}
