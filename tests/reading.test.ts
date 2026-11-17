import {beforeEach, describe, expect, it, vi} from 'vitest';
import {NextRequest} from 'next/server';
import {PUT as saveProgress} from '../src/app/api/me/reading/[bookId]/route';
import {PUT as saveBook, DELETE as removeSaved} from '../src/app/api/me/saved/[bookId]/route';
import {readingPercent, readingSchema} from '../src/lib/reading';
import {currentUser} from '../src/lib/auth';
import {db} from '../src/lib/db';
vi.mock('@/lib/auth', () => ({currentUser: vi.fn()}));
vi.mock('@/lib/db', () => ({db: {book: {findFirst: vi.fn()}, readingProgress: {upsert: vi.fn()}, favorite: {upsert: vi.fn(), deleteMany: vi.fn()}}}));
const context = {params: Promise.resolve({bookId: 'book1'})};
const request = (data: unknown, method = 'PUT') => new NextRequest('https://library.test/api/me/reading/book1', {method, headers: {'Content-Type': 'application/json'}, body: JSON.stringify(data)});
beforeEach(() => {vi.resetAllMocks();vi.mocked(currentUser).mockResolvedValue({id: 'student1', role: 'STUDENT'} as never);vi.mocked(db.book.findFirst).mockResolvedValue({id: 'book1'} as never);vi.mocked(db.readingProgress.upsert).mockResolvedValue({page: 2, totalPages: 10, completedAt: null} as never);});
describe('student reading data', () => {
  it('requires authentication for reading and saved books', async () => {vi.mocked(currentUser).mockResolvedValue(null);expect((await saveProgress(request({page: 1, totalPages: 10}), context)).status).toBe(401);expect((await saveBook(request({}), context)).status).toBe(401);expect((await removeSaved(request({}, 'DELETE'), context)).status).toBe(401);});
  it('rejects invalid page ranges', async () => {expect((await saveProgress(request({page: 11, totalPages: 10}), context)).status).toBe(400);expect(db.readingProgress.upsert).not.toHaveBeenCalled();expect(readingSchema.safeParse({page: 0, totalPages: 10}).success).toBe(false);});
  it('uses the signed-in student identity, ignoring a client-supplied user ID', async () => {
    const response = await saveProgress(request({page: 2, totalPages: 10, userId: 'another-student'}), context);expect(response.status).toBe(200);
    expect(db.readingProgress.upsert).toHaveBeenCalledWith(expect.objectContaining({where: {userId_bookId: {userId: 'student1', bookId: 'book1'}}, create: expect.objectContaining({userId: 'student1', page: 2, totalPages: 10, completedAt: null})}));
  });
  it('marks completion explicitly and resets it when reading resumes', async () => {
    await saveProgress(request({page: 2, totalPages: 10, completed: true}), context);
    expect(db.readingProgress.upsert).toHaveBeenLastCalledWith(expect.objectContaining({update: expect.objectContaining({page: 10, completedAt: expect.any(Date)})}));
    await saveProgress(request({page: 1, totalPages: 10, completed: false}), context);
    expect(db.readingProgress.upsert).toHaveBeenLastCalledWith(expect.objectContaining({update: expect.objectContaining({page: 1, completedAt: null})}));
  });
  it('prevents reading and saving unavailable books', async () => {vi.mocked(db.book.findFirst).mockResolvedValue(null);expect((await saveProgress(request({page: 1, totalPages: 10}), context)).status).toBe(404);expect((await saveBook(request({}), context)).status).toBe(404);expect(db.readingProgress.upsert).not.toHaveBeenCalled();});
  it('saves idempotently and removes only the current student’s bookmark', async () => {
    expect((await saveBook(request({userId: 'other'}), context)).status).toBe(200);
    expect(db.favorite.upsert).toHaveBeenCalledWith({where: {userId_bookId: {userId: 'student1', bookId: 'book1'}}, create: {userId: 'student1', bookId: 'book1'}, update: {}});
    expect((await removeSaved(request({}, 'DELETE'), context)).status).toBe(200);expect(db.favorite.deleteMany).toHaveBeenCalledWith({where: {userId: 'student1', bookId: 'book1'}});
  });
  it('rejects cross-origin writes', async () => {const req = new NextRequest('https://library.test/api/me/reading/book1', {method: 'PUT', headers: {origin: 'https://attacker.test'}, body: '{}'});expect((await saveProgress(req, context)).status).toBe(403);expect(db.readingProgress.upsert).not.toHaveBeenCalled();});
  it('keeps the progress below 100% until explicitly completed', () => {expect(readingPercent(10, 10, false)).toBe(99);expect(readingPercent(10, 10, true)).toBe(100);expect(readingPercent(1, null, false)).toBe(0);});
});
