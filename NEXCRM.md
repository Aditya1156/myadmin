# NEXCRM — AI Agent Execution Specification
### Version: 1.0.0 | TheNextURL Internal System
### Classification: Production-Ready Build Spec

---

## ⚠️ AGENT INSTRUCTIONS — READ FIRST

You are a senior full-stack engineer executing a complete production build.

**Rules you MUST follow:**
- Never write placeholder comments like `// TODO`, `// add logic here`, `// implement this`
- Every file must be 100% complete and immediately runnable
- TypeScript strict mode — zero `any` types allowed
- Every async operation must have proper error handling
- Every list page must have loading skeleton + empty state
- Every mutation must trigger a toast notification (use `sonner`)
- All forms must have Zod validation + React Hook Form
- API responses must follow the standard envelope: `{ success, data, error, meta }`
- All monetary values display as Indian Rupees (₹) with `toLocaleString('en-IN')`
- All dates display in IST timezone
- Mobile-first responsive design on every page

**Build order — strictly follow this sequence:**
1. Project scaffold + dependencies
2. Environment config
3. Prisma schema + migrations + seed
4. Lib utilities
5. Auth middleware + role guards
6. API routes (all of them)
7. Layout + navigation components
8. Dashboard page
9. Cities + Areas pages
10. Businesses pages (list, detail, new)
11. Follow-ups page
12. Analytics page
13. Team page (admin only)
14. Settings page
15. README.md

Do not skip steps. Do not summarize steps. Write every file in full.

---

## 1. PROJECT IDENTITY

| Key | Value |
|---|---|
| **App Name** | NexCRM |
| **Company** | TheNextURL |
| **Purpose** | Sales territory tracking + CRM for field sales agents pitching digital services to local businesses |
| **Primary Market** | Karnataka, India (Tier-2 and Tier-3 cities) |
| **Services Sold** | Websites, Google Business Profile (GBP), ERP, Social Media, SEO |
| **Currency** | Indian Rupee (₹) |
| **Timezone** | Asia/Kolkata (IST) |
| **Language** | English UI, Indian number formatting |

---

## 2. TECH STACK

### Core
```
Framework:     Next.js 14 (App Router, TypeScript strict)
Styling:       Tailwind CSS v3 + Shadcn UI (New York style, zinc base)
ORM:           Prisma 5.x
Database:      PostgreSQL (Supabase hosted)
Auth:          Clerk (with organizations disabled)
State:         Zustand
Forms:         React Hook Form v7 + Zod v3
Charts:        Recharts v2
Tables:        TanStack Table v8
Notifications: Sonner (toast)
HTTP Client:   Native fetch (no axios)
Date:          date-fns with IST locale
Icons:         Lucide React
```

### Additional Libraries
```
@tanstack/react-table
@supabase/supabase-js
date-fns
date-fns-tz
recharts
sonner
zustand
xlsx  (for Excel export)
papaparse  (for CSV import)
```

### Dev Dependencies
```
@types/node
@types/react
@types/react-dom
eslint
eslint-config-next
prettier
prisma
typescript
```

---

## 3. ENVIRONMENT VARIABLES

Create `.env.local` (and `.env.example` without values):

```bash
# Database
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."  # For Supabase direct connection

# Clerk Auth
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=""
CLERK_SECRET_KEY=""
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/onboarding

# App
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXT_PUBLIC_APP_NAME="NexCRM"
```

---

## 4. PRISMA SCHEMA

File: `prisma/schema.prisma`

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

// ─── ENUMS ────────────────────────────────────────────────────

enum Role {
  ADMIN
  MANAGER
  SALES
}

enum BusinessCategory {
  SALON
  GYM
  HOTEL
  CLINIC
  RESTAURANT
  SCHOOL
  COLLEGE
  RETAIL
  PHARMACY
  AUTOMOBILE
  REAL_ESTATE
  COACHING
  OTHER
}

enum ServiceType {
  WEBSITE
  GBP
  ERP
  SOCIAL_MEDIA
  SEO
  LOGO_BRANDING
}

enum Priority {
  HIGH
  MEDIUM
  LOW
}

enum BusinessStatus {
  NOT_VISITED
  VISITED
  INTERESTED
  NEGOTIATION
  CLOSED_WON
  CLOSED_LOST
  FOLLOW_UP
}

enum VisitType {
  CALL
  OFFLINE
  WHATSAPP
}

enum ActivityType {
  CALL
  VISIT
  FOLLOW_UP
  WHATSAPP
  EMAIL
  DEMO
}

