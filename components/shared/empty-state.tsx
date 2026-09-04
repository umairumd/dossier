import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const ILLUSTRATION_CLASS = "size-20 text-muted-foreground/30";

type EmptyIllustration =
  | "reports"
  | "team"
  | "departments"
  | "employees"
  | "invitations"
  | "search"
  | "submitted";

function EmptyIllustrationSvg({
  illustration,
}: {
  illustration: EmptyIllustration;
}) {
  switch (illustration) {
    case "reports":
      return (
        <svg viewBox="0 0 80 80" className={ILLUSTRATION_CLASS}>
          <rect
            x="15"
            y="10"
            width="50"
            height="60"
            rx="4"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          />
          <line
            x1="25"
            y1="28"
            x2="55"
            y2="28"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <line
            x1="25"
            y1="38"
            x2="55"
            y2="38"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <line
            x1="25"
            y1="48"
            x2="45"
            y2="48"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      );
    case "team":
      return (
        <svg viewBox="0 0 80 80" className={ILLUSTRATION_CLASS}>
          <circle
            cx="30"
            cy="28"
            r="12"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          />
          <path
            d="M8 65 C8 50 52 50 52 65"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <circle
            cx="54"
            cy="26"
            r="10"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          />
          <path
            d="M34 63 C38 52 72 52 72 65"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      );
    case "departments":
      return (
        <svg viewBox="0 0 80 80" className={ILLUSTRATION_CLASS}>
          <rect
            x="30"
            y="8"
            width="20"
            height="14"
            rx="3"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          />
          <line
            x1="40"
            y1="22"
            x2="40"
            y2="36"
            stroke="currentColor"
            strokeWidth="2"
          />
          <line
            x1="16"
            y1="36"
            x2="64"
            y2="36"
            stroke="currentColor"
            strokeWidth="2"
          />
          <line
            x1="16"
            y1="36"
            x2="16"
            y2="46"
            stroke="currentColor"
            strokeWidth="2"
          />
          <line
            x1="40"
            y1="36"
            x2="40"
            y2="46"
            stroke="currentColor"
            strokeWidth="2"
          />
          <line
            x1="64"
            y1="36"
            x2="64"
            y2="46"
            stroke="currentColor"
            strokeWidth="2"
          />
          <rect
            x="6"
            y="46"
            width="20"
            height="14"
            rx="3"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          />
          <rect
            x="30"
            y="46"
            width="20"
            height="14"
            rx="3"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          />
          <rect
            x="54"
            y="46"
            width="20"
            height="14"
            rx="3"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          />
        </svg>
      );
    case "employees":
      return (
        <svg viewBox="0 0 80 80" className={ILLUSTRATION_CLASS}>
          <circle
            cx="40"
            cy="26"
            r="14"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          />
          <path
            d="M10 72 C10 52 70 52 70 72"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      );
    case "invitations":
      return (
        <svg viewBox="0 0 80 80" className={ILLUSTRATION_CLASS}>
          <rect
            x="10"
            y="22"
            width="60"
            height="40"
            rx="4"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          />
          <path
            d="M10 26 L40 46 L70 26"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "search":
      return (
        <svg viewBox="0 0 80 80" className={ILLUSTRATION_CLASS}>
          <circle
            cx="34"
            cy="34"
            r="18"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          />
          <line
            x1="47"
            y1="47"
            x2="66"
            y2="66"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        </svg>
      );
    case "submitted":
      return (
        <svg viewBox="0 0 80 80" className={ILLUSTRATION_CLASS}>
          <circle
            cx="40"
            cy="40"
            r="28"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          />
          <path
            d="M26 40 L36 50 L54 30"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
  }
}

function illustrationForTeamEmpty(message: string): EmptyIllustration | undefined {
  if (/submitted/i.test(message)) {
    return "submitted";
  }
  if (/no employees|no team|no one/i.test(message)) {
    return "team";
  }
  return undefined;
}

export function EmptyState({
  icon,
  illustration,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode;
  illustration?: EmptyIllustration;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 py-10 text-center",
        className,
      )}
    >
      {illustration ? (
        <EmptyIllustrationSvg illustration={illustration} />
      ) : icon ? (
        <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
          {icon}
        </div>
      ) : null}
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium">{title}</p>
        {description && (
          <p className="max-w-[260px] text-xs text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}

export { illustrationForTeamEmpty };
export type { EmptyIllustration };
