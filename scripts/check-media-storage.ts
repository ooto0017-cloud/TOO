import {randomUUID} from 'node:crypto';
import {put, del} from '@vercel/blob';
import {put as clientPut, generateClientTokenFromReadWriteToken} from '@vercel/blob/client';
import {verifyUploadedMedia} from '../src/lib/media-storage';
import {mediaRules} from '../src/lib/media-validation';

async function main() {
  const prefix = `verification/${randomUUID()}`;
  const paths = [`${prefix}/test.pdf`, `${prefix}/cover.png`];
  try {
    const token = await generateClientTokenFromReadWriteToken({pathname: paths[0], allowedContentTypes: ['application/pdf'], maximumSizeInBytes: mediaRules.PDF.maxBytes, addRandomSuffix: false, allowOverwrite: false, validUntil: Date.now() + 300000});
    await clientPut(paths[0], new Blob(['%PDF-1.4\nStorage verification\n%%EOF'], {type: 'application/pdf'}), {access: 'private', token, contentType: 'application/pdf'});
    const pdf = await verifyUploadedMedia(paths[0], 'PDF');
    const image = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jrdsAAAAASUVORK5CYII=', 'base64');
    await put(paths[1], image, {access: 'private', contentType: 'image/png', addRandomSuffix: false});
    const cover = await verifyUploadedMedia(paths[1], 'COVER');
    if (!pdf.checksum || cover.sizeBytes !== image.length) throw new Error('Unexpected storage verification result');
    console.log('Private PDF client-token upload, cover upload and streamed signature/checksum verification passed.');
  } finally {await del(paths);}
}
main().catch(error => {console.error(error instanceof Error ? error.message.replace(/vercel_blob_[^\s]+/g, '[redacted]') : 'Storage verification failed');process.exitCode = 1;});
