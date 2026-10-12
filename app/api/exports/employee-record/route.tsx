import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { requireAdminUser } from "@/lib/supabase/require-admin";
import { getCurrentProfile } from "@/lib/supabase/queries/profile";
import { isValidDateString } from "@/lib/helpers/dates";
import { logActivity } from "@/lib/helpers/activity-log";
import { loadEmployeeRecordRaw } from "@/lib/exports/employee-record/load";
import {
  RECORD_MAX_DAYS,
  buildEmployeeRecord,
  daySpan,
  plainDate,
  recordFileName,
  type RecordOptions,
  type RecordSections,
} from "@/lib/exports/employee-record/build";
import { EmployeeRecordDocument } from "@/lib/exports/employee-record/pdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function flag(params: URLSearchParams, key: string, fallback: boolean): boolean {
  const value = params.get(key);
  if (value === null) return fallback;
  return value === "1";
}

// GET /api/exports/employee-record?id=&from=&to=&attendance=1&reports=1&comments=1&missed=1&money=1&review=0
// Owners and admins only. Streams the employee record as a PDF download.
export async function GET(request: Request) {
  try {
    await requireAdminUser();
  } catch {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const params = new URL(request.url).searchParams;
  const id = params.get("id") ?? "";
  const from = params.get("from");
  const to = params.get("to");

  if (!UUID.test(id) || !isValidDateString(from) || !isValidDateString(to) || from > to) {
    return NextResponse.json({ error: "Invalid export request." }, { status: 400 });
  }
  if (daySpan(from, to) > RECORD_MAX_DAYS) {
    return NextResponse.json({ error: "Choose a period of six months or less." }, { status: 400 });
  }

  const sections: RecordSections = {
    attendance: flag(params, "attendance", true),
    reports: flag(params, "reports", true),
    comments: flag(params, "comments", true),
  };
  sections.comments = sections.comments && sections.reports;
  const options: RecordOptions = {
    showMissed: flag(params, "missed", true),
    leaveAndFines: flag(params, "money", true),
    reviewPage: flag(params, "review", false),
  };

  const [raw, viewer] = await Promise.all([
    loadEmployeeRecordRaw(id, from, to, { withComments: sections.comments }),
    getCurrentProfile(),
  ]);
  if (!raw) {
    return NextResponse.json({ error: "Employee not found." }, { status: 404 });
  }

  // Nothing before the person joined, nothing after today.
  const start = from < raw.person.joinedOn ? raw.person.joinedOn : from;
  if (start > to || start > raw.today) {
    return NextResponse.json({ error: "Nothing to export for these dates." }, { status: 400 });
  }

  const record = buildEmployeeRecord(raw, start, to);
  const generatedBy = viewer?.full_name ?? "Dossier";

  const pdf = await renderToBuffer(
    <EmployeeRecordDocument
      record={record}
      sections={sections}
      options={options}
      timeZone={raw.timezone}
      generatedBy={generatedBy}
      generatedOn={plainDate(raw.today)}
    />,
  );

  if (viewer?.organization_id) {
    void logActivity({
      orgId: viewer.organization_id,
      eventType: "record_exported",
      actorId: viewer.id,
      actorName: viewer.full_name ?? undefined,
      targetId: raw.person.id,
      targetName: raw.person.name,
      entityType: "employee",
      entityId: raw.person.id,
      metadata: {
        from: start,
        to: record.period.to,
        period: record.period.label,
        sections: Object.entries(sections)
          .filter(([, on]) => on)
          .map(([key]) => key),
      },
    });
  }

  const fileName = recordFileName(raw.person.name, start, to);
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${fileName.replace(/[^\x20-\x7e]/g, "")}"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
      "Cache-Control": "no-store",
    },
  });
}
