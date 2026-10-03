export function DateTile({ date }: { date: string }) {
  const parsed = new Date(`${date}T00:00:00Z`);
  const month = parsed.toLocaleDateString("en-US", {
    month: "short",
    timeZone: "UTC",
  });
  const day = parsed.getUTCDate();

  return (
    <div className="flex h-9 w-9 shrink-0 flex-col items-center justify-center gap-0.5 rounded-lg bg-muted leading-none ring-1 ring-foreground/25">
      <span className="text-[9px] font-semibold uppercase leading-none tracking-wider text-foreground">
        {month}
      </span>
      <span className="text-[13px] font-bold leading-none tabular-nums text-foreground">
        {day}
      </span>
    </div>
  );
}
