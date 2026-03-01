# NexCRM

**Sales CRM for TheNextURL** — Territory tracking and CRM for field sales agents pitching digital services to local businesses across Karnataka, India.

![Next.js](https://img.shields.io/badge/Next.js-14-black?style=flat-square&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue?style=flat-square&logo=typescript)
![Prisma](https://img.shields.io/badge/Prisma-5-2D3748?style=flat-square&logo=prisma)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-38B2AC?style=flat-square&logo=tailwind-css)

---

## Features

- **Dashboard** — KPI stats, activity feed, follow-up reminders, performance charts
- **City Management** — Track territories, assign sales reps, view city-wise performance
- **Business Tracking** — Full lifecycle CRM from lead to closed deal
- **Activity Logging** — Log calls, visits, WhatsApp messages, demos with outcomes
- **Deal Management** — Track deals, payments, invoices per business
- **Follow-up System** — Today/overdue/upcoming follow-ups with inline activity logging
- **Analytics** — Charts for trends, city performance, service demand, failure analysis
- **Team Management** — Performance leaderboard, city assignments (Admin/Manager)
- **WhatsApp Integration** — Pre-built message templates with one-click send
- **CSV Import/Export** — Bulk import businesses, export filtered data to Excel
- **Role-Based Access** — Admin, Manager, Sales roles with scoped data access
- **Dark Mode** — System/Light/Dark theme toggle
- **Mobile Responsive** — Collapsible sidebar, responsive tables and charts

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router, TypeScript strict) |
| Styling | Tailwind CSS v3 + Shadcn UI (New York) |
| Database | PostgreSQL (Supabase) |
| ORM | Prisma 5.x |
| Auth | Clerk |
| Charts | Recharts |
| Tables | TanStack Table v8 |
| Forms | React Hook Form + Zod |
| State | Zustand |
| Notifications | Sonner |

## Prerequisites

- **Node.js** 18+
- **PostgreSQL** database (Supabase recommended)
- **Clerk** account for authentication
- **npm** or **yarn**

## Setup

### 1. Clone the repository

```bash
git clone <repo-url>
cd nexcrm
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Copy `.env.example` to `.env.local` and fill in your values:

```bash
cp .env.example .env.local
```

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `DIRECT_URL` | Direct connection URL (Supabase) |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk publishable key |
| `CLERK_SECRET_KEY` | Clerk secret key |
| `NEXT_PUBLIC_APP_URL` | App URL (http://localhost:3000 for dev) |

### 4. Set up the database

```bash
npx prisma generate
npx prisma db push
```

### 5. Seed the database (optional)

```bash
npx prisma db seed
```

This creates sample users, cities, areas, businesses, activities, and deals.

### 6. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project Structure

```
src/
├── app/
│   ├── (auth)/           # Sign-in, Sign-up pages
│   ├── (dashboard)/      # Protected dashboard pages
│   │   ├── dashboard/    # Main dashboard
│   │   ├── cities/       # City list + detail
│   │   ├── businesses/   # Business list, detail, new, edit
│   │   ├── followups/    # Follow-up management
│   │   ├── analytics/    # Charts and KPIs
│   │   ├── team/         # Team management (Admin)
│   │   └── settings/     # User settings
│   └── api/              # API routes
│       ├── cities/
│       ├── areas/
│       ├── businesses/
│       ├── activities/
│       ├── deals/
│       ├── followups/
│       ├── analytics/
│       ├── users/
│       └── webhooks/
├── components/
│   ├── ui/               # Shadcn UI components
│   ├── shared/           # Reusable app components
│   └── forms/            # Form components
├── hooks/                # Custom React hooks
├── lib/                  # Utilities, auth, validations
└── stores/               # Zustand stores
```

## Database Schema

Key models: **User**, **City**, **Area**, **Business**, **Activity**, **Deal**

Roles: `ADMIN` | `MANAGER` | `SALES`

Business statuses: `NOT_VISITED` -> `VISITED` -> `INTERESTED` -> `NEGOTIATION` -> `CLOSED_WON` / `CLOSED_LOST`

## Deployment (Vercel)

1. Push to GitHub
2. Import project in Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

```bash
npm run build
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run db:push` | Push Prisma schema to database |
| `npm run db:seed` | Seed the database |
| `npm run db:studio` | Open Prisma Studio |

## License

MIT

---

**TheNextURL** — Making local brands digital, taking them global.
