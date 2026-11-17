import {beforeEach, describe, expect, it, vi} from 'vitest';
import {slugify} from '../src/lib/slug';
import {mediaRules, validMediaHeader, validMediaPath} from '../src/lib/media-validation';
import {verifyUploadedMedia} from '../src/lib/media-storage';
import {get, del} from '@vercel/blob';
vi.mock('@vercel/blob', () => ({get: vi.fn(), del: vi.fn()}));
const pdf = new TextEncoder().encode('%PDF-1.7\nTest document\n%%EOF');
beforeEach(() => vi.resetAllMocks());
describe('multilingual automatic slugs', () => {
  it('handles the Russian title in the reported form', () => expect(slugify('СИСТЕМЫ УПРАВЛЕНИЯ ТЕХНОЛОГИЧЕСКИМ ОБОРУДОВАНИЕМ')).toBe('sistemy-upravleniya-tekhnologicheskim-oborudovaniem'));
  it('handles Uzbek Cyrillic and apostrophes', () => {expect(slugify('Ўзбекистон — Қўлланма')).toBe('ozbekiston-qollanma');expect(slugify('O‘quv qo‘llanma')).toBe('oquv-qollanma');});
  it('trims separators after truncation', () => expect(slugify('a'.repeat(299) + ' - text')).not.toMatch(/-$/));
});
describe('media validation and storage verification', () => {
  it('accepts PDF, PNG, JPEG and WebP signatures, not arbitrary HTML or SVG', () => {
    expect(validMediaHeader('PDF','application/pdf', pdf)).toBe(true);
    expect(validMediaHeader('COVER','image/png',new Uint8Array([137,80,78,71,13,10,26,10]))).toBe(true);
    expect(validMediaHeader('COVER','image/jpeg',new Uint8Array([255,216,255]))).toBe(true);
    expect(validMediaHeader('COVER','image/webp',new TextEncoder().encode('RIFF0000WEBP'))).toBe(true);
    expect(validMediaHeader('PDF','application/pdf',new TextEncoder().encode('<script>bad</script>'))).toBe(false);
    expect(validMediaHeader('COVER','image/svg+xml',new TextEncoder().encode('<svg/>'))).toBe(false);
  });
  it('keeps uploads scoped to a book and kind', () => {
    expect(validMediaPath('book1','PDF','books/book1/pdf/unique.pdf')).toBe(true);
    for (const path of ['https://other.example/x.pdf','books/book2/pdf/unique.pdf','books/book1/cover/unique.pdf','books/book1/pdf/../secret.pdf']) expect(validMediaPath('book1','PDF',path)).toBe(false);
  });
  it('streams valid private content and records its actual size and SHA256', async () => {
    vi.mocked(get).mockResolvedValue({statusCode: 200, stream: new Blob([pdf]).stream(), blob: {contentType:'application/pdf',size:pdf.byteLength}} as never);
    const result = await verifyUploadedMedia('books/book1/pdf/test.pdf','PDF');
    expect(result.sizeBytes).toBe(pdf.byteLength);expect(result.checksum).toMatch(/^[a-f0-9]{64}$/);
    expect(del).not.toHaveBeenCalled();
  });
  it('rejects and removes disguised file content', async () => {
    const data=new TextEncoder().encode('<html>not a PDF</html>');
    vi.mocked(get).mockResolvedValue({statusCode: 200, stream: new Blob([data]).stream(), blob: {contentType:'application/pdf',size:data.byteLength}} as never);
    await expect(verifyUploadedMedia('bad.pdf','PDF')).rejects.toThrow('contents');expect(del).toHaveBeenCalledWith('bad.pdf');
  });
  it('rejects files larger than the advertised limit before reading them', async () => {
    vi.mocked(get).mockResolvedValue({statusCode:200,stream:new Blob([pdf]).stream(),blob:{contentType:'application/pdf',size:mediaRules.PDF.maxBytes+1}} as never);
    await expect(verifyUploadedMedia('large.pdf','PDF')).rejects.toThrow('size');expect(del).toHaveBeenCalledWith('large.pdf');
  });
});
