import { NextResponse } from "next/server";
import { sendBirthdayNotifications } from "@/lib/actions/admin/birthdays";
import { createAdminClient } from "@/lib/supabase/admin";

function authorize(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = request.headers.get("authorization");
  return header === `Bearer ${secret}`;
}

async function handle(request: Request): Promise<NextResponse> {
  if (!authorize(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const adminClient = createAdminClient();
  const { data: orgs, error } = await adminClient
    .from("organizations")
    .select("id");

  if (error) {
    console.error("[cron/birthdays] Failed to load organizations:", error);
    return NextResponse.json(
      { error: "Failed to load organizations" },
      { status: 500 },
    );
  }

  for (const org of orgs ?? []) {
    await sendBirthdayNotifications(org.id);
  }

  return NextResponse.json({
    ok: true,
    orgs: (orgs ?? []).length,
  });
}

export async function GET(request: Request) {
  return handle(request);
}

export async function POST(request: Request) {
  return handle(request);
}
