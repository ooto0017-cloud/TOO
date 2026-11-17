import {NextRequest,NextResponse} from 'next/server';
import {destroySession} from '@/lib/auth';
import {checkOrigin} from '@/lib/origin';
export async function POST(req:NextRequest){const rejected=checkOrigin(req);if(rejected)return rejected;await destroySession();return NextResponse.json({ok:true});}