enum ActivityOutcome {
  POSITIVE
  NEGATIVE
  NEUTRAL
  NO_RESPONSE
  CALLBACK_REQUESTED
}

enum FailureReason {
  PRICE_ISSUE
  TRUST_ISSUE
  ALREADY_HAS_SERVICE
  NOT_DECISION_MAKER
  NOT_INTERESTED
  BAD_TIMING
  WENT_TO_COMPETITOR
  NO_BUDGET
  OTHER
}

enum PaymentStatus {
  PENDING
  PARTIAL
  PAID
  REFUNDED
}

// ─── MODELS ───────────────────────────────────────────────────

model User {
  id         String   @id @default(cuid())
  clerkId    String   @unique
  name       String
  email      String   @unique
  phone      String?
  role       Role     @default(SALES)
  isActive   Boolean  @default(true)
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  assignedCities   City[]       @relation("AssignedSalesRep")
  businesses       Business[]   @relation("CreatedByUser")
  activities       Activity[]
  deals            Deal[]

  @@index([clerkId])
  @@index([role])
}

model City {
  id           String   @id @default(cuid())
  name         String
  state        String   @default("Karnataka")
  totalShops   Int      @default(0)
  notes        String?
  isActive     Boolean  @default(true)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  assignedTo   User?   @relation("AssignedSalesRep", fields: [assignedToId], references: [id])
  assignedToId String?

  areas        Area[]
  businesses   Business[]

  @@unique([name, state])
  @@index([state])
}

model Area {
  id        String   @id @default(cuid())
  name      String
  cityId    String
  createdAt DateTime @default(now())

  city       City       @relation(fields: [cityId], references: [id], onDelete: Cascade)
  businesses Business[]

  @@unique([name, cityId])
  @@index([cityId])
}

model Business {
  id              String           @id @default(cuid())
  businessName    String
  ownerName       String
  phone           String
  alternatePhone  String?
  category        BusinessCategory
  address         String?
  googleMapsLink  String?
  hasWebsite      Boolean          @default(false)
  existingWebsite String?
  hasGBP          Boolean          @default(false)
  services        ServiceType[]
  priority        Priority         @default(MEDIUM)
  status          BusinessStatus   @default(NOT_VISITED)
  visitType       VisitType?
  followUpDate    DateTime?
  failureReason   FailureReason?
  estimatedValue  Float?
  notes           String?
  mistakeNotes    String?
  isActive        Boolean          @default(true)
  createdAt       DateTime         @default(now())
  updatedAt       DateTime         @updatedAt

  city         City      @relation(fields: [cityId], references: [id])
  cityId       String
  area         Area?     @relation(fields: [areaId], references: [id])
  areaId       String?
  createdBy    User      @relation("CreatedByUser", fields: [createdById], references: [id])
  createdById  String

  activities   Activity[]
  deals        Deal[]

  @@index([cityId])
  @@index([areaId])
  @@index([status])
  @@index([priority])
  @@index([followUpDate])
  @@index([createdById])
  @@index([category])
}

model Activity {
  id              String          @id @default(cuid())
  type            ActivityType
  outcome         ActivityOutcome
  remark          String
  nextFollowUpDate DateTime?
  createdAt       DateTime        @default(now())

  business    Business @relation(fields: [businessId], references: [id], onDelete: Cascade)
  businessId  String
  user        User     @relation(fields: [userId], references: [id])
  userId      String

  @@index([businessId])
  @@index([userId])
  @@index([createdAt])
}

