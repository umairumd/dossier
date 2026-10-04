import type { ReactNode } from "react";
import { BotAvatar } from "@/components/shared/bot-avatar";
import type { BotExpression } from "@/components/shared/bot-avatar";
import { DashboardGreeting } from "@/components/dashboard/dashboard-greeting";

export interface HeroStat {
  label: string;
  value: string;
}

interface DashboardHeroProps {
  userId: string;
  name: string;
  designation?: string | null;
  departmentNames?: string[];
  contextLine: ReactNode;
  stats?: HeroStat[];
  expression?: BotExpression;
  /** Adaptive report-action row (submit / submitted) below the hero body. */
  reportStatus?: ReactNode;
}

export function DashboardHero({
  userId,
  name,
  designation,
  departmentNames,
  contextLine,
  stats,
  expression,
  reportStatus,
}: DashboardHeroProps) {
  const meta = [designation, departmentNames?.join(", ")]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="card-gradient flex flex-col gap-6 rounded-xl p-6 ring-1 ring-foreground/10">
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between md:gap-8">
        {/* Left: avatar + identity */}
        <div className="flex items-center gap-5">
          <BotAvatar
            userId={userId}
            size={96}
            interactive={true}
            expression={expression}
          />
          <div className="flex min-w-0 flex-col gap-0.5">
            <DashboardGreeting name={name} />
            {meta && (
              <p className="truncate text-sm text-muted-foreground">{meta}</p>
            )}
            {typeof contextLine === "string" ? (
              <p className="mt-1 text-sm text-foreground/70">{contextLine}</p>
            ) : (
              <div className="mt-1 flex flex-wrap items-center gap-2">
                {contextLine}
              </div>
            )}
          </div>
        </div>

        {/* Right: stat grid */}
        {stats && stats.length > 0 && (
          <div className="grid shrink-0 grid-cols-2 gap-x-8 gap-y-4">
            {stats.map((stat) => (
              <div key={stat.label} className="flex flex-col gap-0.5">
                <span className="label-eyebrow">{stat.label}</span>
                <span className="text-xl font-semibold tracking-tight">
                  {stat.value}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {reportStatus}
    </div>
  );
}
