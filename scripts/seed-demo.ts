#!/usr/bin/env npx tsx
/**
 * Inoma Hub Demo Data Seeder
 *
 * Creates a complete demo organization with departments, users, invitations,
 * and realistic report history. Idempotent - safe to run multiple times.
 *
 * Usage:
 *   npm run seed-demo
 *   # or directly:
 *   npx tsx scripts/seed-demo.ts
 *
 * Options:
 *   --reset    Clear all demo data before seeding (DESTRUCTIVE)
 *   --reports  Only seed reports for existing users (skip user creation)
 *
 * Environment Variables Required:
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Demo Credentials (all use password: demo123!):
 *   admin@demo.inoma.local         - Demo Admin
 *   eng.manager@demo.inoma.local   - Sarah Chen (Engineering Manager)
 *   design.manager@demo.inoma.local - Marcus Johnson (Design Manager)
 *   alice@demo.inoma.local         - Alice Rivera (Engineering)
 *   bob@demo.inoma.local           - Bob Patel (Engineering)
 *   carol@demo.inoma.local         - Carol Williams (Design)
 *   dave@demo.inoma.local          - Dave Kim (Sales)
 *   eva@demo.inoma.local           - Eva Martinez (Customer Support)
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Error: Missing environment variables");
  console.error("Required: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Demo password for all users
const DEMO_PASSWORD = "demo123!";

// Demo domain - using .local to prevent accidental real emails
const DEMO_DOMAIN = "demo.inoma.local";

interface DemoUser {
  email: string;
  fullName: string;
  role: "admin" | "manager" | "employee";
  department?: string;
  shouldInviteOnly?: boolean; // Create as pending invitation, not confirmed
}

const DEMO_USERS: DemoUser[] = [
  { email: `admin@${DEMO_DOMAIN}`, fullName: "Demo Admin", role: "admin" },
  {
    email: `eng.manager@${DEMO_DOMAIN}`,
    fullName: "Sarah Chen",
    role: "manager",
    department: "Engineering",
  },
  {
    email: `design.manager@${DEMO_DOMAIN}`,
    fullName: "Marcus Johnson",
    role: "manager",
    department: "Design",
  },
  {
    email: `alice@${DEMO_DOMAIN}`,
    fullName: "Alice Rivera",
    role: "employee",
    department: "Engineering",
  },
  {
    email: `bob@${DEMO_DOMAIN}`,
    fullName: "Bob Patel",
    role: "employee",
    department: "Engineering",
  },
  {
    email: `carol@${DEMO_DOMAIN}`,
    fullName: "Carol Williams",
    role: "employee",
    department: "Design",
  },
  {
    email: `dave@${DEMO_DOMAIN}`,
    fullName: "Dave Kim",
    role: "employee",
    department: "Sales",
  },
  {
    email: `eva@${DEMO_DOMAIN}`,
    fullName: "Eva Martinez",
    role: "employee",
    department: "Customer Support",
  },
  // Pending invitation - won't be confirmed
  {
    email: `pending@${DEMO_DOMAIN}`,
    fullName: "Pending Pete",
    role: "employee",
    department: "Sales",
    shouldInviteOnly: true,
  },
];

const DEPARTMENTS = ["Engineering", "Design", "Sales", "Customer Support"];

// Sample report content for realistic data
const ACCOMPLISHMENTS = [
  "Completed code review for authentication module and fixed 3 security issues.",
  "Implemented new dashboard widgets for real-time analytics display.",
  "Refactored database queries, improving page load time by 40%.",
  "Collaborated with design team on new onboarding flow mockups.",
  "Fixed critical bug in payment processing that affected 5% of users.",
  "Wrote comprehensive unit tests for the notification system.",
  "Deployed new feature flag system to production environment.",
  "Conducted technical interview for senior developer position.",
  "Updated API documentation with new endpoint specifications.",
  "Optimized image processing pipeline, reducing storage costs by 25%.",
  "Designed new component library following brand guidelines.",
  "Created wireframes for mobile app redesign project.",
  "Finalized color palette and typography for marketing site.",
  "Reviewed and provided feedback on junior designer's work.",
  "Prepared sales presentation for enterprise client meeting.",
  "Closed deal with new B2B customer worth $50k ARR.",
  "Updated CRM records and followed up with 12 leads.",
  "Resolved 15 customer support tickets with 98% satisfaction.",
  "Created FAQ documentation for common customer questions.",
  "Trained new support team member on ticketing system.",
];

const BLOCKERS = [
  "Waiting on API credentials from third-party vendor.",
  "Need design review before proceeding with implementation.",
  "Blocked on database migration scheduled for tomorrow.",
  "Awaiting legal approval for new terms of service.",
  "Dependency on backend team to complete API changes.",
  null, // No blocker
  null,
  null,
  null,
  null,
];

const TOMORROW_PLANS = [
  "Continue work on the dashboard redesign.",
  "Start implementing the notification system.",
  "Review pull requests and merge approved changes.",
  "Meet with stakeholders to discuss Q3 roadmap.",
  "Focus on bug fixes from the QA backlog.",
  "Prepare demo for Friday's sprint review.",
  "Pair programming session with junior developer.",
  "Write documentation for new API endpoints.",
];

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomTime(baseHour: number, variance: number): string {
  const hour = baseHour + Math.floor(Math.random() * variance);
  const minute = Math.floor(Math.random() * 60);
  return `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}:00`;
}

async function ensureDepartments(
  client: SupabaseClient
): Promise<Map<string, string>> {
  console.log("\n📁 Ensuring departments exist...");

  const deptMap = new Map<string, string>();

  for (const name of DEPARTMENTS) {
    // Try to find existing
    const { data: existing } = await client
      .from("departments")
      .select("id")
      .eq("name", name)
      .maybeSingle();

    if (existing) {
      deptMap.set(name, existing.id);
      console.log(`   ✓ ${name} (exists)`);
      continue;
    }

    // Create new
    const { data: created, error } = await client
      .from("departments")
      .insert({ name })
      .select("id")
      .single();

    if (error) {
      console.error(`   ✗ Failed to create ${name}:`, error.message);
      continue;
    }

    deptMap.set(name, created.id);
    console.log(`   + ${name} (created)`);
  }

  return deptMap;
}

async function createDemoUser(
  client: SupabaseClient,
  user: DemoUser,
  deptMap: Map<string, string>
): Promise<string | null> {
  // Check if user already exists
  const { data: existingUsers } = await client.auth.admin.listUsers();
  const existing = existingUsers?.users.find((u) => u.email === user.email);

  if (existing) {
    console.log(`   ✓ ${user.email} (exists)`);
    return existing.id;
  }

  // Create user
  const { data: authData, error: authError } =
    await client.auth.admin.createUser({
      email: user.email,
      password: DEMO_PASSWORD,
      email_confirm: !user.shouldInviteOnly,
      user_metadata: { full_name: user.fullName },
    });

  if (authError) {
    console.error(`   ✗ Failed to create ${user.email}:`, authError.message);
    return null;
  }

  // Wait for trigger to create profile
  await new Promise((resolve) => setTimeout(resolve, 300));

  // Update profile with role and department
  const departmentId = user.department ? deptMap.get(user.department) : null;

  const { error: profileError } = await client
    .from("profiles")
    .update({
      role: user.role,
      department_id: departmentId,
      full_name: user.fullName,
    })
    .eq("id", authData.user.id);

  if (profileError) {
    console.error(
      `   ⚠ Created ${user.email} but profile update failed:`,
      profileError.message
    );
  }

  console.log(
    `   + ${user.email} (${user.role}${user.shouldInviteOnly ? ", pending" : ""})`
  );
  return authData.user.id;
}

async function assignDepartmentManagers(
  client: SupabaseClient,
  deptMap: Map<string, string>
) {
  console.log("\n👥 Assigning department managers...");

  const managerAssignments: Record<string, string> = {
    Engineering: `eng.manager@${DEMO_DOMAIN}`,
    Design: `design.manager@${DEMO_DOMAIN}`,
  };

  for (const [deptName, managerEmail] of Object.entries(managerAssignments)) {
    const deptId = deptMap.get(deptName);
    if (!deptId) continue;

    // Find manager's profile
    const { data: profile } = await client
      .from("profiles")
      .select("id")
      .eq("email", managerEmail)
      .maybeSingle();

    if (!profile) {
      console.log(`   ⚠ Manager ${managerEmail} not found`);
      continue;
    }

    // Update department
    const { error } = await client
      .from("departments")
      .update({ manager_id: profile.id })
      .eq("id", deptId);

    if (error) {
      console.error(`   ✗ Failed to assign manager to ${deptName}:`, error.message);
      continue;
    }

    console.log(`   ✓ ${deptName} → ${managerEmail}`);
  }
}

async function seedReportsForUser(
  client: SupabaseClient,
  userId: string,
  email: string,
  daysBack: number = 21
) {
  let created = 0;
  let skipped = 0;

  for (let d = 0; d < daysBack; d++) {
    const date = new Date();
    date.setDate(date.getDate() - d);

    // Skip weekends
    const dayOfWeek = date.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) continue;

    // ~15% chance to skip (simulate missed reports)
    if (Math.random() < 0.15 && d > 0) continue;

    const reportDate = date.toISOString().split("T")[0];

    // Check if report exists
    const { data: existing } = await client
      .from("daily_reports")
      .select("id")
      .eq("author_id", userId)
      .eq("report_date", reportDate)
      .maybeSingle();

    if (existing) {
      skipped++;
      continue;
    }

    // Generate submission time (business hours with some late submissions)
    const isLate = Math.random() < 0.2;
    const submittedAt = `${reportDate}T${randomTime(isLate ? 18 : 9, isLate ? 4 : 8)}Z`;

    const { error } = await client.from("daily_reports").insert({
      author_id: userId,
      report_date: reportDate,
      content: randomItem(ACCOMPLISHMENTS),
      blockers: randomItem(BLOCKERS),
      additional_notes: Math.random() < 0.3 ? randomItem(TOMORROW_PLANS) : null,
      submitted_at: submittedAt,
    });

    if (error) {
      console.error(`   ✗ Failed to create report for ${email} on ${reportDate}`);
      continue;
    }

    created++;
  }

  return { created, skipped };
}

async function seedReports(client: SupabaseClient) {
  console.log("\n📝 Seeding report history...");

  // Get all confirmed demo users (not pending)
  const { data: profiles } = await client
    .from("profiles")
    .select("id, email")
    .like("email", `%@${DEMO_DOMAIN}`)
    .neq("email", `pending@${DEMO_DOMAIN}`);

  if (!profiles || profiles.length === 0) {
    console.log("   No demo users found. Run without --reports flag first.");
    return;
  }

  let totalCreated = 0;
  let totalSkipped = 0;

  for (const profile of profiles) {
    const { created, skipped } = await seedReportsForUser(
      client,
      profile.id,
      profile.email
    );
    totalCreated += created;
    totalSkipped += skipped;
    console.log(`   ${profile.email}: ${created} created, ${skipped} skipped`);
  }

  console.log(`\n   Total: ${totalCreated} reports created, ${totalSkipped} already existed`);
}

async function resetDemoData(client: SupabaseClient) {
  console.log("\n🗑️  Resetting demo data...");
  console.log("   WARNING: This will delete all demo users and their reports!\n");

  // Find all demo users
  const { data: users } = await client.auth.admin.listUsers();
  const demoUsers = users?.users.filter((u) =>
    u.email?.endsWith(`@${DEMO_DOMAIN}`)
  );

  if (!demoUsers || demoUsers.length === 0) {
    console.log("   No demo users to delete.");
    return;
  }

  for (const user of demoUsers) {
    // Delete user (cascades to profile and reports)
    const { error } = await client.auth.admin.deleteUser(user.id);
    if (error) {
      console.error(`   ✗ Failed to delete ${user.email}:`, error.message);
      continue;
    }
    console.log(`   - Deleted ${user.email}`);
  }

  // Reset department managers for demo departments
  await client
    .from("departments")
    .update({ manager_id: null })
    .in("name", DEPARTMENTS);

  console.log("   ✓ Demo data reset complete");
}

async function printSummary() {
  console.log("\n" + "=".repeat(60));
  console.log("DEMO ENVIRONMENT READY");
  console.log("=".repeat(60));
  console.log(`
Demo Credentials (all use password: ${DEMO_PASSWORD})

Admin:
  admin@${DEMO_DOMAIN}

Managers:
  eng.manager@${DEMO_DOMAIN}    - Engineering
  design.manager@${DEMO_DOMAIN} - Design

Employees:
  alice@${DEMO_DOMAIN}  - Engineering
  bob@${DEMO_DOMAIN}    - Engineering
  carol@${DEMO_DOMAIN}  - Design
  dave@${DEMO_DOMAIN}   - Sales
  eva@${DEMO_DOMAIN}    - Customer Support

Pending Invitation:
  pending@${DEMO_DOMAIN} - Sales (not yet confirmed)

Departments: Engineering, Design, Sales, Customer Support
Reports: ~3 weeks of history with realistic patterns

Next Steps:
1. Open your Inoma Hub URL
2. Sign in as admin@${DEMO_DOMAIN} with password: ${DEMO_PASSWORD}
3. Explore the dashboard and test all features

For details, see: docs/DEMO_SETUP.md
`);
}

async function main() {
  const args = process.argv.slice(2);
  const shouldReset = args.includes("--reset");
  const reportsOnly = args.includes("--reports");

  console.log("\n🌱 Inoma Hub Demo Seeder\n");

  if (shouldReset) {
    await resetDemoData(supabase);
    if (args.length === 1) {
      console.log("\nReset complete. Run again without --reset to seed fresh data.");
      return;
    }
  }

  if (!reportsOnly) {
    // Ensure departments exist
    const deptMap = await ensureDepartments(supabase);

    // Create users
    console.log("\n👤 Creating demo users...");
    for (const user of DEMO_USERS) {
      await createDemoUser(supabase, user, deptMap);
    }

    // Assign managers to departments
    await assignDepartmentManagers(supabase, deptMap);
  }

  // Seed reports
  await seedReports(supabase);

  // Print summary
  await printSummary();
}

main().catch((error) => {
  console.error("\nUnexpected error:", error);
  process.exit(1);
});
