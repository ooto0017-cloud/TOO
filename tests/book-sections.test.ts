import {describe, expect, it} from 'vitest';
import {BOOK_SECTIONS, isBookSection} from '../src/lib/book-sections';
import {bookSchema, createBookSchema, updateBookSchema} from '../src/lib/book-validation';
describe('book section selection', () => {
  it.each(BOOK_SECTIONS)('allows %s when creating a book', section => expect(createBookSchema.parse({title:'Book',slug:'book',section}).section).toBe(section));
  it('requires one of the four sections for a new book', () => {
    expect(createBookSchema.safeParse({title:'Book',slug:'book'}).success).toBe(false);
    expect(createBookSchema.safeParse({title:'Book',slug:'book',section:''}).success).toBe(false);
    expect(createBookSchema.safeParse({title:'Book',slug:'book',section:'OTHER'}).success).toBe(false);
  });
  it('preserves the section on unrelated partial metadata updates', () => expect(bookSchema.partial().parse({status:'ACTIVE'})).not.toHaveProperty('section'));
  it('never resets status, language, description or download policy during a partial update', () => {expect(updateBookSchema.parse({section:'FICTION'})).toEqual({section:'FICTION'});expect(updateBookSchema.parse({status:'ACTIVE'})).toEqual({status:'ACTIVE'});});
  it('accepts only known section filter values', () => {expect(isBookSection('FICTION')).toBe(true);expect(isBookSection('fiction')).toBe(false);expect(isBookSection(undefined)).toBe(false);expect(isBookSection('FICTION OR 1=1')).toBe(false);});
});
