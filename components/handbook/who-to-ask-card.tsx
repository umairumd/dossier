import { Users } from "lucide-react";
import { PersonCell } from "@/components/shared/data-list";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardTitleHeader } from "@/components/ui/card";
import { getRoleLabel } from "@/lib/helpers/role-labels";
import type {
  DirectoryPerson,
  MyPeopleDirectory,
  TodayPresence,
} from "@/lib/supabase/queries/member/people";

const PRESENCE: Record<TodayPresence, { label: string; variant: "success" | "leave" | "neutral" }> = {
  in: { label: "In today", variant: "success" },
  leave: { label: "On leave", variant: "leave" },
  off: { label: "Off", variant: "neutral" },
};

type Entry = { person: DirectoryPerson; relation: string; fallback: string };

export function WhoToAskCard({
  directory,
  className,
}: {
  directory: MyPeopleDirectory;
  className?: string;
}) {
  const entries: Entry[] = [
    ...directory.managers.map((person) => ({
      person,
      relation: "Your manager",
      fallback: "your work and priorities",
    })),
    ...directory.supervisors.map((person) => ({
      person,
      relation: "Your supervisor",
      fallback: "reviews your daily reports",
    })),
    ...directory.leadership.map((person) => ({
      person,
      relation: getRoleLabel(person.role),
      fallback: "anything else",
    })),
  ];

  return (
    <Card className={className}>
      <CardTitleHeader title="Who to ask" />
      <CardContent>
        {entries.length === 0 ? (
          <EmptyState
            size="sm"
            icon={<Users className="size-4" />}
            title="No manager or leadership listed yet."
          />
        ) : (
          <ul className="flex flex-col gap-3">
            {entries.map(({ person, relation, fallback }) => {
              const presence = person.today ? PRESENCE[person.today] : null;
              return (
                <li key={person.id} className="flex items-center justify-between gap-3">
                  <PersonCell
                    id={person.id}
                    name={person.full_name}
                    avatar={person.avatar}
                    detail={person.ask_me_about ?? `${relation} · ${fallback}`}
                  />
                  {presence ? (
                    <Badge variant={presence.variant} className="shrink-0">
                      {presence.label}
                    </Badge>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
