import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { requireAdminUser } from "@/lib/supabase/require-admin";
import { getCurrentProfile } from "@/lib/supabase/queries/profile";
import { parseYearMonth } from "@/lib/helpers/dates";
import { logActivity } from "@/lib/helpers/activity-log";
import { sheetFileName } from "@/lib/exports/attendance-sheet/build";
import { loadAttendanceSheet } from "@/lib/exports/attendance-sheet/load";
import { AttendanceSheetDocument } from "@/lib/exports/attendance-sheet/pdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/exports/attendance-sheet?month=2026-10 (&view=1 to open instead of download)
// Owners and admins only. The whole team's month as a print-ready A4 PDF.
export async function GET(request: Request) {
  try {
    await requireAdminUser();
  } catch {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const params = new URL(request.url).searchParams;
  const month = parseYearMonth(params.get("month"));
  if (!month) {
    return NextResponse.json({ error: "Choose a month." }, { status: 400 });
  }

  const viewer = await getCurrentProfile();
  const sheet = await loadAttendanceSheet(month, viewer?.full_name ?? "Dossier");

  if (viewer?.organization_id) {
    void logActivity({
      orgId: viewer.organization_id,
      eventType: "record_exported",
      actorId: viewer.id,
      actorName: viewer.full_name ?? undefined,
      entityType: "attendance_sheet",
      entityName: sheet.label,
      metadata: { kind: "attendance_sheet", month, period: sheet.label },
    });
  }

  const pdf = await renderToBuffer(<AttendanceSheetDocument sheet={sheet} />);
  const fileName = sheetFileName(sheet.orgName, month, "pdf");
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${params.get("view") === "1" ? "inline" : "attachment"}; filename="${fileName.replace(/[^\x20-\x7e]/g, "")}"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
      "Cache-Control": "no-store",
    },
  });
}
