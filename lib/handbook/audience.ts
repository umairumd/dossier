import { getRoleLabel } from "@/lib/helpers/role-labels";
import type {
  HandbookAudience,
  HandbookAudienceKind,
  HandbookKind,
} from "@/types/handbook";

// Same rules as public.audience_matches() in the database, used by
// can_read_handbook_doc() and can_read_notice() for people who are not owners
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

  // Different kinds narrow, the same kind widens, people are added:
  //   Marketing + Project Manager      = project managers in Marketing
  //   Marketing + Development          = both departments
  //   ... + a person                   = that person as well
  if (doc.audiences.some((rule) => rule.kind === "everyone")) return true;
  if (doc.audiences.some((rule) => rule.kind === "profile" && rule.value === person.id)) return true;

  const byKind = new Map<HandbookAudienceKind, HandbookAudience[]>();
  for (const rule of doc.audiences) {
    if (rule.kind === "everyone" || rule.kind === "profile") continue;
    byKind.set(rule.kind, [...(byKind.get(rule.kind) ?? []), rule]);
  }
  if (byKind.size === 0) return false;

  return [...byKind.values()].every((rules) => rules.some((rule) => ruleMatches(person, rule, designation)));
}

function ruleMatches(person: AudiencePerson, rule: HandbookAudience, designation: string): boolean {
  switch (rule.kind) {
    case "role":
      return rule.value === person.role || (rule.value === "supervisor" && person.is_supervisor);
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

function joinOr(list: string[]): string {
  if (list.length <= 2) return list.join(" or ");
  return `${list.slice(0, -1).join(", ")} or ${list[list.length - 1]}`;
}

/**
 * The rule in words, as the reader will get it:
 * "Project Manager in Marketing, full-time, plus Umair Umar".
 */
export function describeAudience(
  audiences: HandbookAudience[],
  lookups: {
    departmentNames?: Map<string, string>;
    personNames?: Map<string, string>;
  } = {},
  options: { maxPeople?: number } = {},
): string {
  const rules = normaliseAudiences(audiences);
  if (rules.length === 0) return "";
  if (rules.some((rule) => rule.kind === "everyone")) return "Everyone";
  const of = (kind: HandbookAudienceKind) =>
    rules.filter((rule) => rule.kind === kind).map((rule) => audienceLabel(rule, lookups));

  const designations = of("designation");
  const roles = of("role");
  const departments = of("department");
  const extras = [of("employment_type"), of("work_location")]
    .filter((list) => list.length > 0)
    .map((list) => joinOr(list).toLowerCase());

  let text = "";
  if (designations.length || roles.length || departments.length || extras.length) {
    text =
      designations.length && roles.length
        ? `${joinOr(designations)} (${joinOr(roles).toLowerCase()})`
        : designations.length
          ? joinOr(designations)
          : roles.length
            ? joinOr(roles)
            : "Everyone";
    if (departments.length) text += ` in ${joinOr(departments)}`;
    if (extras.length) text += `, ${extras.join(", ")}`;
  }

  const people = of("profile");
  if (people.length) {
    const max = options.maxPeople ?? 2;
    const names =
      people.length <= max
        ? people.join(" and ")
        : `${people.slice(0, max).join(", ")} and ${people.length - max} more`;
    text = text ? `${text}, plus ${names}` : names;
  }
  return text;
}

/** Short form for lists: "Everyone", "Designer in Marketing", "Marketing and 2 more". */
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
  return describeAudience(rules, lookups, { maxPeople: 1 });
}