model Deal {
  id            String        @id @default(cuid())
  service       ServiceType
  amount        Float
  paymentStatus PaymentStatus @default(PENDING)
  paidAmount    Float         @default(0)
  signedDate    DateTime      @default(now())
  deliveryDate  DateTime?
  invoiceNumber String?
  notes         String?
  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt

  business    Business @relation(fields: [businessId], references: [id], onDelete: Cascade)
  businessId  String
  user        User     @relation(fields: [userId], references: [id])
  userId      String

  @@index([businessId])
  @@index([userId])
  @@index([paymentStatus])
  @@index([signedDate])
}
```

---

## 5. PRISMA SEED

File: `prisma/seed.ts`

Seed data must include:
- 1 Admin user: `{ name: "Stark", email: "stark@thenexturl.com", role: ADMIN }`
- 1 Manager: `{ name: "Shreya Sawarn", email: "shreya@thenexturl.com", role: MANAGER }`
- 1 Sales user: `{ name: "Sales 1", email: "sales1@thenexturl.com", role: SALES }`
- 4 Cities: Shivamogga, Mysuru, Hubballi, Mangaluru (all Karnataka)
- 2 Areas per city (e.g., Shivamogga: Kuvempu Nagar, Shivappa Nayaka Circle)
- 8 sample businesses across cities with varied statuses, categories, and services
- 3 sample activities and 2 sample deals

---

## 6. LIB FILES

### `lib/prisma.ts`
Singleton Prisma client with connection handling for serverless (Vercel) environment.

### `lib/utils.ts`
Must export:
```typescript
cn(...inputs: ClassValue[]): string  // clsx + tailwind-merge
formatCurrency(amount: number): string  // ₹1,23,456 Indian format
formatDate(date: Date | string, format?: string): string  // IST timezone
formatRelativeTime(date: Date | string): string  // "2 hours ago"
getStatusColor(status: BusinessStatus): string  // returns Tailwind badge class
getPriorityColor(priority: Priority): string
getOutcomeColor(outcome: ActivityOutcome): string
generateWhatsAppLink(phone: string, message: string): string
truncateText(text: string, length: number): string
```

### `lib/validations.ts`
Zod schemas for:
```typescript
CreateCitySchema
UpdateCitySchema
CreateAreaSchema
CreateBusinessSchema
UpdateBusinessSchema
CreateActivitySchema
CreateDealSchema
UpdateDealSchema
BulkImportBusinessSchema  // for CSV rows
PaginationSchema  // { page, limit, sortBy, sortOrder }
BusinessFiltersSchema  // { cityId, areaId, category, status, priority, services, search }
```

### `lib/constants.ts`
Mirror all Prisma enums as typed const arrays with labels for dropdowns:
```typescript
BUSINESS_CATEGORIES: { value: BusinessCategory, label: string, icon: string }[]
SERVICE_TYPES: { value: ServiceType, label: string, color: string }[]
BUSINESS_STATUSES: { value: BusinessStatus, label: string, color: string, icon: string }[]
PRIORITY_OPTIONS: { value: Priority, label: string, color: string }[]
ACTIVITY_TYPES: { value: ActivityType, label: string }[]
ACTIVITY_OUTCOMES: { value: ActivityOutcome, label: string, color: string }[]
FAILURE_REASONS: { value: FailureReason, label: string }[]
VISIT_TYPES: { value: VisitType, label: string }[]
WHATSAPP_TEMPLATES: { id: string, label: string, message: string }[]
KARNATAKA_CITIES: string[]  // top 20 cities
```

### `lib/auth.ts`
```typescript
getCurrentUser(): Promise<User | null>
requireAuth(): Promise<User>
requireRole(roles: Role[]): Promise<User>
isAdmin(user: User): boolean
isManager(user: User): boolean
```

### `lib/api-response.ts`
```typescript
interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
  meta?: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

successResponse<T>(data: T, message?: string, meta?: ApiMeta): Response
errorResponse(error: string, status?: number): Response
paginatedResponse<T>(data: T[], total: number, page: number, limit: number): Response
```

---

## 7. MIDDLEWARE

File: `middleware.ts` (root)

```typescript
// Protect all routes except: /, /sign-in, /sign-up, /api/webhooks
// Use Clerk's authMiddleware
// After auth, sync user to DB if not exists (upsert by clerkId)
// Add user role to request headers for server components
```

---

## 8. API ROUTES

All routes in `/app/api/`. Every route:
- Uses `requireAuth()` at the top
- Validates request body/params with Zod
- Wraps DB operations in try/catch
- Returns standard `ApiResponse` envelope

### Cities API
```
GET    /api/cities                  List all with area count + business count
POST   /api/cities                  Create (ADMIN/MANAGER only)
GET    /api/cities/[id]             Single city with areas, business summary
PUT    /api/cities/[id]             Update (ADMIN/MANAGER only)
DELETE /api/cities/[id]             Soft delete (ADMIN only)
GET    /api/cities/[id]/stats       City performance stats (conversion, revenue, etc.)
```

### Areas API
```
GET    /api/areas?cityId=           List areas for a city
POST   /api/areas                   Create area
PUT    /api/areas/[id]              Update area
DELETE /api/areas/[id]              Delete area (only if no businesses)
```

### Businesses API
```
GET    /api/businesses              Paginated list with full filter support
POST   /api/businesses              Create business
GET    /api/businesses/[id]         Full detail with activities + deals
PUT    /api/businesses/[id]         Update business
DELETE /api/businesses/[id]         Soft delete (ADMIN only)
PATCH  /api/businesses/[id]/status  Quick status update only
POST   /api/businesses/import       Bulk CSV import (parse + validate + insert)
GET    /api/businesses/export       Export filtered results as CSV data
```

**Business list query params:**
```
page, limit, sortBy, sortOrder
cityId, areaId, category, status, priority
services (comma-separated)
search (businessName, ownerName, phone)
createdById (filter by sales rep — ADMIN/MANAGER only)
followUpOverdue (boolean)
```

### Activities API
```
GET    /api/activities?businessId=  List activities for a business
POST   /api/activities              Log new activity
        → Side effect: if nextFollowUpDate, update business.followUpDate
        → Side effect: if outcome=POSITIVE and status=NOT_VISITED, set status=VISITED
