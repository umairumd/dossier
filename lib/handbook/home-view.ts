import type { HandbookAlert, HandbookSections } from "@/components/handbook/handbook-home";
import type { HandbookListItem } from "@/components/handbook/doc-list";
import { normaliseDesignation } from "@/lib/handbook/audience";
import { formatShortDate, readStatus } from "@/lib/handbook/format";
import type { HandbookDoc, HandbookReadState } from "@/types/handbook";

/** Latest read per doc from raw confirmation rows. */
export function latestReads(
  rows: { doc_id: string; version: number; acknowledged_at: string }[],
): Record<string, HandbookReadState> {
  const reads: Record<string, HandbookReadState> = {};
  for (const row of rows) {
    const previous = reads[row.doc_id];
    if (!previous || row.version > previous.version) {
      reads[row.doc_id] = { version: row.version, acknowledgedAt: row.acknowledged_at };
    }
  }
  return reads;
}

/** Link to a doc, keeping "view as" when an admin is previewing. */
export function handbookDocHref(slug: string, asId?: string | null): string {
  return asId ? `/handbook/${slug}?as=${asId}` : `/handbook/${slug}`;
}

/**
 * Everything the handbook home shows, for one reader. Used for the signed-in
 * person and for an owner or admin viewing the handbook as someone else.
 */
export function buildHandbookHome({
  docs,
  reads,
  designation,
  departmentIds,
  departmentNames,
  timeZone,
  asId,
}: {
  docs: HandbookDoc[];
  reads: Record<string, HandbookReadState>;
  designation: string | null;
  departmentIds: string[];
  departmentNames: Map<string, string>;
  timeZone: string;
  asId?: string | null;
}): { items: HandbookListItem[]; searchIndex: Record<string, string>; sections: HandbookSections } {
  const items: HandbookListItem[] = docs.map((doc) => {
    const read = reads[doc.id];
    return {
      id: doc.id,
      slug: doc.slug,
      href: handbookDocHref(doc.slug, asId),
      kind: doc.kind,
      title: doc.title,
      summary: doc.summary,
      version: doc.version,
      requiresAck: doc.requiresAck,
      status: readStatus(doc, read),
      readOn: read ? formatShortDate(read.acknowledgedAt, timeZone) : null,
    };
  });

  const searchIndex = Object.fromEntries(
    docs.map((doc) => [doc.id, `${doc.title}\n${doc.summary ?? ""}\n${doc.bodyMd}`.toLowerCase()]),
  );

  // Your role and department sections follow audience rules, so an owner or
  // admin sees their own JD, not every JD.
  const myDesignation = normaliseDesignation(designation);
  const yourRole =
    myDesignation === ""
      ? undefined
      : docs.find(
          (doc) => doc.kind === "jd" && normaliseDesignation(doc.jdDesignation) === myDesignation,
        );

  const departments = departmentIds
    .map((departmentId) => ({
      id: departmentId,
      name: departmentNames.get(departmentId) ?? "Your department",
      docIds: docs
        .filter(
          (doc) =>
            doc.kind === "sop" &&
            doc.audiences.some(
              (rule) => rule.kind === "department" && rule.value === departmentId,
            ),
        )
        .map((doc) => doc.id),
    }))
    .filter((department) => department.docIds.length > 0)
    .sort((a, b) => a.name.localeCompare(b.name));

  const policies = docs.filter((doc) => doc.kind === "policy" || doc.kind === "guide");
  const shown = new Set([
    ...(yourRole ? [yourRole.id] : []),
    ...departments.flatMap((department) => department.docIds),
    ...policies.map((doc) => doc.id),
  ]);

  const alerts: HandbookAlert[] = docs
    .filter((doc) => {
      const read = reads[doc.id];
      return doc.requiresAck && read && read.version < doc.version;
    })
    .map((doc) => ({
      id: doc.id,
      slug: doc.slug,
      href: handbookDocHref(doc.slug, asId),
      title: doc.title,
      updatedOn: formatShortDate(doc.publishedAt ?? doc.updatedAt, timeZone),
      changeNote: doc.changeNote,
    }));

  return {
    items,
    searchIndex,
    sections: {
      alerts,
      startHere: docs.filter((doc) => doc.startHere).map((doc) => doc.id),
      yourRole: yourRole?.id ?? null,
      departments,
      policies: policies.map((doc) => doc.id),
      other: docs.filter((doc) => !shown.has(doc.id)).map((doc) => doc.id),
    },
  };
}
