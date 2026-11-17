'use client';
import {type MediaKind} from './media-validation';
export async function uploadMedia(bookId: string, kind: MediaKind, file: File, onProgress: (percentage: number) => void, previousPath?: string) {
  let pathname = previousPath;
  if (!pathname) {
    const {upload} = await import('@vercel/blob/client');
    const extension = kind === 'PDF' ? 'pdf' : file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
    const result = await upload(`books/${bookId}/${kind.toLowerCase()}/${crypto.randomUUID()}.${extension}`, file, {access: 'private', handleUploadUrl: '/api/uploads', clientPayload: JSON.stringify({bookId, kind}), contentType: file.type, multipart: file.size > 5 * 1024 * 1024, onUploadProgress: ({percentage}) => onProgress(percentage)});
    pathname = result.pathname;
  }
  return pathname;
}
