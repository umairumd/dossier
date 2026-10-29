import { NextResponse } from "next/server";
import { sendTaskReminders } from "@/lib/tasks/reminders";
import { createAdminClient } from "@/lib/supabase/admin";

function authorize(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

async function handle(request: Request): Promise<NextResponse> {
  if (!authorize(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { data: orgs, error } = await createAdminClient().from("organizations").select("id");
  if (error) {
    console.error("[cron/tasks] Failed to load organizations:", error);
    return NextResponse.json({ error: "Failed to load organizations" }, { status: 500 });
  }
  const results = [];
  for (const org of orgs ?? []) {
    results.push(await sendTaskReminders(org.id));
  }
  return NextResponse.json({ ok: true, results });
}

export async function GET(request: Request) {
  return handle(request);
}
