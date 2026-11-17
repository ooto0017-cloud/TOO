import {get, del} from '@vercel/blob';
import {createHash} from 'node:crypto';
import {mediaRules, validMediaHeader, type MediaKind} from './media-validation';
export class MediaError extends Error {
  constructor(message: string, public status = 400) {super(message);}
}
export async function verifyUploadedMedia(pathname: string, kind: MediaKind) {
  const content = await get(pathname, {access: 'private', useCache: false});
  if (!content || content.statusCode !== 200) throw new MediaError('Upload not found', 404);
  const rule = mediaRules[kind];
  const mimeType = content.blob.contentType.split(';')[0];
  if (!(rule.types as readonly string[]).includes(mimeType) || content.blob.size > rule.maxBytes || content.blob.size < 1) {
    await content.stream.cancel(); await del(pathname); throw new MediaError('Invalid file type or size');
  }
  const reader = content.stream.getReader(); const hash = createHash('sha256');
  let bytes = 0; let prefix = new Uint8Array(0);
  try {
    while (true) {
      const chunk = await reader.read(); if (chunk.done) break;
      bytes += chunk.value.byteLength;
      if (bytes > rule.maxBytes) throw new MediaError('File too large');
      if (prefix.length < 1024) {const next = new Uint8Array(Math.min(1024, prefix.length + chunk.value.length)); next.set(prefix); next.set(chunk.value.slice(0, next.length - prefix.length), prefix.length); prefix = next;}
      hash.update(chunk.value);
    }
  } finally {await reader.cancel().catch(() => {}); reader.releaseLock();}
  if (bytes !== content.blob.size || !validMediaHeader(kind, mimeType, prefix)) {
    await del(pathname); throw new MediaError('File contents do not match the selected type');
  }
  return {mimeType, sizeBytes: bytes, checksum: hash.digest('hex')};
}
