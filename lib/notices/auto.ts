import { cache } from "react";
import { isWorkingDay, shiftReportDate, todayInTimezone } from "@/lib/helpers/dates";
import { loadActiveLeaveRemainingByProfile } from "@/lib/helpers/leave-balance";
import { matchesHandbookAudience } from "@/lib/handbook/audience";
import { resolveNoticeRules } from "@/lib/notices/rules";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/supabase/queries/profile";
import { getOrganizationSettings } from "@/lib/supabase/queries/organization-settings";
import type { HandbookAudience, HandbookKind } from "@/types/handbook";
import type { AutoNotice, NoticeRuleKey, NoticeRuleSetting } from "@/types/notice";

// Automatic notices for the signed-in person, worked out from live data each
// time Home loads. Nothing is stored except dismissals of the few that can be
// dismissed, so each one goes away by itself when its cause is fixed.

const LOOKBACK_DAYS = 21;
/** Days that don't count against a report streak. */
const SKIP_STATUSES = new Set(["leave", "half_leave", "holiday", "weekly_off", "absent"]);
const LATE_STATUSES = new Set(["late_minor", "late_major"]);
const TEAM_ROWS = 3;

type Person = {
  id: string;
  full_name: string;
  role: string;
  designation: string | null;
  date_of_birth: string | null;
  created_at: string;
  is_reporting: boolean;
  has_onboarded: boolean;
};

const PERSON_SELECT =
  "id, full_name, role, designation, date_of_birth, created_at, is_reporting, has_onboarded";

function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] || name;
}

/** First names, or first two words where two people share a first name. */
function shortNames(people: { id: string; full_name: string }[]): Map<string, string> {
  const counts = new Map<string, number>();
  for (const person of people) {
    const first = firstName(person.full_name);
    counts.set(first, (counts.get(first) ?? 0) + 1);
  }
  return new Map(
    people.map((person) => {
      const first = firstName(person.full_name);
      const words = person.full_name.trim().split(/\s+/);
      return [person.id, (counts.get(first) ?? 0) > 1 && words.length > 1 ? `${words[0]} ${words[1]}` : first];
    }),
  );
}