DELETE /api/activities/[id]         Delete (own only, within 1 hour)
```

### Deals API
```
GET    /api/deals?businessId=       List deals for a business
POST   /api/deals                   Create deal
        → Side effect: if deal created, ensure business status = CLOSED_WON
PUT    /api/deals/[id]              Update deal
DELETE /api/deals/[id]              Delete deal (ADMIN only)
GET    /api/deals/summary           Revenue summary for current month
```

### Follow-ups API
```
GET    /api/followups               Returns grouped followups
        Query: type = 'today' | 'overdue' | 'upcoming' | 'all'
        Includes: business info, last activity, city, area
```

### Analytics API
```
GET    /api/analytics/overview      Main KPI metrics
        Query: from, to (ISO dates), userId (optional, for filtering)
        Returns: {
          totalBusinesses, totalVisits, totalCalls,
          totalDeals, totalRevenue, avgDealSize,
          conversionRate, activeFollowUps,
          newThisMonth, wonThisMonth
        }

GET    /api/analytics/cities        City-wise performance breakdown
        Returns: array of { city, businesses, visited, interested, won, revenue, conversionRate }

GET    /api/analytics/categories    Category performance
        Returns: array of { category, count, won, conversionRate }

GET    /api/analytics/services      Service type breakdown
        Returns: array of { service, count, revenue }

GET    /api/analytics/trends        Daily activity trend
        Query: from, to
        Returns: array of { date, calls, visits, deals, revenue }

GET    /api/analytics/failures      Failure reason analysis
        Returns: array of { reason, count, percentage }

GET    /api/analytics/team          Team performance (ADMIN/MANAGER only)
        Returns: array of { user, businesses, activities, deals, revenue }
