"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ReportDetailSheet } from "@/components/manager/report-detail-sheet";
import { ReportHistoryCards } from "@/components/reports/report-history-cards";
import { ReportHistoryTable } from "@/components/reports/report-history-table";
import type { DeadlineContext } from "@/lib/reports/submission-status";
import type { DailyReport } from "@/types/report";
import type { TeamMemberReport } from "@/types/team";
import type { ReportTemplateWithFields } from "@/types/template";
import type { UserRole } from "@/types/profile";

type SubmittedMember = TeamMemberReport & { report: DailyReport };

export function ReportHistoryBrowser({
  reports,
  userName,
  deadline,
  adminView = false,
  showProfileLink = true,
  templates,
  isOwnReport = false,
  viewerRole,
  currentUserId,
  initialViewId,
  viewReport,
}: {
  reports: DailyReport[];
  userName: string;
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
    avatarUrl: null,
    report,
  }));

  const templatesMap = new Map(
    (templates ?? []).map((template) => [template.id, template.name]),
  );

  useEffect(() => {
    if (!initialViewId || didOpenView) return;
    const index = displayReports.findIndex(
      (report) => report.id === initialViewId,
    );
    if (index >= 0) {
      setOpenIndex(index);
      setDidOpenView(true);
    }
  }, [initialViewId, displayReports, didOpenView]);

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
      <ReportHistoryTable
        reports={displayReports}
        deadline={deadline}
        onView={setOpenIndex}
        templatesMap={templatesMap}
      />
      <ReportHistoryCards
        reports={displayReports}
        deadline={deadline}
        onView={setOpenIndex}
        templatesMap={templatesMap}
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
      />
    </>
  );
}
