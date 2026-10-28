import { cache } from "react";
import { EMPLOYMENT_LABELS, LOCATION_LABELS, matchesHandbookAudience } from "@/lib/handbook/audience";
import { UUID_PATTERN } from "@/lib/handbook/format";
import { latestReads } from "@/lib/handbook/home-view";
import {
  getHandbookAcks,
  getHandbookPeoplePool,
  type HandbookPoolPerson,
} from "@/lib/supabase/queries/admin/handbook";
import { getRoleLabel } from "@/lib/helpers/role-labels";
import type { HandbookDoc, HandbookReadState } from "@/types/handbook";

export function isHandbookAdmin(role: string | null | undefined): boolean {
  return role === "owner" || role === "admin";
}

/**
 * The person an owner or admin is viewing the handbook as, from ?as=.
 * Null for anyone else, a bad id, or someone outside the organization.
 */
export const resolveHandbookViewAs = cache(
  async (
    viewerRole: string | null | undefined,
    asParam: string | string[] | undefined,
  ): Promise<HandbookPoolPerson | null> => {
    const as = Array.isArray(asParam) ? asParam[0] : asParam;
    if (!as || !UUID_PATTERN.test(as) || !isHandbookAdmin(viewerRole)) return null;
    const pool = await getHandbookPeoplePool();
    return pool.find((person) => person.id === as) ?? null;
  },
);

/** Published docs that person can read once the handbook is launched. */
export function docsVisibleTo(person: HandbookPoolPerson, docs: HandbookDoc[]): HandbookDoc[] {
  if (isHandbookAdmin(person.role)) return docs;
  return docs.filter((doc) => matchesHandbookAudience(person, doc));
}

/** That person's latest read per doc. */
export async function readsFor(profileId: string): Promise<Record<string, HandbookReadState>> {
  const acks = await getHandbookAcks();
  return latestReads(acks.filter((row) => row.profile_id === profileId));
}

/** "Content Writer, Marketing, Remote" for the banner. */
export function describeViewAs(
  person: HandbookPoolPerson,
  departmentNames: Map<string, string>,
): string {
  return [
    person.designation?.trim() || getRoleLabel(person.role),
    ...person.department_ids.map((id) => departmentNames.get(id)).filter(Boolean),
    EMPLOYMENT_LABELS[person.employment_type],
    LOCATION_LABELS[person.is_remote ? "remote" : "on_site"],
  ]
    .filter(Boolean)
    .join(", ");
}
