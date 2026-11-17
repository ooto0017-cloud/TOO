export type MediaKind = 'PDF' | 'COVER';
export const mediaRules = {
  PDF: {maxBytes: 50 * 1024 * 1024, types: ['application/pdf']},
  COVER: {maxBytes: 10 * 1024 * 1024, types: ['image/jpeg', 'image/png', 'image/webp']},
} as const;
export function isMediaKind(kind: unknown): kind is MediaKind {return kind === 'PDF' || kind === 'COVER';}
export function validMediaHeader(kind: MediaKind, mime: string, bytes: Uint8Array) {
  if (kind === 'PDF') return mime === 'application/pdf' && new TextDecoder('ascii').decode(bytes.slice(0, 1024)).includes('%PDF-');
  if (mime === 'image/jpeg') return bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  if (mime === 'image/png') return [137,80,78,71,13,10,26,10].every((n, i) => bytes[i] === n);
  if (mime === 'image/webp') return new TextDecoder().decode(bytes.slice(0,4)) === 'RIFF' && new TextDecoder().decode(bytes.slice(8,12)) === 'WEBP';
  return false;
}
export function validMediaPath(bookId: string, kind: MediaKind, path: string) {
  return /^[a-z0-9]+$/i.test(bookId) && new RegExp(`^books/${bookId}/${kind.toLowerCase()}/[a-zA-Z0-9_-]+\\.(pdf|jpg|png|webp)$`).test(path);
}
