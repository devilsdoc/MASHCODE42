import bcrypt from 'bcryptjs';
import { db } from '../src/server/db.ts';
import { prisma } from '../src/lib/prisma.ts';

const ADMIN_EMAIL = 'manishnagare258@gmail.com';
const ADMIN_PASSWORD = 'M@nii1212';
const ADMIN_NAME = 'Manish Nagare (Super Admin)';

async function seedAdmin() {
  console.log('====================================================');
  console.log('👑 MASHCODE SUPER ADMIN SEED SCRIPT');
  console.log(`Target Email:    ${ADMIN_EMAIL}`);
  console.log(`Target Password: [MASKED - ${ADMIN_PASSWORD.length} chars]`);
  console.log('====================================================');

  const salt = bcrypt.genSaltSync(10);
  const passwordHash = bcrypt.hashSync(ADMIN_PASSWORD, salt);

  // 1. Seed into the persistent local/server store
  console.log('\n[1/2] Seeding in-memory / local JSON store...');
  const storeAdmin = db.seedAdminUser();
  console.log(`✅ Local Store: Admin ensured (ID: ${storeAdmin.id}, Role: ${storeAdmin.role}, Email: ${storeAdmin.email})`);

  // 2. If Prisma & DATABASE_URL are configured, upsert into PostgreSQL
  console.log('\n[2/2] Checking PostgreSQL / Prisma connection...');
  if (process.env.DATABASE_URL) {
    try {
      if ((prisma as any)?.user) {
        // Demote any unauthorized user who might have admin role
        await (prisma as any).user.updateMany({
          where: {
            email: { not: ADMIN_EMAIL },
            role: { in: ['admin', 'ADMIN'] },
          },
          data: {
            role: 'teacher',
          },
        });

        // Upsert the single super admin
        const pgAdmin = await (prisma as any).user.upsert({
          where: { email: ADMIN_EMAIL },
          update: {
            passwordHash,
            role: 'ADMIN',
            name: ADMIN_NAME,
          },
          create: {
            email: ADMIN_EMAIL,
            name: ADMIN_NAME,
            passwordHash,
            role: 'ADMIN',
          },
        });
        console.log(`✅ PostgreSQL (Prisma): Admin successfully upserted (ID: ${pgAdmin.id}, Role: ${pgAdmin.role})`);
      } else {
        console.log('ℹ️ Prisma client is not active or user model not loaded in this environment. Skipped PostgreSQL direct query.');
      }
    } catch (prismaErr: any) {
      console.warn(`⚠️ Prisma Postgres seed warning (non-fatal): ${prismaErr.message}`);
    }
  } else {
    console.log('ℹ️ DATABASE_URL not set in local environment; local file/memory store was seeded successfully.');
  }

  console.log('\n====================================================');
  console.log('🎉 Super Admin account is ready to use!');
  console.log(`Login Email:    ${ADMIN_EMAIL}`);
  console.log(`Login Password: ${ADMIN_PASSWORD}`);
  console.log('====================================================');
}

seedAdmin()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Failed to seed Super Admin:', err);
    process.exit(1);
  });