```

### Users API (ADMIN only)
```
GET    /api/users                   List all users with stats
POST   /api/users/sync              Sync Clerk user to DB (called from webhook)
PUT    /api/users/[id]              Update role / assign cities
```

---

## 9. LAYOUT & NAVIGATION

### Root Layout (`app/layout.tsx`)
- ClerkProvider wrapper
- Sonner Toaster
- ThemeProvider (next-themes, defaultTheme: system)

### Dashboard Layout (`app/(dashboard)/layout.tsx`)
- Protected with `requireAuth()`
- Sidebar (collapsible on mobile, persistent on desktop)
- Top header bar

### Sidebar Component (`components/shared/sidebar.tsx`)

Navigation items:
```
Dashboard        /dashboard         LayoutDashboard icon
Cities           /cities            MapPin icon
Businesses       /businesses        Building2 icon
Follow-ups       /followups         Bell icon    ← show overdue badge count
Analytics        /analytics         BarChart3 icon
Team             /team              Users icon   ← ADMIN/MANAGER only
Settings         /settings          Settings icon
```

Sidebar bottom: Current user avatar, name, role badge, sign-out button.

### Top Header (`components/shared/header.tsx`)
- Breadcrumb (dynamic based on route)
- Global search (searches businesses by name/phone)
- Notification bell (follow-up count)
- Dark mode toggle
- User menu (profile, settings, sign-out)

---

## 10. SHARED COMPONENTS

### `components/shared/data-table.tsx`
Full-featured TanStack Table wrapper:
- Column visibility toggle
- Sort by clicking header
- Pagination controls
- Row selection (for bulk actions)
- Search input prop
- Filter slot prop
- Loading skeleton state
- Empty state with custom message + CTA

### `components/shared/stat-card.tsx`
```typescript
interface StatCardProps {
  title: string
  value: string | number
  change?: number  // percentage change vs last period
  changeLabel?: string
  icon: LucideIcon
  color?: 'blue' | 'green' | 'orange' | 'red' | 'purple'
  loading?: boolean
}
```

### `components/shared/status-badge.tsx`
Color-coded badge for BusinessStatus, Priority, ActivityOutcome, PaymentStatus

### `components/shared/page-header.tsx`
```typescript
interface PageHeaderProps {
  title: string
  description?: string
  action?: ReactNode  // primary CTA button slot
  breadcrumb?: { label: string, href?: string }[]
}
```

### `components/shared/empty-state.tsx`
```typescript
interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  action?: { label: string, href?: string, onClick?: () => void }
}
```

### `components/shared/loading-skeleton.tsx`
Pre-built skeletons: `TableSkeleton`, `CardSkeleton`, `StatCardSkeleton`, `DetailSkeleton`

---

## 11. DASHBOARD PAGE (`/dashboard`)

### Layout: 3-section grid

**Section 1 — KPI Row (6 stat cards)**
```
Total Cities | Total Businesses | Calls Today | Visits Today | Deals This Month | Revenue This Month
```
Each card shows value + % change vs last month + icon.

**Section 2 — Two-column**

Left (60%): "Recent Activity Feed"
- Last 15 activities across all businesses
- Each item: avatar of sales rep, action text, business name, relative time
- Link to business on click
- Infinite scroll or "view all" button

Right (40%): "Today's Follow-ups"
- List of businesses due for follow-up today
- Each: business name, owner, phone, city, quick WhatsApp link
- "Log Activity" button inline
- If none: empty state with celebration icon

**Section 3 — Three-column charts**

Left (50%): Bar chart — City-wise Visited vs Won (last 30 days)

Middle (25%): Donut chart — Conversion by status breakdown

Right (25%): "Top Performers" leaderboard
- Ranked by deals closed this month
- Shows avatar, name, deal count, revenue

**Section 4 — Bottom row**

Left: Line chart — Daily activity trend (calls + visits, last 14 days)

Right: "Services Demand" — Horizontal bar showing which services are most requested

---

## 12. CITIES PAGE (`/cities`)

### List Page
- Grid of city cards (3 columns desktop, 1 mobile)
- Each card shows: city name, state, total businesses, visited count, conversion %, assigned sales rep, progress bar
- Add City button (ADMIN/MANAGER)
- Click card → city detail page

### City Detail Page (`/cities/[id]`)

**Top section:** City stats row (total businesses, visited, interested, won, revenue, conversion rate)

**Areas section:**
- List of areas with business count
- Add Area inline (accordion form)
- Edit/delete area

**Businesses table:**
- Filtered to this city
- Same columns as main businesses table
- "Add Business in This City" button (pre-fills city)

---

## 13. BUSINESSES LIST PAGE (`/businesses`)

### Toolbar (above table)
Left: Search input (businessName, ownerName, phone)
Right: Filter button (opens filter drawer) + Add Business button + Export button

### Filter Drawer
Filters: City, Area, Category (multi-select), Status (multi-select), Priority (multi-select), Services (multi-select), Assigned To, Date Range (createdAt), Follow-up Overdue toggle

Show active filter count badge on filter button.

### Table Columns
```
# | Business Name | Owner | Phone | City/Area | Category | Services | Status | Priority | Follow-up | Actions
```

- Business Name: links to detail page, shows hasWebsite + hasGBP icon badges
- Phone: click to call (tel: link) + WhatsApp icon
- Services: badge pills per service
- Status: colored dropdown (click to change inline)
- Follow-up: color-coded (red if overdue, orange if today, gray if future)
- Actions: View | Edit | Log Activity (three dots menu)

**Bulk Actions** (when rows selected): Update Status | Assign To | Delete

### Export Button
Downloads filtered results as Excel (.xlsx) with all columns.

---

## 14. ADD/EDIT BUSINESS FORM (`/businesses/new`, `/businesses/[id]/edit`)

Multi-step form with progress indicator:

**Step 1 — Business Info**
```
Business Name *
Owner Name *
Phone * (Indian mobile validation)
Alternate Phone
Category * (dropdown)
City * (dropdown, loads areas dynamically)
Area (dropdown, depends on city)
Address
Google Maps Link
```

**Step 2 — Digital Presence**
```
Has Existing Website? (toggle)
  → If yes: Website URL field
Has Google Business Profile? (toggle)
Services Required * (multi-select checkboxes with icons)
  WEBSITE | GBP | ERP | SOCIAL_MEDIA | SEO | LOGO_BRANDING
