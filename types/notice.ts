import type { HandbookAudience } from "@/types/handbook";

export type NoticeKind = "announcement" | "personal";

/** A posted notice as the reader sees it. */
export interface Notice {
  id: string;
  kind: NoticeKind;
  title: string;
  bodyMd: string;
  createdBy: string | null;
  createdByName: string | null;
  targetProfileId: string | null;
  targetName: string | null;
  requiresAck: boolean;
  pinnedUntil: string | null;
  endsAt: string | null;
  publishedAt: string | null;
  archivedAt: string | null;
  audiences: HandbookAudience[];
  /** The viewer's own state. */
  seenAt: string | null;
  dismissedAt: string | null;
  acknowledgedAt: string | null;
}

export type NoticeRuleKey =
  | "missed_reports"
  | "over_balance"
  | "leave_low"
  | "late_often"
  | "handbook_unconfirmed"
  | "profile_missing";

export interface NoticeRuleSetting {
  rule: NoticeRuleKey;
  enabled: boolean;
  threshold: number | null;
}

/** An automatic notice, worked out on the server for one viewer. */
export interface AutoNotice {
  /** Stable per period, e.g. "late_often:2026-10"; used to dismiss. */
  key: string;
  rule: NoticeRuleKey;
  group: "action" | "warning" | "news" | "other";
  title: string;
  meta?: string;
  href?: string;
  actionLabel?: string;
  /** Avatar to show instead of an icon. */
  personId?: string;
  dismissible: boolean;
}
