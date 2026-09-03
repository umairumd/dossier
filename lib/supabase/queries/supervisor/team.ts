import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { requireSupervisorUser } from "@/lib/supabase/require-admin";
import { daysBetweenDateStrings, todayDateString } from "@/lib/helpers/dates";
import type { TeamRosterMember } from "@/lib/supabase/queries/manager/team";
import type { DailyReport } from "@/types/report";
import type { MissingReportRow } from "@/types/missing-report";
import type { TeamMemberReport } from "@/types/team";

const REPORT_SELECT =
  "id, author_id, report_date, content, blockers, additional_notes, submitted_at, created_at";

export const getSupervisedMembers = cache(
  async (): Promise<TeamRosterMember[]> => {
    await requireSupervisorUser();

    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return [];
    }

    const { data: assignments, error: assignmentsError } = await supabase
      .from("member_supervisors")
      .select("member_id")
      .eq("supervisor_id", user.id);

    if (assignmentsError) {
      throw new Error("Failed to load supervised members.");
    }

    const memberIds = (assignments ?? []).map((row) => row.member_id);

    if (memberIds.length === 0) {
      return [];
    }

    const { data: employees, error: employeesError } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", memberIds)
      .is("archived_at", null)
      .order("full_name", { ascending: true });

    if (employeesError) {
      throw new Error("Failed to load supervised members.");
    }

    return employees ?? [];
  },
);

export const getSupervisedReportsForDate = cache(
  async (date: string): Promise<TeamMemberReport[]> => {
    await requireSupervisorUser();

    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return [];
    }

    const { data: assignments, error: assignmentsError } = await supabase
      .from("member_supervisors")
      .select("member_id")
      .eq("supervisor_id", user.id);

    if (assignmentsError) {
      throw new Error("Failed to load supervised members.");
    }

    const memberIds = (assignments ?? []).map((row) => row.member_id);

    if (memberIds.length === 0) {
      return [];
    }

    const { data: employees, error: employeesError } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", memberIds)
      .eq("has_onboarded", true)
      .is("archived_at", null)
      .order("full_name", { ascending: true });

    if (employeesError) {
      throw new Error("Failed to load supervised members.");
    }

    if (!employees || employees.length === 0) {
      return [];
    }

    const { data: reports, error: reportsError } = await supabase
      .from("daily_reports")
      .select(REPORT_SELECT)
      .in(
        "author_id",
        employees.map((employee) => employee.id),
      )
      .eq("report_date", date);

    if (reportsError) {
      throw new Error("Failed to load reports for that date.");
    }

    const reportsByAuthor = new Map(
      ((reports as DailyReport[]) ?? []).map((report) => [
        report.author_id,
        report,
      ]),
    );

    return employees.map((employee) => ({
      employeeId: employee.id,
      fullName: employee.full_name,
      report: reportsByAuthor.get(employee.id) ?? null,
    }));
  },
);

export const getSupervisedMissingToday = cache(
  async (): Promise<MissingReportRow[]> => {
    await requireSupervisorUser();

    const supabase = await createClient();
    const today = todayDateString();
    const todayMembers = await getSupervisedReportsForDate(today);
    const missing = todayMembers.filter((member) => !member.report);

    if (missing.length === 0) {
      return [];
    }

    const missingIds = missing.map((member) => member.employeeId);

    const { data: priorReports, error } = await supabase
      .from("daily_reports")
      .select("author_id, report_date")
      .in("author_id", missingIds)
      .order("report_date", { ascending: false });

    if (error) {
      throw new Error("Failed to load prior report history.");
    }

    const lastSubmittedByAuthor = new Map<string, string>();
    for (const row of priorReports ?? []) {
      if (!lastSubmittedByAuthor.has(row.author_id)) {
        lastSubmittedByAuthor.set(row.author_id, row.report_date);
      }
    }

    return missing.map((member) => {
      const lastSubmittedDate =
        lastSubmittedByAuthor.get(member.employeeId) ?? null;

      return {
        employeeId: member.employeeId,
        fullName: member.fullName,
        lastSubmittedDate,
        daysMissed: lastSubmittedDate
          ? daysBetweenDateStrings(lastSubmittedDate, today)
          : null,
      };
    });
  },
);