Estimated Deal Value (₹)
Priority (radio: HIGH / MEDIUM / LOW)
```

**Step 3 — Visit Info**
```
Status *
Visit Type (CALL / OFFLINE / WHATSAPP)
Follow-up Date (date picker, min: today)
Notes (textarea)
Mistake Notes (textarea — "what went wrong?", shown only if status = CLOSED_LOST)
Failure Reason (dropdown, shown only if status = CLOSED_LOST)
```

Validation at each step before advancing. Show field-level error messages.

---

## 15. BUSINESS DETAIL PAGE (`/businesses/[id]`)

### Layout: Two-column (70/30)

**Left column — Main content**

*Business Info Card*
- All business details in a clean grid
- Edit button (opens edit modal)
- Quick status change dropdown
- Google Maps link button
- WhatsApp button (generates template message)

*Activity Timeline*
- Chronological list of all activities (newest first)
- Each entry: type icon, outcome badge, remark, sales rep name, date
- "Log Activity" button at top

*Log Activity Form (inline expandable)*
```
Type * | Outcome * | Remark * | Next Follow-up Date
```
On submit: adds to timeline, updates business.followUpDate, shows toast.

*Deals Section*
- Table: Service | Amount | Payment Status | Paid Amount | Signed Date | Actions
- "Add Deal" button opens modal form
- Running total: Total Deals | Total Revenue | Outstanding Amount

**Right column — Sidebar info**

*Contact Quick Actions*
- Call button (tel:)
- WhatsApp button (template selector → generates wa.me link)
- Copy phone button

*Business Metadata*
- Created by, Created at
- Last activity date
- Days since last contact (highlight red if > 14 days)

*WhatsApp Templates Panel*
Pre-built templates with "Open WhatsApp" button:
```
1. Follow-up message
2. Proposal message  
3. Meeting confirmation
4. Thank you after meeting
5. Payment reminder
```
Each template pre-fills business name and owner name.

---

## 16. FOLLOW-UPS PAGE (`/followups`)

### Layout: Tabbed sections

**Tab 1: Today (badge count)**
Businesses with followUpDate = today
Cards showing: Business name, owner, phone, city, category, last activity summary, "Log Activity" button, WhatsApp button

**Tab 2: Overdue (badge count in red)**
Businesses with followUpDate < today and status not CLOSED
Same card format but with red "Overdue" tag and days overdue count

**Tab 3: Upcoming (next 7 days)**
Grouped by date (Tomorrow / Day after / etc.)
Same card format

**Tab 4: No Follow-up Set**
Businesses with status = INTERESTED or NEGOTIATION but no followUpDate set
Prompt to set a follow-up date inline.

### Bulk Action Bar (visible when items exist in Overdue)
"Reschedule All Overdue" button → opens modal to set bulk new follow-up date

---

## 17. ANALYTICS PAGE (`/analytics`)

### Controls Bar
Date range picker (presets: Today, Last 7 days, Last 30 days, This Month, Last Month, Custom)
Sales Rep filter (ADMIN/MANAGER only)
City filter

All charts and KPIs respond to these filters.

### Section 1 — KPI Grid (8 cards)
```
Total Businesses | Calls Made | Offline Visits | Positive Responses
Deals Closed | Total Revenue | Avg Deal Size | Conversion Rate
```
Each shows current period value + change % vs previous period.

### Section 2 — Primary Charts Row

*Left (65%): "Activity Trend" — Line chart*
- X-axis: dates in range
- Y-axis: count
- Two lines: Calls (blue) + Visits (orange)
- Hover tooltip with exact values

*Right (35%): "Status Distribution" — Donut chart*
- One slice per BusinessStatus
- Center shows total businesses
- Legend below with counts

### Section 3 — Secondary Charts Row

*Left (50%): "City Performance" — Horizontal bar chart*
- Each bar: city name
- Stacked: Visited (blue) + Won (green)
- Sorted by won count descending

*Right (50%): "Service Demand" — Bar chart*
- X-axis: service type
- Y-axis: count of businesses requesting it
- Color per service

### Section 4 — Tables Row

*Left: "Category Analysis" table*
Columns: Category | Total | Visited | Won | Conversion % | Avg Deal (₹)

*Right: "Failure Reasons" table*
Columns: Reason | Count | % of Lost Deals
Sorted by count descending. Only shows if closed_lost > 0.

### Section 5 — Revenue Section

*Revenue by Month — Bar chart (last 6 months)*
X: month, Y: ₹ revenue

*Revenue by Service Type — Pie chart*
Shows which services generate most revenue

---

## 18. TEAM PAGE (`/team`) — ADMIN/MANAGER ONLY

Route-level protection: redirect to `/dashboard` if role = SALES.

### Team Overview
Stats: Total team members | Active Sales Reps | Avg Deals per Rep | Top City

### Performance Leaderboard Table
Columns: Rank | Name | Role | Businesses Added | Activities Logged | Deals Closed | Revenue | Conversion %

Rank 1-3 with trophy icons (🥇🥈🥉).

Filter by date range.

Click row → individual performance modal with:
- Their business list (filtered)
- Activity breakdown chart
- City coverage map placeholder

### City Assignment Section (ADMIN only)
Assign sales reps to specific cities. Drag-drop or dropdown assignment.

---

## 19. SETTINGS PAGE (`/settings`)

### Tabs

**Profile**
- Edit name, phone (reads from Clerk, updates DB)

**Appearance**
- Dark/Light/System mode toggle
- Compact/Comfortable table density

**Notifications** (future)
- Toggle: Email for overdue follow-ups
- Toggle: Daily summary email

**Data Management** (ADMIN only)
- Download full database export (CSV)
- Import businesses from CSV (with template download)
- Danger zone: Purge test data

---

## 20. FORM COMPONENTS

### `components/forms/business-form.tsx`
Multi-step form as described in section 14. Uses:
- `useForm` from React Hook Form
- `zodResolver` for validation
- `useState` for current step
- Dynamic city→area dependency via `useWatch`
- `useMutation` pattern (fetch + toast + redirect)

### `components/forms/activity-form.tsx`
Compact inline form for logging activities. Used in:
- Business detail page (expandable)
- Follow-ups page cards

### `components/forms/deal-form.tsx`
Modal form for adding/editing deals.

### `components/forms/city-form.tsx`
Simple form: name, state, totalShops, notes, assignedTo.

---

## 21. CUSTOM HOOKS

```typescript
// Data fetching
useBusinesses(filters: BusinessFilters)  // with pagination + search
useBusiness(id: string)
useActivities(businessId: string)
useDeals(businessId: string)
useCities()
useFollowUps(type: 'today' | 'overdue' | 'upcoming')
useAnalytics(filters: AnalyticsFilters)
useTeam()