function plural(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`;
}

function weekday(date: string): string {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString("en-US", {
    weekday: "short",
    timeZone: "UTC",
  });
}

function shortDate(date: string): string {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function daysLabel(dates: string[]): string {
  const ordered = [...dates].sort();
  return ordered.length <= 3
    ? ordered.map(weekday).join(", ")
    : `Since ${shortDate(ordered[0])}`;
}

/** Working days before today, newest first, with no report and no reason. */
function missedDays(
  reportDates: Set<string>,
  statusByDate: Map<string, string>,
  workingDays: number[],
  today: string,
  joinedOn: string,
): string[] {
  const missed: string[] = [];
  for (let i = 1; i <= LOOKBACK_DAYS; i += 1) {
    const date = shiftReportDate(today, -i);
    if (date < joinedOn) break;
    const status = statusByDate.get(date);
    if (status && SKIP_STATUSES.has(status)) continue;
    if (!status && !isWorkingDay(date, workingDays)) continue;
    if (reportDates.has(date)) break;
    missed.push(date);
  }
  return missed;
}

function formatDays(n: number): string {
  const abs = Math.abs(n);
  return `${abs % 1 === 0 ? abs : abs.toFixed(1)} ${abs === 1 ? "day" : "days"}`;
}

export const getAutoNotices = cache(async (): Promise<AutoNotice[]> => {
  const me = await getCurrentProfile();
  if (!me?.organization_id || !me.is_active) return [];
  const orgId = me.organization_id;
  const settings = await getOrganizationSettings();
  const today = todayInTimezone(settings.timezone);
  const month = today.slice(0, 7);
  const since = shiftReportDate(today, -LOOKBACK_DAYS);
  const admin = createAdminClient();
  const isLeader = me.role === "owner" || me.role === "admin";

  const [{ data: ruleRows }, { data: dismissedRows }, { data: managed }, { data: supervised }] =
    await Promise.all([
      admin.from("notice_rules").select("rule, enabled, threshold").eq("organization_id", orgId),
      admin.from("notice_rule_dismissals").select("key").eq("profile_id", me.id),
      admin.from("departments").select("id").eq("manager_id", me.id),
      admin.from("member_supervisors").select("member_id").eq("supervisor_id", me.id),
    ]);
  const rules = resolveNoticeRules(ruleRows ?? []);
  const on = (rule: NoticeRuleKey): NoticeRuleSetting | null =>
    rules[rule].enabled ? rules[rule] : null;
  const dismissed = new Set((dismissedRows ?? []).map((row) => row.key as string));

  // The team a manager or supervisor looks after (not owners and admins:
  // they get organisation-wide summaries instead).
  const managedIds = (managed ?? []).map((row) => row.id as string);
  const { data: managedMembers } = managedIds.length
    ? await admin.from("profile_departments").select("profile_id").in("department_id", managedIds)
    : { data: [] as { profile_id: string }[] };
  const teamIds = [
    ...new Set([
      ...(managedMembers ?? []).map((row) => row.profile_id as string),
      ...(supervised ?? []).map((row) => row.member_id as string),
    ]),
  ].filter((id) => id !== me.id);

  const { data: peopleRows } = await (isLeader
    ? admin
        .from("profiles")
        .select(PERSON_SELECT)
        .eq("organization_id", orgId)
        .eq("is_active", true)
        .is("archived_at", null)
    : admin
        .from("profiles")
        .select(PERSON_SELECT)
        .in("id", [me.id, ...teamIds])
        .eq("is_active", true)
        .is("archived_at", null));
  const people = (peopleRows ?? []) as Person[];
  const byId = new Map(people.map((person) => [person.id, person]));
  const team = teamIds.flatMap((id) => {
    const person = byId.get(id);
    return person && person.role !== "owner" && person.role !== "admin" ? [person] : [];
  });
  const reporting = (person: Person) => person.is_reporting && person.has_onboarded;
  const names = shortNames(people);
  const nameOf = (person: Person) => names.get(person.id) ?? firstName(person.full_name);

  const meAsPerson = byId.get(me.id);
  const selfReports = Boolean(meAsPerson && reporting(meAsPerson));
  const watchIds = [
    ...new Set([
      ...(selfReports ? [me.id] : []),
      ...team.filter(reporting).map((person) => person.id),
      ...(isLeader ? people.filter((p) => reporting(p) && p.role !== "owner").map((p) => p.id) : []),
    ]),
  ];

  const needAttendance = Boolean(on("missed_reports") || on("late_often"));
  const [{ data: reportRows }, { data: attendanceRows }, leaveLeft] = await Promise.all([
    on("missed_reports") && watchIds.length
      ? admin
          .from("daily_reports")
          .select("author_id, report_date")
          .in("author_id", watchIds)
          .gte("report_date", since)
      : Promise.resolve({ data: [] as { author_id: string; report_date: string }[] }),
    needAttendance && watchIds.length
      ? admin
          .from("attendance_records")
          .select("profile_id, date, status")
          .in("profile_id", watchIds)
          .gte("date", since < `${month}-01` ? since : `${month}-01`)
      : Promise.resolve({ data: [] as { profile_id: string; date: string; status: string }[] }),
    on("over_balance") || on("leave_low")
      ? loadActiveLeaveRemainingByProfile(admin, isLeader ? people.map((p) => p.id) : [me.id])
      : Promise.resolve(new Map<string, number>()),
  ]);

  const reportsBy = new Map<string, Set<string>>();
  for (const row of reportRows ?? []) {
    const set = reportsBy.get(row.author_id) ?? new Set<string>();
    set.add(row.report_date);
    reportsBy.set(row.author_id, set);
  }
  const statusBy = new Map<string, Map<string, string>>();
  for (const row of attendanceRows ?? []) {
    const map = statusBy.get(row.profile_id) ?? new Map<string, string>();
    map.set(row.date, row.status);
    statusBy.set(row.profile_id, map);
  }
  const missedFor = (person: Person) =>
    missedDays(
      reportsBy.get(person.id) ?? new Set(),
      statusBy.get(person.id) ?? new Map(),
      settings.workingDays,
      today,
      person.created_at.slice(0, 10),
    );
  const lateCount = (id: string) =>
    [...(statusBy.get(id) ?? new Map()).entries()].filter(
      ([date, status]) => date.startsWith(month) && LATE_STATUSES.has(status),
    ).length;

  const notices: AutoNotice[] = [];
  const push = (notice: AutoNotice) => {
    if (notice.dismissible && dismissed.has(notice.key)) return;
    notices.push(notice);
  };

  // Missed reports
  const missedRule = on("missed_reports");
  if (missedRule?.threshold) {
    const n = missedRule.threshold;
    const submittedToday = reportsBy.get(me.id)?.has(today) ?? false;
    if (selfReports && meAsPerson && !submittedToday) {
      const missed = missedFor(meAsPerson);
      if (missed.length >= n) {
        push({
          key: "missed_reports:self",
          rule: "missed_reports",
          group: "warning",
          title: `No report for the last ${plural(missed.length, "working day")}`,
          meta: `${daysLabel(missed)} · goes away when you send one`,
          href: "/?hero=report",
          actionLabel: "Write today's",
          dismissible: false,
        });
      }
    }
    const watched = isLeader
      ? people.filter((p) => p.id !== me.id && p.role !== "owner" && reporting(p))
      : team.filter(reporting);
    const behind = watched
      .filter((person) => !reportsBy.get(person.id)?.has(today))
      .map((person) => ({ person, missed: missedFor(person) }))
      .filter(({ missed }) => missed.length >= n + 1)
      .sort((a, b) => b.missed.length - a.missed.length);
    if (behind.length > 0 && behind.length <= TEAM_ROWS && !isLeader) {
      for (const { person, missed } of behind) {
        push({
          key: `missed_reports:${person.id}:${today}`,
          rule: "missed_reports",
          group: "warning",
          title: `${nameOf(person)} hasn't sent a report for ${plural(missed.length, "working day")}`,
          meta: `${daysLabel(missed)} · not on leave`,
          href: `/employees/${person.id}`,
          actionLabel: "Their reports",
          personId: person.id,
          dismissible: true,
        });
      }
    } else if (behind.length > 0) {
      push({
        key: `missed_reports:team:${today}`,
        rule: "missed_reports",
        group: "warning",
        title: `${plural(behind.length, "person has", "people have")} not sent a report for ${n + 1}+ working days`,
        meta: behind
          .slice(0, 4)
          .map(({ person, missed }) => `${nameOf(person)} ${missed.length}`)
          .join(" · "),
        href: "/track-reports",
        actionLabel: "Review",
        dismissible: true,
      });
    }
  }

  // Leave balance
  if (on("over_balance")) {
    const mine = leaveLeft.get(me.id);
    if (mine != null && mine < 0 && me.role !== "owner") {
      push({
        key: "over_balance:self",
        rule: "over_balance",
        group: "warning",
        title: `You've used ${formatDays(mine)} more leave than you have`,
        meta: "It may be deducted from pay · goes away when your balance is back above zero",
        href: "/attendance",
        actionLabel: "See leave",
        dismissible: false,
      });
    }
    if (isLeader) {
      const over = people
        .filter((p) => p.id !== me.id && (leaveLeft.get(p.id) ?? 0) < 0)
        .sort((a, b) => (leaveLeft.get(a.id) ?? 0) - (leaveLeft.get(b.id) ?? 0));
      if (over.length > 0) {
        push({
          key: `over_balance:org:${today}`,
          rule: "over_balance",
          group: "warning",
          title: `${plural(over.length, "person is", "people are")} over their leave balance`,
          meta: over
            .slice(0, 4)
            .map((p) => `${nameOf(p)} −${formatDays(leaveLeft.get(p.id) ?? 0).replace(/ days?$/, "")}`)
            .join(" · "),
          href: "/attendance",
          actionLabel: "Review",
          dismissible: true,
        });
      }
    }
  }
  const lowRule = on("leave_low");
  if (lowRule?.threshold) {
    const mine = leaveLeft.get(me.id);
    if (mine != null && mine >= 0 && mine <= lowRule.threshold && me.role !== "owner") {
      push({
        key: `leave_low:${month}`,
        rule: "leave_low",
        group: "other",
        title: mine === 0 ? "You have no leave left" : `You have ${formatDays(mine)} of leave left`,
        meta: "This contract year",
        href: "/attendance",
        actionLabel: "See leave",
        dismissible: true,
      });
    }
  }

  // Late often
  const lateRule = on("late_often");
  if (lateRule?.threshold) {
    const n = lateRule.threshold;
    if (selfReports) {
      const count = lateCount(me.id);
      if (count >= n) {
        push({
          key: `late_often:${month}:self`,
          rule: "late_often",
          group: "warning",
          title: `You've been late ${plural(count, "time")} this month`,
          meta: "Late and very late days count",
          href: "/attendance",
          actionLabel: "See attendance",
          dismissible: true,
        });
      }
    }
    if (!isLeader && team.length > 0) {
      const late = team
        .map((person) => ({ person, count: lateCount(person.id) }))
        .filter(({ count }) => count >= n)
        .sort((a, b) => b.count - a.count);
      if (late.length > 0) {
        push({
          key: `late_often:${month}:team`,
          rule: "late_often",
          group: "warning",
          title:
            late.length === 1
              ? `${nameOf(late[0].person)} was late ${plural(late[0].count, "time")} this month`
              : `${late.length} people were late ${n}+ times this month`,
          meta: late.length === 1 ? undefined : late.map(({ person, count }) => `${nameOf(person)} ${count}`).join(" · "),
          href: "/attendance",
          actionLabel: "See attendance",
          personId: late.length === 1 ? late[0].person.id : undefined,
          dismissible: true,
        });
      }
    }
  }

  // Handbook docs waiting for confirmation
  const handbookRule = on("handbook_unconfirmed");
  if (handbookRule?.threshold && (settings.handbookLaunchedAt || isLeader)) {
    const cutoff = new Date(Date.now() - handbookRule.threshold * 86_400_000).toISOString();
    const supabase = await createClient();
    const { data: docs } = await supabase
      .from("handbook_docs")
      .select("id, slug, title, kind, version, jd_designation, published_at")
      .eq("requires_ack", true)
      .gt("version", 0)
      .is("archived_at", null)
      .lte("published_at", cutoff);
    if (docs && docs.length > 0) {
      const ids = docs.map((doc) => doc.id as string);
      const [{ data: audienceRows }, { data: ackRows }] = await Promise.all([
        supabase.from("handbook_doc_audiences").select("doc_id, kind, value").in("doc_id", ids),
        supabase.from("handbook_acks").select("doc_id, version").eq("profile_id", me.id).in("doc_id", ids),
      ]);
      const audiencesBy = new Map<string, HandbookAudience[]>();
      for (const row of audienceRows ?? []) {
        const list = audiencesBy.get(row.doc_id) ?? [];
        list.push({ kind: row.kind, value: row.value });
        audiencesBy.set(row.doc_id, list);
      }
      const acked = new Map<string, number>();
      for (const row of ackRows ?? []) {
        acked.set(row.doc_id, Math.max(acked.get(row.doc_id) ?? 0, row.version));
      }
      const self = {
        id: me.id,
        role: me.role,
        designation: me.designation,
        employment_type: me.employment_type,
        is_remote: me.is_remote,
        department_ids: me.department_ids,
        is_supervisor: me.is_supervisor,
      };
      for (const doc of docs) {
        if ((acked.get(doc.id) ?? 0) >= doc.version) continue;
        const applies = matchesHandbookAudience(self, {
          kind: doc.kind as HandbookKind,
          jdDesignation: doc.jd_designation,
          audiences: audiencesBy.get(doc.id) ?? [],
        });
        if (!applies) continue;
        push({
          key: `handbook_unconfirmed:${doc.id}:${doc.version}`,
          rule: "handbook_unconfirmed",
          group: "warning",
          title: `Please confirm you've read ${doc.title}`,
          meta: "Handbook · goes away when you confirm",
          href: `/handbook/${doc.slug}`,
          actionLabel: "Read",
          dismissible: false,
        });
      }
    }
  }

  // Profile details (owners and admins)
  if (on("profile_missing") && isLeader) {
    const { data: memberships } = await admin
      .from("profile_departments")
      .select("profile_id")
      .in(
        "profile_id",
        people.map((p) => p.id),
      );
    const inDepartment = new Set((memberships ?? []).map((row) => row.profile_id as string));
    const missing = people.filter(
      (p) =>
        p.role !== "owner" &&
        p.has_onboarded &&
        (!p.designation?.trim() || !p.date_of_birth || !inDepartment.has(p.id)),
    );
    if (missing.length > 0) {
      push({
        key: `profile_missing:org:${today}`,
        rule: "profile_missing",
        group: "warning",
        title: `${plural(missing.length, "person is", "people are")} missing profile details`,
        meta: missing.slice(0, 4).map(nameOf).join(", ") + (missing.length > 4 ? ` and ${missing.length - 4} more` : ""),
        href: "/employees",
        actionLabel: "Fix",
        dismissible: true,
      });
    }
  }

  return notices;
});
