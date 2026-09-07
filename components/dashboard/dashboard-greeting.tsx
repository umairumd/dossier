"use client";

export function DashboardGreeting({ name }: { name: string }) {
  const hour = new Date().getHours();
  let greeting: string;
  if (hour >= 5 && hour < 12) greeting = "Good morning";
  else if (hour >= 12 && hour < 17) greeting = "Good afternoon";
  else if (hour >= 17 && hour < 21) greeting = "Good evening";
  else greeting = "Working late,";

  return (
    <div className="flex flex-col gap-0.5">
      <p className="text-sm text-muted-foreground">{greeting}</p>
      <h1 className="text-2xl font-semibold tracking-tight">{name}</h1>
    </div>
  );
}
