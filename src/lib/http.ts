import {NextResponse} from 'next/server';
export function jsonError(message:string,status=400){return NextResponse.json({error:message},{status});}
export function safeError(error:unknown){if(process.env.NODE_ENV!=='production')console.error(error);return jsonError('Internal server error',500);}
