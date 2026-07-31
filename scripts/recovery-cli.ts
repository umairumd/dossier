#!/usr/bin/env npx tsx
/**
 * Inoma Hub Recovery CLI
 *
 * Emergency recovery tool for admin account management.
 * Automatically loads environment variables from .env.local and .env files.
 *
 * Usage:
 *   npm run recovery <command> [options]
 *   # or directly:
 *   npx tsx scripts/recovery-cli.ts <command> [options]
 *
 * Commands:
 *   list-admins              List all admin users and their status
 *   promote <email>          Promote a user to admin role
 *   reactivate <email>       Reactivate a deactivated user (unban + set active)
 *   restore <email>          Restore an archived user (unban + set active + clear archive)
 *   unban <email>            Only remove Supabase Auth ban (doesn't change profile)
 *   create-admin <email> <name> <password>  Create new admin user
 *
 * Examples:
 *   npm run recovery list-admins
 *   npm run recovery promote john@company.com
 *   npm run recovery create-admin emergency@company.com "Emergency Admin" "SecurePass123!"
 */

import { createClient, type User } from "@supabase/supabase-js";
import { initEnv } from "./lib/load-env";

// Load environment variables from .env.local, .env, etc.
initEnv(["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]);

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// Profile row from the profiles table (no email column - emails are in auth.users)
interface ProfileRow {
  id: string;
  full_name: string;
  role: string;
  is_active: boolean;
  archived_at: string | null;
}


/**
 * Load all auth users into a map by ID.
 * This matches the pattern used in lib/supabase/queries/admin/employees.ts
 */
async function loadAuthUsersById(): Promise<Map<string, User>> {
  const authUsersById = new Map<string, User>();
  let page = 1;

  for (;;) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: 200,
    });

    if (error) {
      throw new Error(`Failed to load auth users: ${error.message}`);
    }

    for (const user of data.users) {
      authUsersById.set(user.id, user);
    }

    if (data.users.length < 200) {
      break;
    }
    page += 1;
  }

  return authUsersById;
}

/**
 * Find a user by email using the Admin API.
 * Returns the auth user and their profile if found.
 */
async function findUserByEmail(
  email: string
): Promise<{ authUser: User; profile: ProfileRow } | null> {
  // First, find the auth user by listing all users
  // (Supabase Admin API doesn't have a direct getUserByEmail)
  const authUsersById = await loadAuthUsersById();

  let authUser: User | undefined;
  for (const user of authUsersById.values()) {
    if (user.email?.toLowerCase() === email.toLowerCase()) {
      authUser = user;
      break;
    }
  }

  if (!authUser) {
    return null;
  }

  // Now get the profile
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, full_name, role, is_active, archived_at")
    .eq("id", authUser.id)
    .maybeSingle();

  if (error) {
    console.error("Database error:", error.message);
    return null;
  }

  if (!profile) {
    return null;
  }

  return { authUser, profile: profile as ProfileRow };
}

async function listAdmins() {
  console.log("\n📋 Listing all admin users...\n");

  // Get all admin profiles
  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("id, full_name, role, is_active, archived_at")
    .eq("role", "admin")
    .order("is_active", { ascending: false });

  if (error) {
    console.error("Error fetching admins:", error.message);
    process.exit(1);
  }

  if (!profiles || profiles.length === 0) {
    console.log("⚠️  No admin users found!");
    console.log("   Use 'create-admin' to create an emergency admin account.");
    return;
  }

  // Load auth users to get emails
  const authUsersById = await loadAuthUsersById();

  console.log(
    "ID                                   | Name                | Email                        | Status"
  );
  console.log("-".repeat(110));

  for (const admin of profiles as ProfileRow[]) {
    const authUser = authUsersById.get(admin.id);
    const email = authUser?.email ?? "N/A";

    let status = "✅ Active";
    if (admin.archived_at) {
      status = "📦 Archived";
    } else if (!admin.is_active) {
      status = "🚫 Deactivated";
    }

    console.log(
      `${admin.id} | ${admin.full_name.padEnd(19)} | ${email.padEnd(28)} | ${status}`
    );
  }

  const activeCount = (profiles as ProfileRow[]).filter(
    (a) => a.is_active && !a.archived_at
  ).length;
  console.log("");
  console.log(`Total: ${profiles.length} admin(s), ${activeCount} active`);
}

async function promoteToAdmin(email: string) {
  console.log(`\n🔼 Promoting ${email} to admin...\n`);

  const found = await findUserByEmail(email);
  if (!found) {
    console.error(`❌ User not found: ${email}`);
    process.exit(1);
  }

  const { profile } = found;

  if (profile.role === "admin") {
    console.log(`ℹ️  ${email} is already an admin.`);
    return;
  }

  const { error } = await supabase
    .from("profiles")
    .update({ role: "admin", is_active: true, archived_at: null })
    .eq("id", profile.id);

  if (error) {
    console.error("❌ Failed to promote user:", error.message);
    process.exit(1);
  }

  // Also unban in case they were banned
  await supabase.auth.admin.updateUserById(profile.id, { ban_duration: "none" });

  console.log(`✅ ${profile.full_name} (${email}) is now an admin.`);
}

async function reactivateUser(email: string) {
  console.log(`\n🔓 Reactivating ${email}...\n`);

  const found = await findUserByEmail(email);
  if (!found) {
    console.error(`❌ User not found: ${email}`);
    process.exit(1);
  }

  const { profile } = found;

  if (profile.is_active && !profile.archived_at) {
    console.log(`ℹ️  ${email} is already active.`);
    return;
  }

  // Unban in Supabase Auth
  const { error: authError } = await supabase.auth.admin.updateUserById(
    profile.id,
    { ban_duration: "none" }
  );

  if (authError) {
    console.error("❌ Failed to unban user in Auth:", authError.message);
    process.exit(1);
  }

  // Update profile
  const { error: profileError } = await supabase
    .from("profiles")
    .update({ is_active: true })
    .eq("id", profile.id);

  if (profileError) {
    console.error("❌ Failed to update profile:", profileError.message);
    process.exit(1);
  }

  console.log(`✅ ${profile.full_name} (${email}) has been reactivated.`);
}

