import { Users } from "lucide-react";
import { PersonCell } from "@/components/shared/data-list";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent, CardTitleHeader } from "@/components/ui/card";
import { getRoleLabel } from "@/lib/helpers/role-labels";
import type { MyPeopleDirectory } from "@/lib/supabase/queries/member/people";

function Section({
  title,
  people,
}: {
  title: string;
  people: MyPeopleDirectory["leadership"];
}) {
  if (people.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {title}
      </p>
      <ul className="flex flex-col gap-3">
        {people.map((person) => (
          <li key={person.id}>
            <PersonCell
              id={person.id}
              name={person.full_name}
              avatar={person.avatar}
              detail={person.designation?.trim() || getRoleLabel(person.role)}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

export function YourPeopleCard({ directory }: { directory: MyPeopleDirectory }) {
  const { leadership, managers, supervisors } = directory;
  const empty =
    leadership.length === 0 &&
    managers.length === 0 &&
    supervisors.length === 0;

  return (
    <Card className="rise-in">
      <CardTitleHeader title="Your people" />
      <CardContent className="flex flex-col gap-5">
        {empty ? (
          <EmptyState
            size="sm"
            icon={<Users className="size-4" />}
            title="No manager or leadership listed yet."
          />
        ) : (
          <>
            <Section title="Leadership" people={leadership} />
            <Section title="Manager" people={managers} />
            <Section title="Supervisors" people={supervisors} />
          </>
        )}
      </CardContent>
    </Card>
  );
}
