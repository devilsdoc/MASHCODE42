# 🚀 Mashcode — Production LeetCode Classroom Dashboard

**Mashcode** is a modern, high-performance web dashboard where instructors can create classes, students can enroll using a unique 6-character code, and instructors can monitor all enrolled students' LeetCode statistics—including total solved, Easy/Medium/Hard breakdown, contest ratings, recent submissions, and activity heatmaps—without navigating to individual profile pages.

---

## 🌟 Key Features

### 1. Instructor Features
- **Classroom Hub**: Create classes with auto-generated 6-character codes (e.g., `ALGO24`).
- **Comprehensive Roster**: View all enrolled students with live metrics:
  - Total solved count with Easy (green), Medium (yellow), and Hard (red) difficulty bars.
  - Contest rating, ranking, and percentile standing.
  - Interactive sorting by solved count, rating, name, or join date.
  - Real-time search across student names, emails, and LeetCode handles.
- **Student Profiler Modal**: Inspect any student's last 5 submissions, programming language tags, acceptance rates, and interactive 16-week activity heatmap.
- **Classroom Analytics**: Aggregate class metrics including total problems solved across the class, class average, top solver, and contest participation rates.
- **Roster Management**: Remove students from classrooms with instant state updates.

### 2. Student Features
- **Classroom Enrollment**: Join any classroom using the teacher's 6-character code.
- **Profile Synchronization**: Link and update LeetCode handles with live format validation.
- **Personal Performance Dashboard**: Full view of solved problems, contest ratings, recent submissions, and activity heatmaps.
- **Enrolled Classrooms**: Manage joined classes and view teacher information.

### 3. Backend & LeetCode Integration
- **Server-Side Proxy**: All LeetCode requests are processed on the backend to avoid CORS restrictions.
- **10-Minute Caching**: In-memory caching with 10-minute TTL to respect LeetCode rate limits and ensure lightning-fast dashboard load times.
- **Manual Sync**: 1-click "Sync LeetCode" button for on-demand cache invalidation.
- **Resilient Fallback**: Graceful fallback generator ensures the UI remains fully responsive even if external public servers experience latency.

---

## 📁 Project Structure

```text
├── prisma/
│   └── schema.prisma                # PostgreSQL Prisma schema (User, Class, Enrollment, LeetCodeCache)
├── src/
│   ├── components/
│   │   ├── AuthModal.tsx            # Mashcode authentication with 1-click Demo Logins
│   │   ├── Navbar.tsx               # Header with Mashcode brand logo, role pill & logout
│   │   ├── StudentDashboard.tsx     # Student workspace, tab navigation & enrolled classes
│   │   ├── StudentStatsCard.tsx     # Reusable LeetCode stats card (difficulty bars, heatmap, submissions)
│   │   └── TeacherDashboard.tsx     # Instructor hub, student roster table, sort/filter, analytics
│   ├── server/
│   │   └── db.ts                    # Database store with bcrypt password hashing
│   ├── services/
│   │   └── leetcode.ts              # LeetCode API service with 10-minute caching & fallback resilience
│   ├── types/
│   │   └── index.ts                 # Shared TypeScript interfaces & types
│   ├── utils/
│   │   ├── classroom-logic.ts       # Pure logic (class codes, filtering, sorting, permissions)
│   │   └── classroom-logic.test.ts  # Native Node 22 unit tests (node:test)
│   ├── App.tsx                      # Root client component with role routing & Mashcode theme
│   ├── index.css                    # Tailwind CSS configuration
│   └── main.tsx                     # React 19 entry point
├── server.ts                        # Full-stack Express server + Vite middlewares + API proxy
├── DEPLOYMENT.md                    # Step-by-step Vercel & Production deployment instructions
├── .env.example                     # Environment variable template
├── index.html                       # HTML entry point with Mashcode metadata
├── package.json                     # Scripts and dependencies
├── tsconfig.json                    # TypeScript compiler configuration
└── vite.config.ts                   # Vite build configuration
```

---

## ⚡ Quick Start (Local Development)

```bash
# 1. Install dependencies
npm install

# 2. Run unit tests
node --test src/utils/classroom-logic.test.ts

# 3. Start development server
npm run dev
```

Open `http://localhost:3000` in your browser.

---

## 🔑 Pre-Seeded Demo Accounts

Instant 1-click sign-in buttons are available on the login page:

| Role | Email | Password | LeetCode Handle |
|---|---|---|---|
| **Instructor** | `teacher@classroom.edu` | `password123` | N/A |
| **Student** | `alex@university.edu` | `password123` | `neal_wu` |
| **Student** | `sarah@university.edu` | `password123` | `lee215` |
| **Student** | `david@university.edu` | `password123` | `tourist` |

Pre-configured Class Code: `ALGO24` (CS 201: Data Structures & Algorithms).

---

## 🌐 Production Deployment (Vercel)

See [`DEPLOYMENT.md`](./DEPLOYMENT.md) for full instructions on deploying to Vercel with PostgreSQL (Neon / Supabase) and Prisma.