// UI helpers
useDebounce<T>(value: T, delay: number): T
useLocalStorage<T>(key: string, defaultValue: T)
useCurrentUser(): User | null
useRole(): Role | null
useIsMobile(): boolean

// Business logic
useWhatsAppTemplates(business: Business): { template: string, url: string }[]
```

All data hooks use `useSWR` or native `useState + useEffect` with:
- Loading state
- Error state
- Refetch function
- Optimistic update helpers

---

## 22. WHATSAPP MESSAGE TEMPLATES

Define in `lib/constants.ts`:

```typescript
const WHATSAPP_TEMPLATES = [
  {
    id: 'follow_up',
    label: 'Follow-up Message',
    message: (name: string, businessName: string) => 
      `Namaste ${name} ji 🙏\n\nThis is [Your Name] from TheNextURL.\n\nJust checking in regarding the digital services we discussed for ${businessName}. Have you had a chance to think about it?\n\nWe'd love to help you get more customers from Google 😊\n\nFeel free to call us anytime: [Your Number]`
  },
  {
    id: 'proposal',
    label: 'Proposal Message',
    message: (name: string, businessName: string) =>
      `Namaste ${name} ji 🙏\n\nThank you for your time today! As promised, here's a quick summary of what we can do for ${businessName}:\n\n✅ Google Business Profile Setup\n✅ Professional Website\n✅ Digital Growth Strategy\n\nInvestment starts from ₹2,999 only.\n\nShall I send you a detailed proposal? 📋`
  },
  {
    id: 'meeting_confirm',
    label: 'Meeting Confirmation',
    message: (name: string, businessName: string) =>
      `Namaste ${name} ji 🙏\n\nJust confirming our meeting tomorrow to discuss digital solutions for ${businessName}.\n\nLooking forward to meeting you! 😊\n\nIf any changes, please let me know.\n\nThank you!`
  },
  {
    id: 'thank_you',
    label: 'Thank You After Meeting',
    message: (name: string, businessName: string) =>
      `Namaste ${name} ji 🙏\n\nThank you so much for your time today! It was a pleasure meeting you.\n\nWe're excited about the opportunity to work with ${businessName} and help you grow digitally.\n\nWe'll send you the detailed proposal within 24 hours.\n\nBest regards,\nTheNextURL Team`
  },
  {
    id: 'payment_reminder',
    label: 'Payment Reminder',
    message: (name: string, businessName: string) =>
      `Namaste ${name} ji 🙏\n\nHope you are doing well! This is a gentle reminder about the pending payment for the digital services we completed for ${businessName}.\n\nPlease let us know if you need any clarification or have any questions.\n\nThank you for your continued trust in us! 🙏`
  }
]
```

---

## 23. CSV IMPORT FORMAT

Template headers for business bulk import:
```
businessName | ownerName | phone | alternatePhone | category | cityName | areaName | address | hasWebsite | hasGBP | services | priority | status | visitType | followUpDate | estimatedValue | notes
```

Import logic:
1. Parse CSV with PapaParse
2. Validate each row with Zod (collect all errors, don't fail fast)
3. Match cityName → City.id (create if not exists)
4. Match areaName → Area.id within city (create if not exists)
5. Insert valid rows in transaction
6. Return: `{ inserted: N, failed: N, errors: [{row, errors}] }`

---

## 24. EXCEL EXPORT FORMAT

When exporting businesses to Excel:
- Sheet name: "Businesses - {date}"
- Columns: All business fields + city name + area name + last activity date + total deals + total revenue
- Auto-fit column widths
- Freeze header row
- Color-code status column (green for won, red for lost, etc.)
- Footer row with totals for numeric columns

Use the `xlsx` package.

---

## 25. ERROR HANDLING PATTERNS

### API Routes
```typescript
try {
  const user = await requireAuth()
  // ... logic
  return successResponse(data)
} catch (error) {
  if (error instanceof ZodError) {
    return errorResponse(error.errors[0].message, 400)
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') return errorResponse('Already exists', 409)
    if (error.code === 'P2025') return errorResponse('Not found', 404)
  }
  console.error('[API Error]', error)
  return errorResponse('Internal server error', 500)
}
```

### Client Components
- All mutations: wrap in try/catch, show `toast.error(errorMessage)` on failure
- All data fetches: show error state UI with retry button
- Network errors: "Something went wrong. Check your connection."

---

## 26. PERFORMANCE REQUIREMENTS

- Dashboard initial load: < 2 seconds
- Business list (25 rows): < 1 second
- All API routes: < 500ms p95
- Implement Prisma select projections (never select * in list queries)
- Use Next.js server components for initial data fetch where possible
- Implement cursor-based pagination for activity feeds
- Index all foreign keys and commonly filtered fields (already in schema)
- Use `React.memo` on heavy table row components
- Debounce search input (300ms)

---

## 27. SECURITY REQUIREMENTS

- All API routes validate auth via Clerk before any DB operation
- Role checks happen server-side, never trust client-side role
- Sales users can only read/write their own businesses (`WHERE createdById = userId`)
- Managers can read all, write all, cannot delete
- Admins have full access including delete
- Never expose raw database IDs in URLs — use cuid() which is already non-sequential
- Sanitize all text inputs (Prisma parameterized queries handle SQL injection)
- Rate limit sensitive endpoints (future: use Upstash Redis)

---

## 28. RESPONSIVE DESIGN BREAKPOINTS

```
Mobile (< 768px):
  - Sidebar collapses to bottom tab bar
  - Dashboard shows 2-column KPI grid
  - Charts stack vertically
  - Business table becomes card list

