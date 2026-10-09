export function DateTile({ date }: { date: string }) {
  const parsed = new Date(`${date}T00:00:00Z`);
  const month = parsed.toLocaleDateString("en-US", {
    month: "short",
    timeZone: "UTC",
  });
  const day = parsed.getUTCDate();

  return (
    <div className="flex size-10 shrink-0 flex-col items-center justify-center gap-0.5 rounded-lg bg-foreground/[0.05] leading-none ring-1 ring-inset ring-foreground/10">
      <span className="text-[11px] leading-none font-medium text-muted-foreground uppercase">
        {month}
      </span>
      <span className="text-sm leading-none font-semibold tabular-nums text-foreground">
        {day}
      </span>
    </div>
  );
}
