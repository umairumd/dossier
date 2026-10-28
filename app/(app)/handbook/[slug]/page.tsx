import { notFound, redirect } from "next/navigation";
import { AckBar } from "@/components/handbook/ack-bar";
import { HandbookKindTag } from "@/components/handbook/kind-tag";
import { MarkOpened } from "@/components/handbook/mark-opened";
import { HandbookComingSoon } from "@/components/handbook/coming-soon";
import { MarkdownBody } from "@/components/handbook/markdown-body";
import { HandbookViewAsBanner } from "@/components/handbook/view-as-banner";
import { BreadcrumbLabel } from "@/components/layout/breadcrumb-label";
import {
  EMPLOYMENT_LABELS,
  normaliseDesignation,
  summariseAudience,
} from "@/lib/handbook/audience";
import {
  UUID_PATTERN,
  extractOutline,
  formatLongDate,
  readingMinutes,
} from "@/lib/handbook/format";
import {
  getDepartmentNameMap,
  getHandbookDocBySlug,
  getHandbookSlugById,
  getMyHandbookReads,
} from "@/lib/supabase/queries/handbook";
import {
  describeViewAs,
  docsVisibleTo,
  isHandbookAdmin,
  readsFor,
  resolveHandbookViewAs,
} from "@/lib/handbook/view-as";
import {
  getMyPeopleDirectory,
  getPeopleDirectoryFor,
} from "@/lib/supabase/queries/member/people";
import { getOrganizationSettings } from "@/lib/supabase/queries/organization-settings";
import { getCurrentProfileWithDepartment } from "@/lib/supabase/queries/profile";

