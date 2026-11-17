import {beforeEach, describe, expect, it, vi} from 'vitest';
import {NextRequest} from 'next/server';
import {GET} from '../src/app/api/books/[id]/file/route';
import {POST as authorizeUpload} from '../src/app/api/uploads/route';
import {POST as attach} from '../src/app/api/books/[id]/attachments/route';
import {currentUser} from '../src/lib/auth';
import {db} from '../src/lib/db';
import {get} from '@vercel/blob';
vi.mock('next/server', async importOriginal => ({...await importOriginal<typeof import('next/server')>(), after: vi.fn()}));
vi.mock('@/lib/auth', async () => ({currentUser: vi.fn(), hasRole: (await import('../src/lib/roles')).hasRole}));
vi.mock('@/lib/db', () => ({db: {book: {findUnique: vi.fn()}, $transaction: vi.fn()}}));
vi.mock('@vercel/blob', () => ({get: vi.fn(), del: vi.fn()}));
const context={params:Promise.resolve({id:'book1'})};
const book={title:'Test',status:'ACTIVE',downloadsAllowed:false,files:[{storageKey:'books/book1/pdf/test.pdf',mimeType:'application/pdf'}]};
beforeEach(()=>{vi.resetAllMocks();vi.mocked(currentUser).mockResolvedValue(null);vi.mocked(db.book.findUnique).mockResolvedValue(book as never);});
describe('private library media access',()=>{
  it('requires sign-in for PDFs',async()=>expect((await GET(new NextRequest('https://library.test/api/books/book1/file'),context)).status).toBe(401));
  it('does not expose draft media publicly',async()=>{vi.mocked(db.book.findUnique).mockResolvedValue({...book,status:'DRAFT'} as never);expect((await GET(new NextRequest('https://library.test/api/books/book1/file?kind=COVER'),context)).status).toBe(404);expect(get).not.toHaveBeenCalled();});
  it('serves active cover images publicly without exposing storage URLs',async()=>{
    vi.mocked(db.book.findUnique).mockResolvedValue({...book,files:[{storageKey:'books/book1/cover/test.png',mimeType:'image/png'}]} as never);
    vi.mocked(get).mockResolvedValue({statusCode:200,stream:new Blob(['image']).stream()} as never);
    const response=await GET(new NextRequest('https://library.test/api/books/book1/file?kind=COVER'),context);
    expect(response.status).toBe(200);expect(response.headers.get('content-type')).toBe('image/png');expect(response.headers.get('location')).toBeNull();
  });
  it('checks download policy for readers',async()=>{vi.mocked(currentUser).mockResolvedValue({id:'reader1',role:'STUDENT'} as never);expect((await GET(new NextRequest('https://library.test/api/books/book1/file?download=1'),context)).status).toBe(403);});
  it('allows signed-in readers to stream published PDFs',async()=>{vi.mocked(currentUser).mockResolvedValue({id:'reader1',role:'STUDENT'} as never);vi.mocked(get).mockResolvedValue({statusCode:200,stream:new Blob(['%PDF-test']).stream()} as never);expect((await GET(new NextRequest('https://library.test/api/books/book1/file'),context)).status).toBe(200);});
  it('prevents students from creating upload tokens or finalizing files',async()=>{
    vi.mocked(currentUser).mockResolvedValue({id:'reader1',role:'STUDENT'} as never);
    const request=()=>new NextRequest('https://library.test/api/uploads',{method:'POST',body:'{}'});
    expect((await authorizeUpload(request())).status).toBe(403);expect((await attach(request(),context)).status).toBe(403);
  });
  it('rejects external paths before fetching a blob',async()=>{
    vi.mocked(currentUser).mockResolvedValue({id:'staff1',role:'LIBRARIAN'} as never);
    const request=new NextRequest('https://library.test/api/books/book1/attachments',{method:'POST',body:JSON.stringify({kind:'PDF',pathname:'https://attacker.example/test.pdf'})});
    expect((await attach(request,context)).status).toBe(400);expect(get).not.toHaveBeenCalled();
  });
});

describe('verified attachment persistence', () => {
  it('replaces file metadata and audits the staff member in one transaction', async () => {
    vi.mocked(currentUser).mockResolvedValue({id: 'staff1', role: 'LIBRARIAN'} as never);
    const bytes = new TextEncoder().encode('%PDF-1.4\nValid test\n%%EOF');
    vi.mocked(get).mockResolvedValue({statusCode: 200, stream: new Blob([bytes]).stream(), blob: {contentType: 'application/pdf', size: bytes.length}} as never);
    const tx = {book: {update: vi.fn()}, bookFile: {findMany: vi.fn().mockResolvedValue([]), deleteMany: vi.fn(), create: vi.fn().mockResolvedValue({id: 'file1', kind: 'PDF', sizeBytes: bytes.length})}, auditLog: {create: vi.fn()}};
    vi.mocked(db.$transaction).mockImplementation((async (work: (transaction: unknown) => Promise<unknown>) => work(tx)) as never);
    const request = new NextRequest('https://library.test/api/books/book1/attachments', {method: 'POST', body: JSON.stringify({kind: 'PDF', pathname: 'books/book1/pdf/test.pdf'})});
    const response = await attach(request, context);
    expect(response.status).toBe(201);
    expect(tx.bookFile.create).toHaveBeenCalledWith(expect.objectContaining({data: expect.objectContaining({bookId: 'book1', kind: 'PDF', sizeBytes: bytes.length, checksum: expect.stringMatching(/^[a-f0-9]{64}$/)})}));
    expect(tx.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({data: expect.objectContaining({actorId: 'staff1', action: 'BOOK_FILE_UPLOAD'})}));
  });
});
