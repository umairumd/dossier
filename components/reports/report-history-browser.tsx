"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ReportDetailSheet } from "@/components/manager/report-detail-sheet";
import { ReportHistoryList } from "@/components/reports/report-history-list";
import type { DeadlineContext } from "@/lib/reports/submission-status";
import type { DailyReport, ReportComment } from "@/types/report";
import type { TeamMemberReport } from "@/types/team";
import type { ReportTemplateWithFields } from "@/types/template";
import type { UserRole } from "@/types/profile";

type SubmittedMember = TeamMemberReport & { report: DailyReport };

export function ReportHistoryBrowser({
  reports,
  userName,
  avatar,
  deadline,
  adminView = false,
  showProfileLink = true,
  templates,
  isOwnReport = false,
  viewerRole,
  currentUserId,
  initialViewId,
  viewReport,
  comments,
}: {
  /** Comments for these reports, loaded with the list (getCommentsForReports). */
  comments?: Record<string, ReportComment[]>;
  reports: DailyReport[];
  userName: string;
  avatar?: unknown;
  deadline: DeadlineContext;
  adminView?: boolean;
  showProfileLink?: boolean;
  templates?: ReportTemplateWithFields[];
  isOwnReport?: boolean;
  viewerRole?: UserRole;
  currentUserId?: string;
  initialViewId?: string;
  viewReport?: DailyReport | null;
}) {
  const router = useRouter();
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [didOpenView, setDidOpenView] = useState(false);

  const displayReports = useMemo(() => {
    if (viewReport && !reports.some((report) => report.id === viewReport.id)) {
      return [viewReport, ...reports];
    }
    return reports;
  }, [reports, viewReport]);

  const members: SubmittedMember[] = displayReports.map((report) => ({
    employeeId: report.author_id,
    fullName: userName,
    designation: null,
    avatar,
    report,
  }));


  // Open ?view=<id> once (state adjusted during render, not in an effect).
  if (initialViewId && !didOpenView) {
    const index = displayReports.findIndex((report) => report.id === initialViewId);
    if (index >= 0) {
      setOpenIndex(index);
      setDidOpenView(true);
    }
  }

  function handleIndexChange(next: number | null) {
    setOpenIndex(next);
    if (next === null && initialViewId) {
      const params = new URLSearchParams(window.location.search);
      params.delete("view");
      const query = params.toString();
      router.replace(query ? `/reports?${query}` : "/reports", {
        scroll: false,
      });
    }
  }

  return (
    <>
      <ReportHistoryList
        reports={displayReports}
        deadline={deadline}
        templates={templates}
        onView={setOpenIndex}
      />
      <ReportDetailSheet
        members={members}
        index={openIndex}
        onIndexChange={handleIndexChange}
        deadline={deadline}
        adminView={adminView}
        showProfileLink={showProfileLink}
        templates={templates}
        isOwnReport={isOwnReport}
        viewerRole={viewerRole}
        currentUserId={currentUserId}
        initialComments={comments}
      />
    </>
  );
}
