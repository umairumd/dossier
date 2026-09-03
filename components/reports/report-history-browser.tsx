"use client";

import { useState } from "react";
import { ReportDetailSheet } from "@/components/manager/report-detail-sheet";
import { ReportHistoryCards } from "@/components/reports/report-history-cards";
import { ReportHistoryTable } from "@/components/reports/report-history-table";
import type { DeadlineContext } from "@/lib/reports/submission-status";
import type { DailyReport } from "@/types/report";
import type { TeamMemberReport } from "@/types/team";

type SubmittedMember = TeamMemberReport & { report: DailyReport };

export function ReportHistoryBrowser({
  reports,
  userName,
  deadline,
  adminView = false,
  showProfileLink = true,
}: {
  reports: DailyReport[];
  userName: string;
  deadline: DeadlineContext;
  adminView?: boolean;
  showProfileLink?: boolean;
}) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

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
        deadline={deadline}
        onView={setOpenIndex}
      />
      <ReportHistoryCards
        reports={reports}
        deadline={deadline}
        onView={setOpenIndex}
      />
      <ReportDetailSheet
        members={members}
        index={openIndex}
        onIndexChange={setOpenIndex}
        deadline={deadline}
        adminView={adminView}
        showProfileLink={showProfileLink}
      />
    </>
  );
}
