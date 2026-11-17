import {handleUpload, type HandleUploadBody} from '@vercel/blob/client';
import {NextRequest, NextResponse} from 'next/server';
import {currentUser, hasRole} from '@/lib/auth';
import {db} from '@/lib/db';
import {checkOrigin} from '@/lib/origin';
import {isMediaKind, mediaRules, validMediaPath} from '@/lib/media-validation';

export const runtime = 'nodejs';
export async function POST(req: NextRequest) {
  const rejected = checkOrigin(req); if (rejected) return rejected;
  const user = await currentUser();
  if (!user || !hasRole(user.role, ['LIBRARIAN'])) return NextResponse.json({error: 'Forbidden'}, {status: 403});
  try {
    const body = await req.json() as HandleUploadBody;
    const result = await handleUpload({request: req, body, onBeforeGenerateToken: async (pathname, payload) => {
      const data: {bookId?: unknown; kind?: unknown} = JSON.parse(payload || '{}');
      if (typeof data.bookId !== 'string' || !isMediaKind(data.kind) || !validMediaPath(data.bookId, data.kind, pathname)) throw new Error('Invalid upload');
      if (!await db.book.findUnique({where: {id: data.bookId}, select: {id: true}})) throw new Error('Book not found');
      return {allowedContentTypes: [...mediaRules[data.kind].types], maximumSizeInBytes: mediaRules[data.kind].maxBytes, addRandomSuffix: false, allowOverwrite: false, validUntil: Date.now() + 30 * 60 * 1000};
    }});
    return NextResponse.json(result);
  } catch {return NextResponse.json({error: 'Could not authorize upload'}, {status: 400});}
}