export default async function HandbookDocPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ as?: string | string[] }>;
}) {
  const [{ slug }, { as }] = await Promise.all([params, searchParams]);

  // Notification links carry the doc id.
  if (UUID_PATTERN.test(slug)) {
    const resolved = await getHandbookSlugById(slug);
    if (!resolved) notFound();
    redirect(`/handbook/${resolved}`);
  }

  const [profile, settings] = await Promise.all([
    getCurrentProfileWithDepartment(),
    getOrganizationSettings(),
  ]);
  if (!profile) notFound();
  if (!isHandbookAdmin(profile.role) && !settings.handbookLaunchedAt) {
    return <HandbookComingSoon />;
  }

  const viewAs = await resolveHandbookViewAs(profile.role, as);

  const [doc, reads, departmentNames, directory] = await Promise.all([
    getHandbookDocBySlug(slug),
    viewAs ? readsFor(viewAs.id) : getMyHandbookReads(),
    getDepartmentNameMap(),
    viewAs ? getPeopleDirectoryFor(viewAs.id) : getMyPeopleDirectory(),
  ]);

  if (!doc) notFound();
  if (viewAs && docsVisibleTo(viewAs, [doc]).length === 0) notFound();

  // Whose handbook this is: the signed-in person, or the person an owner or
  // admin is viewing as.
  const reader = viewAs
    ? {
        designation: viewAs.designation,
        departmentNames: viewAs.department_ids
          .map((id) => departmentNames.get(id))
          .filter((name): name is string => Boolean(name)),
        employmentType: viewAs.employment_type,
      }
    : {
        designation: profile.designation,
        departmentNames: profile.department_names,
        employmentType: profile.employment_type,
      };
  const viewAsFirstName = viewAs ? (viewAs.full_name.split(" ")[0] ?? viewAs.full_name) : null;

  const timeZone = settings.timezone;
  const read = reads[doc.id];
  const readOlder = read && read.version < doc.version ? read : null;
  const confirmedCurrent = read && read.version >= doc.version ? read.acknowledgedAt : null;
  const outline = extractOutline(doc.bodyMd);
  const minutes = readingMinutes(doc.bodyMd);

  const isOwnJd =
    doc.kind === "jd" &&
    normaliseDesignation(reader.designation) !== "" &&
    normaliseDesignation(reader.designation) === normaliseDesignation(doc.jdDesignation);

  const jdDepartments = doc.audiences
    .filter((rule) => rule.kind === "department" && rule.value)
    .map((rule) => departmentNames.get(rule.value!))
    .filter((name): name is string => Boolean(name));
  const jdEmployment = doc.audiences
    .filter((rule) => rule.kind === "employment_type" && rule.value)
    .map((rule) => EMPLOYMENT_LABELS[rule.value!]);

  const jdDetails =
    doc.kind === "jd"
      ? [
          {
            label: jdDepartments.length > 1 ? "Departments" : "Department",
            value:
              jdDepartments.join(", ") ||
              (isOwnJd ? reader.departmentNames.join(", ") : ""),
          },
          {
            label: "Reports to",
            value: isOwnJd
              ? (directory?.managers[0]?.full_name ?? "")
              : "",
          },
          {
            label: "Employment",
            value:
              jdEmployment.join(" or ") ||
              (isOwnJd ? EMPLOYMENT_LABELS[reader.employmentType] : ""),
          },
        ]
      : [];

  const audience = summariseAudience(doc, { departmentNames });
  const audienceLine = audience === "Everyone" ? "For everyone" : `For ${audience}`;

  const meta = [
    `Version ${doc.version}`,
    doc.publishedAt
      ? `Updated ${formatLongDate(doc.publishedAt, timeZone)}${doc.publishedByName ? ` by ${doc.publishedByName}` : ""}`
      : null,
    `${minutes} min read`,
  ].filter(Boolean);

  return (
    <div className="flex flex-col gap-6">
      <BreadcrumbLabel label={doc.title} />
      {viewAs ? (
        <HandbookViewAsBanner
          name={viewAs.full_name}
          details={describeViewAs(viewAs, departmentNames)}
          stopHref={`/handbook/${doc.slug}`}
        />
      ) : null}
      {!viewAs && !doc.requiresAck && !confirmedCurrent ? <MarkOpened docId={doc.id} /> : null}

      <div className="grid grid-cols-1 gap-10 xl:grid-cols-[minmax(0,1fr)_14rem]">
        <article className="flex min-w-0 flex-col gap-6">
          <header className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2 text-[13px] text-muted-foreground">
              <HandbookKindTag kind={doc.kind} />
              <span>{audienceLine}</span>
            </div>
            <h1 className="text-2xl font-semibold tracking-tight">{doc.title}</h1>
            {doc.summary ? (
              <p className="text-[15px] text-muted-foreground">{doc.summary}</p>
            ) : null}
            <p className="text-[13px] text-muted-foreground tabular-nums">{meta.join(" · ")}</p>
          </header>

          {readOlder ? (
            <div className="rounded-xl bg-warn/8 px-4 py-3 text-sm ring-1 ring-inset ring-warn/30">
              <span className="font-medium text-warn">What changed in v{doc.version}:</span>{" "}
              {doc.changeNote ?? "No note was left for this version."}
            </div>
          ) : null}

          {jdDetails.length > 0 ? (
            <dl className="grid grid-cols-1 gap-4 rounded-xl bg-fill-subtle p-4 ring-1 ring-inset ring-edge sm:grid-cols-3">
              {jdDetails.map((detail) => (
                <div key={detail.label} className="flex min-w-0 flex-col gap-1">
                  <dt className="field-label">{detail.label}</dt>
                  <dd className="text-sm font-medium">{detail.value || "—"}</dd>
                </div>
              ))}
            </dl>
          ) : null}

          <MarkdownBody markdown={doc.bodyMd} steps={doc.kind === "sop"} className="max-w-[72ch]" />

          {doc.requiresAck && viewAs ? (
            <p className="rounded-xl bg-fill-subtle px-4 py-3 text-sm ring-1 ring-inset ring-edge">
              {confirmedCurrent
                ? `${viewAsFirstName} confirmed v${doc.version} on ${formatLongDate(confirmedCurrent, timeZone)}.`
                : readOlder
                  ? `${viewAsFirstName} confirmed v${readOlder.version} but hasn't confirmed v${doc.version} yet.`
                  : `${viewAsFirstName} hasn't confirmed v${doc.version} yet.`}
            </p>
          ) : doc.requiresAck ? (
            <AckBar
              docId={doc.id}
              version={doc.version}
              confirmedAt={confirmedCurrent}
              timeZone={timeZone}
            />
          ) : null}
        </article>

        {outline.length > 1 ? (
          <nav aria-label="On this page" className="hidden xl:block">
            <div className="sticky top-6 flex flex-col gap-2">
              <p className="text-[13px] font-medium">On this page</p>
              <ul className="flex flex-col gap-1.5 border-l border-line">
                {outline.map((item) => (
                  <li key={item.id}>
                    <a
                      href={`#${item.id}`}
                      className="-ml-px block border-l border-transparent pl-3 text-[13px] text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground"
                    >
                      {item.text}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </nav>
        ) : null}
      </div>
    </div>
  );
}
