import { getRoleLabel } from "@/lib/helpers/role-labels";
import type {
  HandbookAudience,
  HandbookAudienceKind,
  HandbookKind,
} from "@/types/handbook";

// Same rules as public.can_read_handbook_doc() for people who are not owners
// or admins. Used for the editor's live count, publish notifications, read
// progress and the reader's own sections. Keep the two in step.

export interface AudiencePerson {
  id: string;
  role: string;
  designation: string | null;
  employment_type: "full_time" | "part_time";
  is_remote: boolean;
  department_ids: string[];
  is_supervisor: boolean;
}

export function normaliseDesignation(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

export function matchesHandbookAudience(
  person: AudiencePerson,
  doc: {
    kind: HandbookKind;
    jdDesignation: string | null;
    audiences: HandbookAudience[];
  },
): boolean {
  const designation = normaliseDesignation(person.designation);

  if (doc.audiences.length === 0) {
    return (
      doc.kind === "jd" &&
      designation !== "" &&
      designation === normaliseDesignation(doc.jdDesignation)
    );
  }

  return doc.audiences.some((rule) => {
    switch (rule.kind) {
      case "everyone":
        return true;
      case "profile":
        return rule.value === person.id;
      case "role":
        return (
          rule.value === person.role ||
          (rule.value === "supervisor" && person.is_supervisor)
        );
      case "department":
        return rule.value != null && person.department_ids.includes(rule.value);
      case "designation":
        return designation !== "" && normaliseDesignation(rule.value) === designation;
      case "employment_type":
        return rule.value === person.employment_type;
      case "work_location":
        return rule.value === (person.is_remote ? "remote" : "on_site");
      default:
        return false;
    }
  });
}

/** Rules in a stable order, without duplicates. */
export function normaliseAudiences(audiences: HandbookAudience[]): HandbookAudience[] {
  const order: HandbookAudienceKind[] = [
    "everyone",
    "department",
    "role",
    "designation",
    "employment_type",
    "work_location",
    "profile",
  ];
  const seen = new Set<string>();
  const out: HandbookAudience[] = [];
  for (const rule of audiences) {
    const value = rule.kind === "everyone" ? null : (rule.value ?? "").trim();
    if (rule.kind !== "everyone" && !value) continue;
    const key = `${rule.kind}:${rule.kind === "designation" ? normaliseDesignation(value) : value}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ kind: rule.kind, value });
  }
  return out.sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind));
}

export const ROLE_AUDIENCE_LABELS: Record<string, string> = {
  owner: "Owners",
  admin: "Admins",
  manager: "Managers",
  supervisor: "Supervisors",
  member: "Members",
};

export const EMPLOYMENT_LABELS: Record<string, string> = {
  full_time: "Full-time",
  part_time: "Part-time",
};

export const LOCATION_LABELS: Record<string, string> = {
  remote: "Remote",
  on_site: "On-site",
};

/** One chip label for a rule. */
export function audienceLabel(
  rule: HandbookAudience,
  lookups: {
    departmentNames?: Map<string, string>;
    personNames?: Map<string, string>;
  } = {},
): string {
  const value = rule.value ?? "";
  switch (rule.kind) {
    case "everyone":
      return "Everyone";
    case "department":
      return lookups.departmentNames?.get(value) ?? "A department";
    case "role":
      return ROLE_AUDIENCE_LABELS[value] ?? getRoleLabel(value);
    case "designation":
      return value;
    case "employment_type":
      return EMPLOYMENT_LABELS[value] ?? value;
    case "work_location":
      return LOCATION_LABELS[value] ?? value;
    case "profile":
      return lookups.personNames?.get(value) ?? "A person";
  }
}

/** "Everyone", "Engineering, Design, Managers", "Engineering and 2 people". */
export function summariseAudience(
  doc: { kind: HandbookKind; jdDesignation: string | null; audiences: HandbookAudience[] },
  lookups: {
    departmentNames?: Map<string, string>;
    personNames?: Map<string, string>;
  } = {},
): string {
  const rules = normaliseAudiences(doc.audiences);
  if (rules.length === 0) {
    return doc.kind === "jd" && doc.jdDesignation?.trim()
      ? doc.jdDesignation.trim()
      : "Owners and admins only";
  }
  if (rules.some((rule) => rule.kind === "everyone")) return "Everyone";

  const people = rules.filter((rule) => rule.kind === "profile");
  const parts = rules
    .filter((rule) => rule.kind !== "profile")
    .map((rule) => audienceLabel(rule, lookups));
  if (people.length > 0) {
    const name =
      people.length === 1 ? lookups.personNames?.get(people[0].value ?? "") : undefined;
    parts.push(name ?? `${people.length} ${people.length === 1 ? "person" : "people"}`);
  }
  if (parts.length <= 3) return parts.join(", ");
  return `${parts.slice(0, 2).join(", ")} and ${parts.length - 2} more`;
}
