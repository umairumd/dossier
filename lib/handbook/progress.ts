import { matchesHandbookAudience, type AudiencePerson } from "@/lib/handbook/audience";
import type { HandbookDoc } from "@/types/handbook";

export type ReaderStatus = "current" | "older" | "none";

export interface ReaderRow<P extends AudiencePerson> {
  person: P;
  status: ReaderStatus;
  /** Latest version they confirmed, when any. */
  version: number | null;
  acknowledgedAt: string | null;
}

export interface ReadProgress<P extends AudiencePerson> {
  total: number;
  current: number;
  rows: ReaderRow<P>[];
}

/** Who the doc is for and how far each of them has read. */
export function computeReadProgress<P extends AudiencePerson>(
  doc: Pick<HandbookDoc, "id" | "kind" | "jdDesignation" | "audiences" | "version">,
  people: P[],
  acks: { doc_id: string; profile_id: string; version: number; acknowledged_at: string }[],
): ReadProgress<P> {
  const latest = new Map<string, { version: number; at: string }>();
  for (const ack of acks) {
    if (ack.doc_id !== doc.id) continue;
    const previous = latest.get(ack.profile_id);
    if (!previous || ack.version > previous.version) {
      latest.set(ack.profile_id, { version: ack.version, at: ack.acknowledged_at });
    }
  }

  const order: Record<ReaderStatus, number> = { none: 0, older: 1, current: 2 };
  const rows: ReaderRow<P>[] = people
    .filter((person) => matchesHandbookAudience(person, doc))
    .map((person) => {
      const read = latest.get(person.id);
      const status: ReaderStatus = !read
        ? "none"
        : read.version >= doc.version
          ? "current"
          : "older";
      return {
        person,
        status,
        version: read?.version ?? null,
        acknowledgedAt: read?.at ?? null,
      };
    })
    .sort((a, b) => order[a.status] - order[b.status]);

  return {
    total: rows.length,
    current: rows.filter((row) => row.status === "current").length,
    rows,
  };
}
