# Dossier — Development Guide

## Project Setup

### Prerequisites

- Node.js 18+ 
- npm 9+
- A Supabase project (free tier works)
- Git

### Clone and Install

```bash
git clone <repository-url>
cd dossier
npm install
```

---

## Environment Variables

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Fill in the values:

| Variable | Source | Required |
|----------|--------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API | Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API | Yes |
| `NEXT_PUBLIC_SITE_URL` | Your production URL | No (auto-detected) |

**Security:**
- `SUPABASE_SERVICE_ROLE_KEY` is server-only — never expose to the client
- Add `.env.local` to `.gitignore` (already done)

---

## Running Locally

### Development Server

```bash
npm run dev
```

Opens at `http://localhost:3000`.

### Production Build

```bash
npm run build
npm start
```

### Quality Checks

```bash
npx tsc --noEmit   # TypeScript check
npx eslint .       # Lint
npm run build      # Production build
```

---

## Database Migrations

### Applying Migrations

Migrations are in `supabase/migrations/`. Apply them in order:

**Option 1: Supabase CLI**

```bash
supabase link --project-ref <your-project-ref>
supabase db push
```

**Option 2: SQL Editor**

Paste each migration file into the Supabase SQL Editor in filename order.

### Creating New Migrations

1. Create a new file with timestamp prefix:

```
supabase/migrations/YYYYMMDDHHMMSS_description.sql
```

2. Write SQL with comments explaining the purpose
3. Test locally before pushing
4. Include rollback steps in comments if needed

### Migration Naming Convention

```
20260730120001_create_departments.sql
20260730120002_create_profiles.sql
20260731130001_add_daily_report_fields.sql
```

Format: `YYYYMMDDHHMMSS_snake_case_description.sql`

---

## Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import repo in Vercel
3. Set environment variables in Vercel dashboard
4. Deploy

Vercel auto-detects Next.js and configures correctly.

### Environment Variables in Production

Set the same variables as `.env.local`:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

`NEXT_PUBLIC_SITE_URL` is optional — Vercel's `NEXT_PUBLIC_VERCEL_URL` is used automatically.

### Supabase Configuration

In the Supabase dashboard, add redirect URLs:

**Authentication → URL Configuration → Redirect URLs:**
- `http://localhost:3000/invite`
- `https://your-domain.com/invite`

---

## Coding Conventions

### TypeScript

- Strict mode enabled
- No `any` unless absolutely necessary
- Explicit return types on exported functions
- Use `interface` for objects, `type` for unions/primitives

### Naming

| Thing | Convention | Example |
|-------|------------|---------|
| Files | kebab-case | `edit-employee-sheet.tsx` |
| Components | PascalCase | `EditEmployeeSheet` |
| Functions | camelCase | `submitDailyReport` |
| Constants | SCREAMING_SNAKE | `REPORT_CONTENT_MAX_LENGTH` |
| Types | PascalCase | `EmployeeListItem` |
| Database | snake_case | `daily_reports`, `author_id` |

### Imports

```typescript
// External libraries first
import { useState } from "react";
import { revalidatePath } from "next/cache";

// Internal absolute imports
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import type { Profile } from "@/types/profile";
```

### Comments

- Explain **why**, not **what**
- Document non-obvious decisions
- Use JSDoc for exported functions with complex params

```typescript
// Good: explains the reason
// generateLink (not inviteUserByEmail) is used deliberately: it always
// returns the invite link regardless of whether SMTP is configured

// Bad: describes obvious code
// Loop through the array
```

---

## Folder Conventions

### Route Files

```
app/(app)/admin/employees/
├── page.tsx          # Route component
├── loading.tsx       # Loading UI (optional)
└── [id]/
    ├── page.tsx      # Dynamic route
    └── loading.tsx
```

### Component Files

```
components/admin/
├── employee-list.tsx        # Main component
├── edit-employee-sheet.tsx  # Related component
└── employee-status-badge.tsx
```

### Shared Logic

```
lib/
├── actions/           # Server Actions
├── supabase/
│   ├── queries/       # Read functions
│   └── server.ts      # Client creation
├── validations/       # Shared validation
├── helpers/           # Pure functions
└── reports/           # Report-specific logic
```

---

## Adding New Pages

### 1. Create Route File

```tsx
// app/(app)/feature/page.tsx
export default async function FeaturePage() {
  const data = await getSomeData();
  
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">
        Feature Title
      </h1>
      <FeatureContent data={data} />
    </div>
  );
}
```

### 2. Add Loading State (Optional)

```tsx
// app/(app)/feature/loading.tsx
export default function FeatureLoading() {
  return <Skeleton className="h-[200px]" />;
}
```

### 3. Add to Navigation

```tsx
// components/layout/nav-config.tsx
{
  label: "New Feature",
  href: "/feature",
  icon: <SomeIcon className="size-4" />,
  roles: ["admin"], // or ["employee", "manager", "admin"]
},
```

### 4. Add Layout Gate (If Role-Specific)

```tsx
// app/(app)/feature/layout.tsx
export default async function FeatureLayout({ children }) {
  const profile = await getCurrentProfile();
  if (profile?.role !== "admin") redirect("/");
  return <>{children}</>;
}
```

---

