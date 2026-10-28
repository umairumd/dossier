import { BookOpen } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";

export function HandbookComingSoon() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Handbook" description="Policies, how-tos and who to ask." />
      <Card>
        <CardContent>
          <EmptyState
            icon={<BookOpen className="size-5" />}
            title="The handbook is coming soon"
            description="HR is putting together policies, guides and your job description. You'll get a notification when it's ready."
          />
        </CardContent>
      </Card>
    </div>
  );
}