Tablet (768–1024px):
  - Sidebar shows icons only (collapsed)
  - Dashboard 3-column KPI grid
  - Charts show side by side

Desktop (> 1024px):
  - Full sidebar with labels
  - Full dashboard layout as designed
  - Full table with all columns
```

---

## 29. README.md

Generate a professional README with:
- Project overview + screenshot placeholder
- Tech stack badges
- Prerequisites (Node 18+, PostgreSQL, Clerk account, Supabase account)
- Step-by-step setup instructions
- Environment variables explanation
- Database setup + seed commands
- Development server command
- Build + deploy to Vercel instructions
- Folder structure overview
- Key features list
- Contributing guide
- License (MIT)

---

## 30. FINAL CHECKLIST — AGENT MUST VERIFY

Before declaring the build complete, confirm:

- [ ] `npx prisma generate` runs without errors
- [ ] `npx prisma db push` runs without errors
- [ ] `npx prisma db seed` populates data correctly
- [ ] `npm run dev` starts without TypeScript errors
- [ ] All 8 main pages render without errors
- [ ] All API routes return proper JSON
- [ ] Auth redirect works (unauthenticated → /sign-in)
- [ ] Role guard works (SALES user cannot access /team)
- [ ] Business creation form submits and creates DB record
- [ ] Activity log updates business follow-up date
- [ ] Analytics page shows correct aggregated numbers
- [ ] CSV import processes template file correctly
- [ ] Excel export downloads file with correct data
- [ ] Dark mode toggles correctly
- [ ] Mobile sidebar opens/closes correctly
- [ ] All toast notifications appear on mutations
- [ ] Empty states show on pages with no data
- [ ] Loading skeletons show while data fetches

---

*End of specification. Build NexCRM completely per this document.*
*TheNextURL — Making local brands digital, taking them global.*
