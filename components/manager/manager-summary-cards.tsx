import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

function SummaryCard({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <Card>
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-3xl">{value}</CardTitle>
      </CardHeader>
    </Card>
  );
}

export function ManagerSummaryCards({
  teamSize,
  submittedToday,
  missingToday,
  completionPercentage,
  averageSubmissionTime,
  lateSubmissions,
}: {
  teamSize: number;
  submittedToday: number;
  missingToday: number;
  completionPercentage: number;
  averageSubmissionTime: string | null;
  lateSubmissions: number;
}) {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
      <SummaryCard label="Team Size" value={teamSize} />
      <SummaryCard label="Submitted Today" value={submittedToday} />
      <SummaryCard label="Missing Today" value={missingToday} />
      <SummaryCard label="Completion" value={`${completionPercentage}%`} />
      <SummaryCard
        label="Avg. Submission Time"
        value={averageSubmissionTime ?? "—"}
      />
      <SummaryCard label="Late Submissions" value={lateSubmissions} />
    </div>
  );
}
