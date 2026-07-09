/**
 * Seed Admin User for koetik.studio.my.id
 *
 * Usage:
 *   node scripts/seed-admin.mjs
 *
 * Required env vars (from .env or .env.local):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * You will be prompted for email and password.
 */

import { createClient } from "@supabase/supabase-js";
import { createInterface } from "readline";

const rl = createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise((resolve) => rl.question(q, resolve));

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    console.error(
      "Missing env vars. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY"
    );
    console.error("Tip: run with `node --env-file=.env.local scripts/seed-admin.mjs`");
    process.exit(1);
  }

  const email = await ask("Admin email: ");
  const password = await ask("Admin password (min 6 chars): ");

  if (!email || password.length < 6) {
    console.error("Email required, password must be at least 6 characters.");
    process.exit(1);
  }

  const supabase = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (error) {
    console.error("Failed to create admin user:", error.message);
    process.exit(1);
  }

  console.log("\n✓ Admin user created successfully!");
  console.log(`  Email: ${data.user.email}`);
  console.log(`  ID:    ${data.user.id}`);
  console.log(`\nYou can now login at /admin/login`);

  rl.close();
}

main();
