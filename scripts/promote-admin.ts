import {PrismaClient} from '@prisma/client';
import {z} from 'zod';

const prisma = new PrismaClient();
async function main() {
  const email = z.email().parse(process.argv[2]?.trim().toLowerCase());
  const user = await prisma.user.findUnique({where: {email}});
  if (!user || user.status !== 'ACTIVE') throw new Error('An active registered account is required.');
  if (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') {
    console.log('The account already has administrator access.');
    return;
  }
  await prisma.$transaction(async tx => {
    await tx.user.update({where: {id: user.id}, data: {role: 'ADMIN'}});
    await tx.auditLog.create({data: {actorId: user.id, action: 'USER_ADMIN_BOOTSTRAP', entity: 'User', entityId: user.id}});
  });
  console.log('Administrator access granted; the account password was preserved.');
}
main().catch(error => {console.error(error instanceof Error ? error.message : 'Admin promotion failed'); process.exitCode = 1;}).finally(() => prisma.$disconnect());