async function restoreUser(email: string) {
  console.log(`\n📦 Restoring archived user ${email}...\n`);

  const found = await findUserByEmail(email);
  if (!found) {
    console.error(`❌ User not found: ${email}`);
    process.exit(1);
  }

  const { profile } = found;

  if (!profile.archived_at) {
    console.log(
      `ℹ️  ${email} is not archived. Use 'reactivate' instead if deactivated.`
    );
    return;
  }

  // Unban in Supabase Auth
  const { error: authError } = await supabase.auth.admin.updateUserById(
    profile.id,
    { ban_duration: "none" }
  );

  if (authError) {
    console.error("❌ Failed to unban user in Auth:", authError.message);
    process.exit(1);
  }

  // Update profile
  const { error: profileError } = await supabase
    .from("profiles")
    .update({ is_active: true, archived_at: null })
    .eq("id", profile.id);

  if (profileError) {
    console.error("❌ Failed to update profile:", profileError.message);
    process.exit(1);
  }

  console.log(`✅ ${profile.full_name} (${email}) has been restored from archive.`);
}

async function unbanUser(email: string) {
  console.log(`\n🔓 Unbanning ${email} in Supabase Auth...\n`);

  const found = await findUserByEmail(email);
  if (!found) {
    console.error(`❌ User not found: ${email}`);
    process.exit(1);
  }

  const { profile } = found;

  const { error } = await supabase.auth.admin.updateUserById(profile.id, {
    ban_duration: "none",
  });

  if (error) {
    console.error("❌ Failed to unban user:", error.message);
    process.exit(1);
  }

  console.log(`✅ ${email} has been unbanned in Supabase Auth.`);
  console.log(
    `   Note: Profile is_active = ${profile.is_active}, archived_at = ${profile.archived_at || "null"}`
  );
}

async function createAdmin(email: string, fullName: string, password: string) {
  console.log(`\n🆕 Creating admin user ${email}...\n`);

  // Check if user already exists by searching auth users
  const existing = await findUserByEmail(email);
  if (existing) {
    console.error(`❌ User already exists: ${email}`);
    console.error(
      `   Use 'promote' to make them an admin, or 'reactivate'/'restore' if locked out.`
    );
    process.exit(1);
  }

  // Create user in Supabase Auth
  const { data: authData, error: authError } =
    await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });

  if (authError) {
    console.error("❌ Failed to create user in Auth:", authError.message);
    process.exit(1);
  }

  // The trigger should create the profile, but we need to set admin role
  // Wait a moment for the trigger to complete
  await new Promise((resolve) => setTimeout(resolve, 500));

  const { error: profileError } = await supabase
    .from("profiles")
    .update({ role: "admin", full_name: fullName })
    .eq("id", authData.user.id);

  if (profileError) {
    console.error(
      "⚠️  User created but failed to set admin role:",
      profileError.message
    );
    console.error(`   Run: npm run recovery promote ${email}`);
    process.exit(1);
  }

  console.log(`✅ Admin user created successfully:`);
  console.log(`   Email: ${email}`);
  console.log(`   Name: ${fullName}`);
  console.log(`   ID: ${authData.user.id}`);
  console.log("");
  console.log(`   They can now sign in at your Inoma Hub URL.`);
}

function printUsage() {
  console.log(`
Inoma Hub Recovery CLI

Usage: npm run recovery <command> [options]

Commands:
  list-admins                          List all admin users and their status
  promote <email>                      Promote a user to admin role
  reactivate <email>                   Reactivate a deactivated user
  restore <email>                      Restore an archived user
  unban <email>                        Remove Supabase Auth ban only
  create-admin <email> <name> <pass>   Create new admin user

Environment:
  Automatically loads from .env.local, .env.development.local, .env.development, .env
  Required variables: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

Examples:
  npm run recovery list-admins
  npm run recovery promote john@company.com
  npm run recovery create-admin admin@company.com "Admin User" "SecurePass123!"
`);
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command || command === "help" || command === "--help") {
    printUsage();
    process.exit(0);
  }

  switch (command) {
    case "list-admins":
      await listAdmins();
      break;

    case "promote":
      if (!args[1]) {
        console.error("Error: Email required. Usage: promote <email>");
        process.exit(1);
      }
      await promoteToAdmin(args[1]);
      break;

    case "reactivate":
      if (!args[1]) {
        console.error("Error: Email required. Usage: reactivate <email>");
        process.exit(1);
      }
      await reactivateUser(args[1]);
      break;

    case "restore":
      if (!args[1]) {
        console.error("Error: Email required. Usage: restore <email>");
        process.exit(1);
      }
      await restoreUser(args[1]);
      break;

    case "unban":
      if (!args[1]) {
        console.error("Error: Email required. Usage: unban <email>");
        process.exit(1);
      }
      await unbanUser(args[1]);
      break;

    case "create-admin":
      if (!args[1] || !args[2] || !args[3]) {
        console.error(
          "Error: Email, name, and password required. Usage: create-admin <email> <name> <password>"
        );
        process.exit(1);
      }
      await createAdmin(args[1], args[2], args[3]);
      break;

    default:
      console.error(`Unknown command: ${command}`);
      printUsage();
      process.exit(1);
  }
}

main().catch((error) => {
  console.error("Unexpected error:", error);
  process.exit(1);
});
