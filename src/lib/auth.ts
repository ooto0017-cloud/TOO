import {cache} from 'react';
import {cookies} from 'next/headers';
import {SignJWT, jwtVerify} from 'jose';
import {createHash, randomBytes} from 'node:crypto';
import {db} from './db';
export {hasRole} from './roles';
const cookieName = 'bu_library_session';
const secret = () => { const s=process.env.AUTH_SECRET; if(!s || s.length<32) throw new Error('AUTH_SECRET must be at least 32 characters'); return new TextEncoder().encode(s); };
export const hashToken=(token:string)=>createHash('sha256').update(token).digest('hex');
export async function createSession(userId:string) {
 const raw=randomBytes(32).toString('base64url'); const expiresAt=new Date(Date.now()+1000*60*60*24*7);
 await db.session.create({data:{tokenHash:hashToken(raw),userId,expiresAt}});
 const jwt=await new SignJWT({sid:raw}).setProtectedHeader({alg:'HS256'}).setIssuedAt().setExpirationTime('7d').sign(secret());
 const jar=await cookies(); jar.set(cookieName,jwt,{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/',expires:expiresAt});
}
export const currentUser = cache(async function currentUser() {
 try { const jar=await cookies(); const value=jar.get(cookieName)?.value; if(!value)return null;
  const {payload}=await jwtVerify(value,secret()); const raw=payload.sid; if(typeof raw!=='string')return null;
  const session=await db.session.findUnique({where:{tokenHash:hashToken(raw)},include:{user:true}});
  if(!session || session.expiresAt<new Date() || session.user.status!=='ACTIVE')return null;
  return session.user;
 } catch {return null;}
});
export async function destroySession(){const jar=await cookies();const value=jar.get(cookieName)?.value;if(value){try{const {payload}=await jwtVerify(value,secret());if(typeof payload.sid==='string')await db.session.deleteMany({where:{tokenHash:hashToken(payload.sid)}});}catch{}}jar.delete(cookieName);}
