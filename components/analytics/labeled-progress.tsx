import { Progress } from "@/components/ui/progress";

export function LabeledProgress({
  label,
  percentage,
}: {
  label: string;
  percentage: number;
}) {
  const clamped = Math.min(100, Math.max(0, percentage));

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{clamped}%</span>
      </div>
      <Progress value={clamped} />
    </div>
  );
}
