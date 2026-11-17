import type {UserRole} from '@prisma/client';
const hierarchy:Record<UserRole,number>={STUDENT:0,TEACHER:0,STAFF:0,LIBRARIAN:1,ADMIN:2,SUPER_ADMIN:3};
export function hasRole(role:UserRole,allowed:UserRole[]){return allowed.some(x=>hierarchy[role]>=hierarchy[x]&&(x==='LIBRARIAN'?['LIBRARIAN','ADMIN','SUPER_ADMIN'].includes(role):x==='ADMIN'?['ADMIN','SUPER_ADMIN'].includes(role):x==='SUPER_ADMIN'?role==='SUPER_ADMIN':role===x));}
