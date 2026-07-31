/**
 * Environment variable loader for CLI scripts.
 *
 * Mimics Next.js environment loading behavior:
 * 1. .env.local (highest priority, not committed to git)
 * 2. .env.development.local
 * 3. .env.development
 * 4. .env (lowest priority)
 *
 * Usage:
 *   import { loadEnv, requireEnvVars } from "./lib/load-env";
 *   loadEnv();
 *   requireEnvVars(["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]);
 */

import { config } from "dotenv";
import { existsSync } from "fs";
import { resolve } from "path";

// Find project root by looking for package.json
function findProjectRoot(): string {
  let dir = __dirname;
  for (let i = 0; i < 10; i++) {
    if (existsSync(resolve(dir, "package.json"))) {
      return dir;
    }
    const parent = resolve(dir, "..");
    if (parent === dir) break;
    dir = parent;
  }
  // Fallback to cwd
  return process.cwd();
}

const PROJECT_ROOT = findProjectRoot();

// Environment files in order of priority (later files override earlier)
const ENV_FILES = [
  ".env",
  ".env.development",
  ".env.development.local",
  ".env.local",
];

interface LoadEnvResult {
  loaded: string[];
  notFound: string[];
}

/**
 * Load environment variables from .env files.
 * Files are loaded in priority order, with later files overriding earlier ones.
 */
export function loadEnv(): LoadEnvResult {
  const loaded: string[] = [];
  const notFound: string[] = [];

  for (const file of ENV_FILES) {
    const filePath = resolve(PROJECT_ROOT, file);
    if (existsSync(filePath)) {
      config({ path: filePath, override: true });
      loaded.push(file);
    } else {
      notFound.push(file);
    }
  }

  return { loaded, notFound };
}

/**
 * Validate that required environment variables are set.
 * Exits with helpful error message if any are missing.
 */
export function requireEnvVars(vars: string[]): void {
  const missing: string[] = [];

  for (const name of vars) {
    if (!process.env[name]) {
      missing.push(name);
    }
  }

  if (missing.length > 0) {
    const { loaded } = getEnvStatus();

    console.error("\n❌ Missing required environment variables:\n");
    for (const name of missing) {
      console.error(`   • ${name}`);
    }

    console.error("\n📁 Environment files searched (in project root):\n");
    for (const file of ENV_FILES) {
      const found = loaded.includes(file);
      console.error(`   ${found ? "✓" : "✗"} ${file}${found ? " (loaded)" : " (not found)"}`);
    }

    console.error("\n💡 To fix this:\n");
    console.error("   1. Create a .env.local file in your project root:");
    console.error(`      ${resolve(PROJECT_ROOT, ".env.local")}\n`);
    console.error("   2. Add the missing variables:");
    console.error("      SUPABASE_URL=https://your-project.supabase.co");
    console.error("      SUPABASE_SERVICE_ROLE_KEY=your-service-role-key\n");
    console.error("   3. Get these values from:");
    console.error("      Supabase Dashboard → Project Settings → API\n");

    process.exit(1);
  }
}

// Track which files were loaded
let envStatus: LoadEnvResult | null = null;

function getEnvStatus(): LoadEnvResult {
  if (!envStatus) {
    // Re-check file existence without loading
    const loaded: string[] = [];
    const notFound: string[] = [];
    for (const file of ENV_FILES) {
      const filePath = resolve(PROJECT_ROOT, file);
      if (existsSync(filePath)) {
        loaded.push(file);
      } else {
        notFound.push(file);
      }
    }
    return { loaded, notFound };
  }
  return envStatus;
}

/**
 * Load environment variables and validate required ones.
 * Convenience function that combines loadEnv() and requireEnvVars().
 */
export function initEnv(requiredVars: string[]): void {
  envStatus = loadEnv();
  requireEnvVars(requiredVars);
}
