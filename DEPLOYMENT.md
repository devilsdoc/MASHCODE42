# 🚀 Mashcode — Vercel & Production Deployment Guide

This guide walks you through deploying **Mashcode** to [Vercel](https://vercel.com) using a managed PostgreSQL database (e.g., Neon, Supabase, or Vercel Postgres) and Prisma ORM.

---

## 📋 Required Environment Variables

Add these in your **Vercel Project Settings → Environment Variables**:

| Variable Name | Required | Example / Recommended Value | Description |
|---|---|---|---|
| `DATABASE_URL` | **Yes** | `postgresql://user:pass@ep-xyz.us-east-1.aws.neon.tech/neondb?sslmode=require` | Connection string to your hosted PostgreSQL database. |
| `JWT_SECRET` | **Yes** | `mashcode-prod-jwt-secret-98471203948` *(generate a secure random 32+ char string)* | Used to sign and verify secure session tokens. |
| `LEETCODE_API_BASE` | **Yes** | `https://alfa-leetcode-api.onrender.com` | Backend proxy URL for fetching LeetCode profile, contest, and submission data. |
| `PORT` | Optional | `3000` | Port for server execution (handled automatically by Vercel / Cloud Run). |

---

## 🛠️ Step 1: Set Up a Hosted PostgreSQL Database

1. Create a free account at [Neon](https://neon.tech), [Supabase](https://supabase.com), or [Prisma Data Platform](https://www.prisma.io/data-platform).
2. Create a new PostgreSQL database (e.g. named `mashcode_prod`).
3. Copy the pooled connection string (`DATABASE_URL`). Example:
   ```env
   DATABASE_URL="postgresql://username:password@ep-cool-snowflake-12345.us-east-2.aws.neon.tech/mashcode?sslmode=require"
   ```

---

## 📦 Step 2: Push Prisma Schema to Your Database

From your local machine or terminal:
```bash
# 1. Install dependencies
npm install

# 2. Generate Prisma Client
npx prisma generate

# 3. Push schema migrations to production database
DATABASE_URL="<YOUR_HOSTED_DATABASE_URL>" npx prisma db push
```

This creates the tables (`User`, `Class`, `Enrollment`, `LeetCodeCache`) defined in `prisma/schema.prisma`.

---

## 🚀 Step 3: Deploy to Vercel

### Option A: Using the Vercel Dashboard (Recommended)

1. Push your repository to **GitHub**, **GitLab**, or **Bitbucket**.
2. Go to [vercel.com/new](https://vercel.com/new).
3. Import your `mashcode` repository.
4. Under **Environment Variables**, add:
   - `DATABASE_URL`: Your hosted PostgreSQL connection string
   - `JWT_SECRET`: Random 32+ character secret string
   - `LEETCODE_API_BASE`: `https://alfa-leetcode-api.onrender.com`
5. Click **Deploy**. Vercel will build and assign an SSL-secured URL (e.g. `https://mashcode.vercel.app`).

### Option B: Using the Vercel CLI

```bash
# 1. Install Vercel CLI globally
npm i -g vercel

# 2. Login to Vercel
vercel login

# 3. Deploy
vercel --prod
```

When prompted:
- Set up and deploy: **Yes**
- Link to existing project: **No**
- Project name: `mashcode`
- Root directory: `./`

---

## ⚡ Step 4: Verification Checklist Post-Deployment

After deployment finishes:
- [ ] Visit `https://your-domain.vercel.app`
- [ ] Test Instructor flow: Create an instructor account, create a classroom, verify 6-character code generation.
- [ ] Test Student flow: Create a student account, link a LeetCode username (e.g. `neal_wu` or `tourist`), join classroom with code.
- [ ] Test LeetCode synchronization: Verify problems solved counts (Easy/Medium/Hard), contest ratings, recent submissions, and 16-week activity heatmap.
- [ ] Test Caching: Verify that repeated page reloads use the 10-minute cache and response times remain under 50ms.
