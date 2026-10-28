import { HandbookComingSoon } from "@/components/handbook/coming-soon";
import { HandbookHome } from "@/components/handbook/handbook-home";
import { HandbookLaunchBanner } from "@/components/handbook/launch-banner";
import { HandbookViewAsBanner } from "@/components/handbook/view-as-banner";
import { HandbookViewAsPicker } from "@/components/handbook/view-as-picker";
import { WhoToAskCard } from "@/components/handbook/who-to-ask-card";
import { countHandbookLaunchAudience } from "@/lib/actions/admin/handbook";
import { formatShortDate } from "@/lib/handbook/format";
import { buildHandbookHome } from "@/lib/handbook/home-view";
import {
  describeViewAs,
  docsVisibleTo,
  isHandbookAdmin,
  readsFor,
  resolveHandbookViewAs,
} from "@/lib/handbook/view-as";
import { getRoleLabel } from "@/lib/helpers/role-labels";
import { getHandbookPeoplePool } from "@/lib/supabase/queries/admin/handbook";
import {
  getDepartmentNameMap,
  getMyHandbookReads,
  getReadableHandbookDocs,
} from "@/lib/supabase/queries/handbook";
import {
  getMyPeopleDirectory,
  getPeopleDirectoryFor,
} from "@/lib/supabase/queries/member/people";
import { getOrganizationSettings } from "@/lib/supabase/queries/organization-settings";
import { getCurrentProfile } from "@/lib/supabase/queries/profile";

export default async function HandbookPage({
  searchParams,
}: {
  searchParams: Promise<{ as?: string | string[] }>;
}) {
  const [{ as }, profile, settings] = await Promise.all([
    searchParams,
    getCurrentProfile(),
    getOrganizationSettings(),
  ]);
  if (!profile) return null;

  const isAdmin = isHandbookAdmin(profile.role);
  if (!isAdmin && !settings.handbookLaunchedAt) {
    return <HandbookComingSoon />;
  }

  const timeZone = settings.timezone;
  const viewAs = await resolveHandbookViewAs(profile.role, as);

  const viewAsPicker = (people: Awaited<ReturnType<typeof getHandbookPeoplePool>>) => (
    <HandbookViewAsPicker
      people={people
        .filter((person) => person.id !== profile.id)
        .map((person) => ({
          id: person.id,
          name: person.full_name,
          detail: person.designation?.trim() || getRoleLabel(person.role),
        }))}
    />
  );

  if (viewAs) {
    const [allDocs, reads, directory, departmentNames, people] = await Promise.all([
      getReadableHandbookDocs(),
      readsFor(viewAs.id),
      getPeopleDirectoryFor(viewAs.id),
      getDepartmentNameMap(),
      getHandbookPeoplePool(),
    ]);
    const firstName = viewAs.full_name.split(" ")[0] ?? viewAs.full_name;
    const view = buildHandbookHome({
      docs: docsVisibleTo(viewAs, allDocs),
      reads,
      designation: viewAs.designation,
      departmentIds: viewAs.department_ids,
      departmentNames,
      timeZone,
      asId: viewAs.id,
    });
    return (
      <HandbookHome
        {...view}
        readerName={firstName}
        headerAction={viewAsPicker(people)}
        banner={
          <HandbookViewAsBanner
            name={viewAs.full_name}
            details={describeViewAs(viewAs, departmentNames)}
            stopHref="/handbook"
          />
        }
        aside={<WhoToAskCard directory={directory} />}
      />
    );
  }

  const [docs, reads, directory, departmentNames, people, launchAudience] = await Promise.all([
    getReadableHandbookDocs(),
    getMyHandbookReads(),
    getMyPeopleDirectory(),
    getDepartmentNameMap(),
    isAdmin ? getHandbookPeoplePool() : Promise.resolve([]),
    isAdmin && !settings.handbookLaunchedAt
      ? countHandbookLaunchAudience()
      : Promise.resolve({ count: 0 }),
  ]);

  const view = buildHandbookHome({
    docs,
    reads,
    designation: profile.designation,
    departmentIds: profile.department_ids,
    departmentNames,
    timeZone,
  });

  return (
    <HandbookHome
      {...view}
      headerAction={isAdmin ? viewAsPicker(people) : undefined}
      banner={
        isAdmin ? (
          <HandbookLaunchBanner
            launchedOn={
              settings.handbookLaunchedAt
                ? formatShortDate(settings.handbookLaunchedAt, timeZone)
                : null
            }
            notifyCount={launchAudience.count}
          />
        ) : undefined
      }
      aside={<WhoToAskCard directory={directory} />}
    />
  );
}
