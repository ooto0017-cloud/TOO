import {describe, expect, it} from 'vitest';
import {bookSchema, positiveInteger} from '../src/lib/book-validation';
describe('book editor validation', () => {
  it('accepts an empty optional ISBN and nullable numeric fields', () => {
    const result = bookSchema.parse({title: '  Algebra  ', slug: 'algebra', isbn: null, pages: null, publicationYear: null, authorNames: [' Test Author ']});
    expect(result.title).toBe('Algebra');
    expect(result.authorNames).toEqual(['Test Author']);
    expect(result.status).toBe('DRAFT');
  });
  it.each([{title: ' ', slug: 'book'}, {title: 'Book', slug: '../bad'}, {title: 'Book', slug: 'book', pages: -1}, {title: 'Book', slug: 'book', status: 'PUBLIC'}])('rejects invalid editor input %j', input => expect(bookSchema.safeParse(input).success).toBe(false));
  it('ignores client-supplied IDs and role fields', () => expect(bookSchema.parse({title: 'Book', slug: 'book', id: 'other', role: 'SUPER_ADMIN'})).not.toHaveProperty('id'));
});
describe('pagination input', () => {
  it.each(['NaN','Infinity','-1','0','1.5',undefined])('falls back for invalid input %s', value => expect(positiveInteger(value, 1)).toBe(1));
  it('caps page sizes', () => expect(positiveInteger('999', 12, 50)).toBe(50));
});
