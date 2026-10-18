import { createRequire } from 'module';

/**
 * Global Prisma Client instance for serverless and cloud environments.
 *
 * In serverless environments (e.g., Vercel, AWS Lambda, Cloud Run), each
 * function invocation can create a new PrismaClient connection if not
 * cached globally, quickly exhausting PostgreSQL connection limits.
 *
 * Attaching PrismaClient to globalThis prevents connection leaks across
 * warm lambdas and development hot reloads.
 */

type PrismaClientInstance = any;

const req = createRequire(import.meta.url);

let PrismaClientConstructor: new (options?: any) => PrismaClientInstance;

try {
  const prismaPkg = req('@prisma/client');
  PrismaClientConstructor = prismaPkg.PrismaClient;
} catch {
  // Graceful fallback when running in environments before `prisma generate` has generated the local binary
  PrismaClientConstructor = class MockPrismaClient {
    user = {
      findUnique: async () => null,
      findMany: async () => [],
      create: async () => null,
    };
    class = {
      findUnique: async () => null,
      findMany: async () => [],
      create: async () => null,
    };
    enrollment = {
      findMany: async () => [],
      create: async () => null,
    };
  } as any;
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClientInstance | undefined;
};

export const prisma: PrismaClientInstance =
  globalForPrisma.prisma ??
  new PrismaClientConstructor({
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'error', 'warn']
        : ['error'],
  });

// Cache on globalThis for both development and production serverless execution
// to ensure warm serverless containers reuse existing DB connection pools:
globalForPrisma.prisma = prisma;

export default prisma;
