import type { ReactNode } from "react";
import {
  HeroBuddy,
  HeroIntro,
  type HeroNotification,
} from "@/components/dashboard/hero-buddy";
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
  avatar: unknown;
  hasReport: boolean;
  isOffDay: boolean;
  onFullDayLeave: boolean;
  isBirthday: boolean;
  orgDate: string;
  currentStreak?: number;
  teamComplete?: boolean;
  unread: HeroNotification[];
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
  avatar,
  hasReport,
  isOffDay,
  onFullDayLeave,
  isBirthday,
  orgDate,
  currentStreak,
  teamComplete,
  unread,
  reportStatus,
}: DashboardHeroProps) {
  const meta = [designation, departmentNames?.join(", ")]
    .filter(Boolean)
    .join(" · ");

  return (
    <div
      data-hero-card
      className="card-gradient flex flex-col gap-6 overflow-visible rounded-xl p-6 ring-1 ring-foreground/10"
    >
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between md:gap-8">
        <div className="flex items-center gap-5">
          <HeroBuddy
            userId={userId}
            avatar={avatar}
            hasReport={hasReport}
            isOffDay={isOffDay}
            onFullDayLeave={onFullDayLeave}
            isBirthday={isBirthday}
            orgDate={orgDate}
            currentStreak={currentStreak}
            teamComplete={teamComplete}
            unread={unread}
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

      <HeroIntro />

      {reportStatus}
    </div>
  );
}
