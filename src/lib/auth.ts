import bcrypt from 'bcryptjs';
import { prisma } from './prisma.ts';
import { db } from '../server/db.ts';

/**
 * NextAuth Configuration Options for Mashcode
 *
 * Configured specifically for production serverless deployments (Vercel / Cloud Run / AWS):
 * 1. NEXTAUTH_URL is dynamically resolved from environment variables, never hardcoded to localhost.
 * 2. useSecureCookies is enabled in production for secure HTTPS transmission.
 * 3. Secret explicitly reads process.env.JWT_SECRET (or process.env.NEXTAUTH_SECRET).
 * 4. Error logging on authentication attempts to provide immediate visibility in live logs.
 */

// Dynamically determine base URL without hardcoding localhost in production
export const getNextAuthUrl = (): string => {
  if (process.env.NEXTAUTH_URL) {
    return process.env.NEXTAUTH_URL;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  if (process.env.APP_URL) {
    return process.env.APP_URL;
  }
  return process.env.NODE_ENV === 'production'
    ? ''
    : 'http://localhost:3000';
};

const isProduction =
  process.env.NODE_ENV === 'production' ||
  Boolean(process.env.VERCEL) ||
  Boolean(process.env.VERCEL_ENV === 'production') ||
  Boolean(process.env.RAILWAY_ENVIRONMENT) ||
  Boolean(process.env.RENDER) ||
  Boolean(process.env.NEXTAUTH_URL?.startsWith('https'));

// Ensure the JWT_SECRET is read from environment variables
const jwtSecret =
  process.env.JWT_SECRET ||
  process.env.NEXTAUTH_SECRET ||
  'mashcode-production-jwt-secret-key-fallback-42';

if (!process.env.JWT_SECRET && !process.env.NEXTAUTH_SECRET) {
  console.warn(
    '[NextAuth Warning] Neither JWT_SECRET nor NEXTAUTH_SECRET is defined in environment variables. Set JWT_SECRET in your deployment settings.'
  );
}

export const authOptions: any = {
  // Use JWT_SECRET as the primary secret for NextAuth
  secret: process.env.JWT_SECRET || jwtSecret,

  // Set useSecureCookies: true for production environment over HTTPS
  useSecureCookies: isProduction,

  cookies: {
    sessionToken: {
      name: `${isProduction ? '__Secure-' : ''}next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: isProduction,
      },
    },
    callbackUrl: {
      name: `${isProduction ? '__Secure-' : ''}next-auth.callback-url`,
      options: {
        sameSite: 'lax',
        path: '/',
        secure: isProduction,
      },
    },
    csrfToken: {
      name: `${isProduction ? '__Host-' : ''}next-auth.csrf-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: isProduction,
      },
    },
  },

  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  providers: [
    {
      id: 'credentials',
      name: 'Credentials',
      type: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials: any) {
        const rawEmail = credentials?.email;
        const password = credentials?.password;

        console.log(`[NextAuth Login] Login attempt received for email: "${rawEmail}"`);

        if (!rawEmail || !password) {
          console.log('[NextAuth Login] Failed: Missing email or password');
          return null;
        }

        const normalizedEmail = rawEmail.trim().toLowerCase();

        // 1. Look up user in database
        let user: any = null;
        try {
          user = await (prisma as any).user.findUnique({
            where: { email: normalizedEmail },
          });
        } catch (dbError) {
          console.error('[NextAuth Login] Database lookup exception:', dbError);
        }

        if (!user) {
          user = db.findUserByEmail(normalizedEmail);
          if (user) {
            console.log(`[NextAuth Login] User found via store fallback: ID=${user.id}, Role=${user.role}`);
          }
        }

        console.log(
          `[NextAuth Login] User found in database: ${Boolean(user)}`,
          user
            ? `(ID: ${user.id}, Role: ${user.role}, Email in DB: "${user.email}")`
            : `(No user found for email "${normalizedEmail}")`
        );

        if (!user) {
          console.log(`[NextAuth Login] Failed: User with email "${normalizedEmail}" not found in database.`);
          return null;
        }

        // 2. Validate password
        try {
          const isPasswordValid = bcrypt.compareSync(password, user.passwordHash);
          if (!isPasswordValid) {
            console.log(
              `[NextAuth Login] Failed: Password check failed for user "${user.email}" (password hash mismatch).`
            );
            return null;
          }
        } catch (bcryptErr) {
          console.error(
            `[NextAuth Login] Failed: Error during bcrypt password check for "${user.email}":`,
            bcryptErr
          );
          return null;
        }

        console.log(`[NextAuth Login] Success: User "${user.email}" authenticated successfully as role "${user.role}"`);

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          leetcodeUsername: user.leetcodeUsername,
        };
      },
    },
  ],

  callbacks: {
    async jwt({ token, user }: any) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.leetcodeUsername = user.leetcodeUsername;
      }
      return token;
    },
    async session({ session, token }: any) {
      if (token && session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.leetcodeUsername = token.leetcodeUsername;
      }
      return session;
    },
  },

  pages: {
    signIn: '/',
    error: '/',
  },
};

export default authOptions;
