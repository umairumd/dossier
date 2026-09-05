#!/usr/bin/env npx tsx
/**
 * Dossier Demo Data Seeder
 *
 * Seeds Inoma Digital with departments, RBAC users, junction-table
 * assignments, and report history. Idempotent — safe to run multiple times.
 *
 * Usage:
 *   npm run seed-demo
 *   npx tsx scripts/seed-demo.ts
 *
 * Options:
 *   --reset    Delete @dossier-demo.com users before seeding (DESTRUCTIVE)
 *   --reports  Only seed reports for existing users
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { generateTempPassword } from "../lib/helpers/temp-password";
import { initEnv } from "./lib/load-env";

initEnv(["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]);

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

const DEMO_PASSWORD = "demo123!";
const DEMO_DOMAIN = "dossier-demo.com";
const ORG_SLUG = "inoma-digital";

type DemoRole = "owner" | "admin" | "manager" | "member";

interface DemoUser {
  email: string;
  fullName: string;
  role: DemoRole;
  department?: string;
  supervisorEmail?: string;
  shouldInviteOnly?: boolean;
}

const DEMO_USERS: DemoUser[] = [
  {
    email: `owner@${DEMO_DOMAIN}`,
    fullName: "Alex Morgan",
    role: "owner",
  },
  {
    email: `hr@${DEMO_DOMAIN}`,
    fullName: "Jordan Smith",
    role: "admin",
  },
  {
    email: `eng.lead@${DEMO_DOMAIN}`,
    fullName: "Sarah Chen",
    role: "manager",
    department: "Engineering",
  },
  {
    email: `design.lead@${DEMO_DOMAIN}`,
    fullName: "Marcus Johnson",
    role: "manager",
    department: "Design",
  },
  {
    email: `sales.lead@${DEMO_DOMAIN}`,
    fullName: "David Park",
    role: "manager",
    department: "Sales",
  },
  {
    email: `alice@${DEMO_DOMAIN}`,
    fullName: "Alice Rivera",
    role: "member",
    department: "Engineering",
    supervisorEmail: `eng.lead@${DEMO_DOMAIN}`,
  },
  {
    email: `bob@${DEMO_DOMAIN}`,
    fullName: "Bob Patel",
    role: "member",
    department: "Engineering",
    supervisorEmail: `eng.lead@${DEMO_DOMAIN}`,
  },
  {
    email: `carol@${DEMO_DOMAIN}`,
    fullName: "Carol Williams",
    role: "member",
    department: "Design",
    supervisorEmail: `design.lead@${DEMO_DOMAIN}`,
  },
  {
    email: `dave@${DEMO_DOMAIN}`,
    fullName: "Dave Kim",
    role: "member",
    department: "Sales",
    supervisorEmail: `sales.lead@${DEMO_DOMAIN}`,
  },
  {
    email: `eva@${DEMO_DOMAIN}`,
    fullName: "Eva Martinez",
    role: "member",
    department: "Customer Support",
  },
  {
    email: `invited@${DEMO_DOMAIN}`,
    fullName: "Invited Member",
    role: "member",
    department: "Engineering",
    shouldInviteOnly: true,
  },
];

const DEPARTMENTS = [
  "Engineering",
  "Design",
  "Sales",
  "Customer Support",
  "HR",
];

const MANAGER_BY_DEPARTMENT: Record<string, string> = {
  Engineering: `eng.lead@${DEMO_DOMAIN}`,
  Design: `design.lead@${DEMO_DOMAIN}`,
  Sales: `sales.lead@${DEMO_DOMAIN}`,
};

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
  null,
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

async function listAllAuthUsers(client: SupabaseClient) {
  const users = [];
  let page = 1;

  for (;;) {
    const { data, error } = await client.auth.admin.listUsers({
      page,
      perPage: 200,
    });

    if (error) {
      throw new Error(`Failed to list users: ${error.message}`);
    }

    users.push(...data.users);

    if (data.users.length < 200) {
      break;
    }
    page += 1;
  }

  return users;
}

async function ensureOrganization(client: SupabaseClient): Promise<string> {
  console.log("\n🏢 Looking up organization...");

  const { data, error } = await client
    .from("organizations")
    .select("id, name")
    .eq("slug", ORG_SLUG)
    .maybeSingle();

  if (error || !data) {
    throw new Error(
      `Organization slug '${ORG_SLUG}' not found. Apply RBAC migrations first.`,
    );
  }

  console.log(`   ✓ ${data.name} (${ORG_SLUG})`);
  return data.id;
}

async function ensureDepartments(
  client: SupabaseClient,
  organizationId: string,
): Promise<Map<string, string>> {
  console.log("\n📁 Ensuring departments exist...");

  const deptMap = new Map<string, string>();

  for (const name of DEPARTMENTS) {
    const { data: existing } = await client
      .from("departments")
      .select("id")
      .eq("name", name)
      .maybeSingle();

    if (existing) {
      await client
        .from("departments")
        .update({ organization_id: organizationId })
        .eq("id", existing.id);
      deptMap.set(name, existing.id);
      console.log(`   ✓ ${name} (exists)`);
      continue;
    }

    const { data: created, error } = await client
      .from("departments")
      .insert({ name, organization_id: organizationId })
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
  organizationId: string,
): Promise<string | null> {
  const existingUsers = await listAllAuthUsers(client);
  const existing = existingUsers.find((u) => u.email === user.email);

  if (existing) {
    const { error: profileError } = await client
      .from("profiles")
      .update({
        full_name: user.fullName,
        role: user.role,
        organization_id: organizationId,
        has_onboarded: !user.shouldInviteOnly,
      })
      .eq("id", existing.id);

    if (profileError) {
      console.error(
        `   ⚠ ${user.email} exists but profile update failed:`,
        profileError.message,
      );
    } else {
      console.log(`   ✓ ${user.email} (exists)`);
    }
    return existing.id;
  }

  if (user.shouldInviteOnly) {
    const tempPassword = generateTempPassword();
    const { data, error } = await client.auth.admin.createUser({
      email: user.email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { full_name: user.fullName },
    });

    if (error || !data.user) {
      console.error(
        `   ✗ Failed to invite ${user.email}:`,
        error?.message ?? "no user",
      );
      return null;
    }

    await new Promise((resolve) => setTimeout(resolve, 300));

    const { error: profileError } = await client
      .from("profiles")
      .update({
        full_name: user.fullName,
        role: user.role,
        organization_id: organizationId,
        has_onboarded: false,
      })
      .eq("id", data.user.id);

    if (profileError) {
      console.error(
        `   ⚠ Invited ${user.email} but profile update failed:`,
        profileError.message,
      );
    }

    console.log(`   + ${user.email} (invited, password ${tempPassword})`);
    return data.user.id;
  }

  const { data: authData, error: authError } = await client.auth.admin.createUser({
    email: user.email,
    password: DEMO_PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: user.fullName },
  });

  if (authError) {
    console.error(`   ✗ Failed to create ${user.email}:`, authError.message);
    return null;
  }

  await new Promise((resolve) => setTimeout(resolve, 300));

  const { error: profileError } = await client
    .from("profiles")
    .update({
        full_name: user.fullName,
        role: user.role,
        organization_id: organizationId,
        has_onboarded: true,
      })
      .eq("id", authData.user.id);

  if (profileError) {
    console.error(
      `   ⚠ Created ${user.email} but profile update failed:`,
      profileError.message,
    );
  }

  console.log(`   + ${user.email} (${user.role})`);
  return authData.user.id;
}

async function assignDepartments(
  client: SupabaseClient,
  emailToId: Map<string, string>,
  deptMap: Map<string, string>,
) {
  console.log("\n🏷  Assigning departments...");

  for (const user of DEMO_USERS) {
    if (!user.department) {
      continue;
    }

    const profileId = emailToId.get(user.email);
    const departmentId = deptMap.get(user.department);

    if (!profileId || !departmentId) {
      console.log(`   ⚠ Skipped ${user.email} (missing profile or department)`);
      continue;
    }

    const { data: existing } = await client
      .from("profile_departments")
      .select("profile_id")
      .eq("profile_id", profileId)
      .eq("department_id", departmentId)
      .maybeSingle();

    if (existing) {
      console.log(`   ✓ ${user.email} → ${user.department}`);
      continue;
    }

    const { error } = await client.from("profile_departments").insert({
      profile_id: profileId,
      department_id: departmentId,
    });

    if (error) {
      console.error(
        `   ✗ Failed to assign ${user.email} to ${user.department}:`,
        error.message,
      );
      continue;
    }

    console.log(`   + ${user.email} → ${user.department}`);
  }

  console.log("\n👥 Assigning department managers...");

  for (const [deptName, managerEmail] of Object.entries(MANAGER_BY_DEPARTMENT)) {
    const deptId = deptMap.get(deptName);
    const managerId = emailToId.get(managerEmail);

    if (!deptId || !managerId) {
      console.log(`   ⚠ Manager for ${deptName} not found`);
      continue;
    }

    const { error } = await client
      .from("departments")
      .update({ manager_id: managerId })
      .eq("id", deptId);

    if (error) {
      console.error(
        `   ✗ Failed to assign manager to ${deptName}:`,
        error.message,
      );
      continue;
    }

    console.log(`   ✓ ${deptName} → ${managerEmail}`);
  }
}

async function assignSupervisors(
  client: SupabaseClient,
  emailToId: Map<string, string>,
) {
  console.log("\n🔗 Assigning supervisors...");

  for (const user of DEMO_USERS) {
    if (!user.supervisorEmail) {
      continue;
    }

    const memberId = emailToId.get(user.email);
    const supervisorId = emailToId.get(user.supervisorEmail);

    if (!memberId || !supervisorId) {
      console.log(`   ⚠ Skipped supervisor for ${user.email}`);
      continue;
    }

    const { data: existing } = await client
      .from("member_supervisors")
      .select("member_id")
      .eq("member_id", memberId)
      .eq("supervisor_id", supervisorId)
      .maybeSingle();

    if (existing) {
      console.log(`   ✓ ${user.email} ← ${user.supervisorEmail}`);
      continue;
    }

    const { error } = await client.from("member_supervisors").insert({
      member_id: memberId,
      supervisor_id: supervisorId,
    });

    if (error) {
      console.error(
        `   ✗ Failed to assign supervisor for ${user.email}:`,
        error.message,
      );
      continue;
    }

    console.log(`   + ${user.email} ← ${user.supervisorEmail}`);
  }
}

async function seedReportsForUser(
  client: SupabaseClient,
  userId: string,
  email: string,
  daysBack: number = 21,
) {
  let created = 0;
  let skipped = 0;

  for (let d = 0; d < daysBack; d++) {
    const date = new Date();
    date.setDate(date.getDate() - d);

    const dayOfWeek = date.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) continue;

    if (Math.random() < 0.15 && d > 0) continue;

    const reportDate = date.toISOString().split("T")[0];

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

  const authUsers = await listAllAuthUsers(client);
  const invitedEmail = `invited@${DEMO_DOMAIN}`;

  const demoUsers = authUsers.filter(
    (u) =>
      u.email?.endsWith(`@${DEMO_DOMAIN}`) &&
      u.email !== invitedEmail &&
      u.email_confirmed_at,
  );

  if (demoUsers.length === 0) {
    console.log("   No confirmed demo users found. Run without --reports first.");
    return;
  }

  let totalCreated = 0;
  let totalSkipped = 0;

  for (const user of demoUsers) {
    const { created, skipped } = await seedReportsForUser(
      client,
      user.id,
      user.email!,
    );
    totalCreated += created;
    totalSkipped += skipped;
    console.log(`   ${user.email}: ${created} created, ${skipped} skipped`);
  }

  console.log(
    `\n   Total: ${totalCreated} reports created, ${totalSkipped} already existed`,
  );
}

async function resetDemoData(client: SupabaseClient) {
  console.log("\n🗑️  Resetting demo data...");
  console.log("   WARNING: This will delete all @dossier-demo.com users!\n");

  const users = await listAllAuthUsers(client);
  const demoUsers = users.filter((u) => u.email?.endsWith(`@${DEMO_DOMAIN}`));

  if (demoUsers.length === 0) {
    console.log("   No demo users to delete.");
  } else {
    for (const user of demoUsers) {
      const { error } = await client.auth.admin.deleteUser(user.id);
      if (error) {
        console.error(`   ✗ Failed to delete ${user.email}:`, error.message);
        continue;
      }
      console.log(`   - Deleted ${user.email}`);
    }
  }

  await client
    .from("departments")
    .update({ manager_id: null })
    .in("name", DEPARTMENTS);

  console.log("   ✓ Demo data reset complete");
}

function printSummary() {
  console.log("\n" + "=".repeat(60));
  console.log("DEMO ENVIRONMENT READY");
  console.log("=".repeat(60));
  console.log(`
Credentials (password: ${DEMO_PASSWORD} unless noted)

Owner:
  owner@${DEMO_DOMAIN}  - Alex Morgan

HR Admin:
  hr@${DEMO_DOMAIN}     - Jordan Smith

Managers:
  eng.lead@${DEMO_DOMAIN}    - Sarah Chen (Engineering)
  design.lead@${DEMO_DOMAIN} - Marcus Johnson (Design)
  sales.lead@${DEMO_DOMAIN}  - David Park (Sales)

Members:
  alice@${DEMO_DOMAIN}  - Alice Rivera (Engineering, supervisor: Sarah Chen)
  bob@${DEMO_DOMAIN}    - Bob Patel (Engineering, supervisor: Sarah Chen)
  carol@${DEMO_DOMAIN}  - Carol Williams (Design, supervisor: Marcus Johnson)
  dave@${DEMO_DOMAIN}   - Dave Kim (Sales, supervisor: David Park)
  eva@${DEMO_DOMAIN}    - Eva Martinez (Customer Support, no supervisor)

Pending:
  invited@${DEMO_DOMAIN} - Invited Member (Engineering)
                           Sign in with the temp password printed above,
                           then set a permanent password on /onboarding.

Departments: Engineering, Design, Sales, Customer Support, HR
Reports: ~3 weeks of weekday history for confirmed users

Next:
1. Open your Dossier URL
2. Sign in as owner@${DEMO_DOMAIN} with ${DEMO_PASSWORD}
`);
}

async function main() {
  const args = process.argv.slice(2);
  const shouldReset = args.includes("--reset");
  const reportsOnly = args.includes("--reports");

  console.log("\n🌱 Dossier Demo Seeder\n");

  if (shouldReset) {
    await resetDemoData(supabase);
    if (args.length === 1) {
      console.log(
        "\nReset complete. Run again without --reset to seed fresh data.",
      );
      return;
    }
  }

  if (!reportsOnly) {
    const organizationId = await ensureOrganization(supabase);
    const deptMap = await ensureDepartments(supabase, organizationId);

    console.log("\n👤 Creating demo users...");
    const emailToId = new Map<string, string>();

    for (const user of DEMO_USERS) {
      const id = await createDemoUser(supabase, user, organizationId);
      if (id) {
        emailToId.set(user.email, id);
      }
    }

    await assignDepartments(supabase, emailToId, deptMap);
    await assignSupervisors(supabase, emailToId);
  }

  await seedReports(supabase);
  printSummary();
}

main().catch((error) => {
  console.error("\nUnexpected error:", error);
  process.exit(1);
});
