"use client";

import { useState } from "react";
import { ReportDetailSheet } from "@/components/manager/report-detail-sheet";
import { ReportHistoryCards } from "@/components/reports/report-history-cards";
import { ReportHistoryTable } from "@/components/reports/report-history-table";
import { DEFAULT_REPORT_DEADLINE_HOUR_UTC } from "@/lib/reports/submission-status";
import type { DailyReport } from "@/types/report";
import type { TeamMemberReport } from "@/types/team";

type SubmittedMember = TeamMemberReport & { report: DailyReport };

export function ReportHistoryBrowser({
  reports,
  userName,
  deadlineHourUtc,
  departmentName = "My Reports",
  adminView = false,
  showProfileLink = true,
}: {
  reports: DailyReport[];
  userName: string;
  deadlineHourUtc?: number;
  departmentName?: string;
  adminView?: boolean;
  showProfileLink?: boolean;
}) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const deadline = deadlineHourUtc ?? DEFAULT_REPORT_DEADLINE_HOUR_UTC;

  const members: SubmittedMember[] = reports.map((report) => ({
    employeeId: report.author_id,
    fullName: userName,
    designation: null,
    report,
  }));

  return (
    <>
      <ReportHistoryTable
        reports={reports}
        deadlineHourUtc={deadlineHourUtc}
        onView={setOpenIndex}
      />
      <ReportHistoryCards
        reports={reports}
        deadlineHourUtc={deadlineHourUtc}
        onView={setOpenIndex}
      />
      <ReportDetailSheet
        members={members}
        departmentName={departmentName}
        index={openIndex}
        onIndexChange={setOpenIndex}
        deadlineHourUtc={deadline}
        adminView={adminView}
        showProfileLink={showProfileLink}
      />
    </>
  );
}
