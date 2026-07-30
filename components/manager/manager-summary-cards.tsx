import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

function SummaryCard({ label, value }: { label: string; value: number }) {
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
  totalEmployees,
  submittedToday,
  missingToday,
}: {
  totalEmployees: number;
  submittedToday: number;
  missingToday: number;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <SummaryCard label="Total Employees" value={totalEmployees} />
      <SummaryCard label="Reports Submitted Today" value={submittedToday} />
      <SummaryCard label="Missing Reports Today" value={missingToday} />
    </div>
  );
}
