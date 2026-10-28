export type HandbookKind = "policy" | "sop" | "jd" | "guide";

export type HandbookAudienceKind =
  | "everyone"
  | "department"
  | "role"
  | "designation"
  | "employment_type"
  | "work_location"
  | "profile";

export interface HandbookAudience {
  kind: HandbookAudienceKind;
  /** Null only for "everyone". */
  value: string | null;
}

export interface HandbookDoc {
  id: string;
  organizationId: string;
  kind: HandbookKind;
  title: string;
  slug: string;
  summary: string | null;
  bodyMd: string;
  draftMd: string;
  /** 0 until first published. */
  version: number;
  changeNote: string | null;
  requiresAck: boolean;
  startHere: boolean;
  ownerId: string | null;
  jdDesignation: string | null;
  publishedAt: string | null;
  publishedBy: string | null;
  publishedByName: string | null;
  remindedAt: string | null;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
  audiences: HandbookAudience[];
}

/** The latest version a person confirmed (or opened) and when. */
export interface HandbookReadState {
  version: number;
  acknowledgedAt: string;
}
