import type { NoticeRuleKey, NoticeRuleSetting } from "@/types/notice";

// Automatic notices: what each one does and its default. On by default when
// it costs money or blocks work; off when it would become noise.

export interface NoticeRuleDef {
  rule: NoticeRuleKey;
  label: string;
  hint: string;
  /** How the threshold reads, with {n} for the number. Null when there is none. */
  when: string | null;
  defaultEnabled: boolean;
  defaultThreshold: number | null;
  min?: number;
  max?: number;
  /** Who else is told, in words. */
  alsoTells: string;
}

export const NOTICE_RULES: NoticeRuleDef[] = [
  {
    rule: "missed_reports",
    label: "Missed daily reports",
    hint: "Skips leave, holidays and days off. Goes away when they send a report.",
    when: "After {n} working days in a row",
    defaultEnabled: true,
    defaultThreshold: 2,
    min: 1,
    max: 10,
    alsoTells: "Their manager one day later",
  },
  {
    rule: "over_balance",
    label: "Over the leave balance",
    hint: "Leave left is below zero this contract year.",
    when: null,
    defaultEnabled: true,
    defaultThreshold: null,
    alsoTells: "Owners and admins",
  },
  {
    rule: "leave_low",
    label: "Leave running low",
    hint: "A heads-up the person can dismiss.",
    when: "{n} days or fewer left",
    defaultEnabled: false,
    defaultThreshold: 2,
    min: 1,
    max: 10,
    alsoTells: "No one else",
  },
  {
    rule: "late_often",
    label: "Late often",
    hint: "Late and very late days this month. Can be dismissed for the month.",
    when: "{n} late days in a month",
    defaultEnabled: true,
    defaultThreshold: 3,
    min: 1,
    max: 20,
    alsoTells: "Their manager",
  },
  {
    rule: "handbook_unconfirmed",
    label: "Handbook doc not confirmed",
    hint: "Only docs that ask people to confirm they've read them.",
    when: "{n} days after publishing",
    defaultEnabled: true,
    defaultThreshold: 3,
    min: 1,
    max: 30,
    alsoTells: "No one else (admins see read progress in the handbook)",
  },
  {
    rule: "profile_missing",
    label: "Profile details missing",
    hint: "No designation, department or date of birth.",
    when: null,
    defaultEnabled: true,
    defaultThreshold: null,
    alsoTells: "Shown to owners and admins only",
  },
];

export const NOTICE_RULE_KEYS = NOTICE_RULES.map((def) => def.rule);

export function isNoticeRuleKey(value: unknown): value is NoticeRuleKey {
  return typeof value === "string" && (NOTICE_RULE_KEYS as string[]).includes(value);
}

/** Stored settings over the defaults, one entry per rule. */
export function resolveNoticeRules(
  stored: { rule: string; enabled: boolean; threshold: number | null }[],
): Record<NoticeRuleKey, NoticeRuleSetting> {
  const byRule = new Map(stored.map((row) => [row.rule, row]));
  return Object.fromEntries(
    NOTICE_RULES.map((def) => {
      const row = byRule.get(def.rule);
      const threshold =
        def.defaultThreshold == null
          ? null
          : Math.min(def.max ?? 60, Math.max(def.min ?? 1, row?.threshold ?? def.defaultThreshold));
      return [def.rule, { rule: def.rule, enabled: row?.enabled ?? def.defaultEnabled, threshold }];
    }),
  ) as Record<NoticeRuleKey, NoticeRuleSetting>;
}