## Adding New Actions

### 1. Create Action File

```typescript
// lib/actions/feature.ts
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdminUser } from "@/lib/supabase/require-admin"; // if admin-only

export interface FeatureActionResult {
  success: boolean;
  error?: string;
  fieldErrors?: { field?: string };
}

export async function doSomething(input: Input): Promise<FeatureActionResult> {
  // 1. Authorize (if needed)
  await requireAdminUser();
  
  // 2. Validate
  const validation = validateInput(input);
  if (!validation.valid) {
    return { success: false, fieldErrors: validation.fieldErrors };
  }
  
  // 3. Execute
  const supabase = await createClient();
  const { error } = await supabase.from("table").insert(data);
  
  if (error) {
    return { success: false, error: "Failed to do something." };
  }
  
  // 4. Revalidate
  revalidatePath("/affected/route");
  
  // 5. Return
  return { success: true };
}
```

### 2. Add Validation (If Needed)

```typescript
// lib/validations/feature.ts
export interface FeatureInput {
  field: string;
}

export interface FeatureFieldErrors {
  field?: string;
}

export function validateFeatureInput(input: FeatureInput) {
  const fieldErrors: FeatureFieldErrors = {};
  
  if (!input.field.trim()) {
    fieldErrors.field = "Field is required.";
  }
  
  if (Object.keys(fieldErrors).length > 0) {
    return { valid: false, fieldErrors };
  }
  
  return { valid: true, value: { field: input.field.trim() } };
}
```

### 3. Call from Component

```typescript
// In a client component
const handleSubmit = async () => {
  const result = await doSomething(input);
  if (result.success) {
    toast.success("Done!");
  } else {
    toast.error(result.error ?? "Something went wrong.");
  }
};
```

---

## Adding New Queries

### 1. Create Query File

```typescript
// lib/supabase/queries/feature.ts
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { requireAdminUser } from "@/lib/supabase/require-admin"; // if admin-only

export const getFeatureData = cache(async (): Promise<FeatureData[]> => {
  // Authorize if needed
  await requireAdminUser();
  
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from("table")
    .select("columns")
    .order("column", { ascending: true });
    
  if (error) {
    throw new Error("Failed to load feature data.");
  }
  
  return data ?? [];
});
```

### 2. Use React's `cache()`

- Wrap queries in `cache()` to deduplicate within a request
- Same query called by layout and page only executes once

### 3. Call from Page

```typescript
// In a server component
export default async function Page() {
  const data = await getFeatureData();
  return <Component data={data} />;
}
```

---

## Adding Migrations

### 1. Create Migration File

```sql
-- supabase/migrations/20260901120000_add_feature.sql

-- Clear explanation of what this migration does and why
-- Reference related files or migrations if applicable

create table public.feature (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

comment on table public.feature is
  'Description of the table purpose.';

-- Enable RLS
alter table public.feature enable row level security;

-- Policies
create policy feature_select_all on public.feature for select
  to authenticated using (true);
```

### 2. Apply Migration

```bash
# Via CLI
supabase db push

# Or paste into Supabase SQL Editor
```

### 3. Update Types

If you're using generated types:

```bash
supabase gen types typescript --local > lib/database.types.ts
```

---

## Testing

### Current State

No automated tests exist. Manual QA is required.

### Recommended Testing

```bash
# Future: Add Vitest
npm install -D vitest @testing-library/react

# Run tests
npm test
```

### What to Test

1. **Validation functions** — Pure functions, easy to test
2. **Status computation** — `getSubmissionStatus`, `computeReportStats`
3. **Server Actions** — Mock Supabase, test business logic
4. **E2E flows** — Playwright for critical paths

---

## Debugging

### Server Components

- Use `console.log()` — output appears in terminal
- Check Supabase dashboard for query logs
- Enable Postgres statement logging if needed

### Client Components

- Browser dev tools
- React DevTools for component state
- Network tab for API calls

### RLS Issues

1. Check user's `role` in `profiles`
2. Verify `department_id` matches expected
3. Test policy directly in SQL Editor:

```sql
set request.jwt.claim.sub = '<user-id>';
select * from daily_reports;
```

### Auth Issues

1. Check cookies in browser
2. Verify redirect URLs in Supabase dashboard
3. Check `getUser()` returns a user
4. Look for expired tokens

---

## Common Tasks

### Add a New Role

1. Update `profiles_role_check` constraint
2. Add to `UserRole` type in `types/profile.ts`
3. Create RLS policies for the role
4. Add nav items with the role
5. Document in `PERMISSIONS.md`

### Add a New Field to Reports

1. Create migration adding column
2. Update `ReportFieldDefinition` in `lib/reports/fields.ts`
3. Update `DailyReport` type
4. Update validation in `lib/validations/report.ts`
5. Update form and display components

### Change the Report Deadline

Admins can do this in `/admin/settings`. To change the default:

1. Update `DEFAULT_REPORT_DEADLINE_HOUR_UTC` in `lib/reports/submission-status.ts`
2. Update the default in the migration if not yet applied

### Bootstrap First Admin

See README.md:

1. Create user in Supabase Auth dashboard
2. Run: `UPDATE profiles SET role = 'admin' WHERE id = '<user-id>'`
