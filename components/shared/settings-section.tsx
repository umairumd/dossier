import type { FormEvent, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Form pattern (Settings, Organization): the section name and explanation on
// the left, fields on the right, one save bar along the bottom. Pass
// `onSubmit` to make the whole section the <form>.
export function SettingsSection({
  title,
  description,
  aside,
  footer,
  onSubmit,
  className,
  children,
}: {
  title: string;
  description?: ReactNode;
  /** Extra content under the description (e.g. a button). */
  aside?: ReactNode;
  footer?: ReactNode;
  onSubmit?: (event: FormEvent<HTMLFormElement>) => void;
  className?: string;
  children: ReactNode;
}) {
  const body = (
    <>
      <div className="grid gap-x-10 gap-y-5 p-5 md:grid-cols-[minmax(0,15rem)_minmax(0,1fr)] md:p-6">
        <div className="flex flex-col gap-1">
          <h2 className="text-[15px] font-semibold tracking-tight">{title}</h2>
          {description ? (
            <p className="text-[13px] leading-relaxed text-muted-foreground">{description}</p>
          ) : null}
          {aside ? <div className="mt-3">{aside}</div> : null}
        </div>
        <div className="flex min-w-0 flex-col gap-5">{children}</div>
      </div>
      {footer}
    </>
  );
  const shell = cn("surface-card overflow-hidden rounded-xl bg-card", className);
  return onSubmit ? (
    <form onSubmit={onSubmit} className={shell} noValidate>
      {body}
    </form>
  ) : (
    <section className={shell}>{body}</section>
  );
}

/** Bottom bar of a form section: Cancel (when there are changes) and Save. */
export function SaveBar({
  dirty,
  pending,
  onReset,
  label = "Save changes",
  pendingLabel = "Saving…",
  hint,
}: {
  dirty: boolean;
  pending: boolean;
  onReset?: () => void;
  label?: string;
  pendingLabel?: string;
  hint?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-end gap-2 border-t border-foreground/[0.08] bg-foreground/[0.015] px-5 py-3 md:px-6">
      {hint ? <span className="mr-auto text-xs text-muted-foreground">{hint}</span> : null}
      {dirty && onReset ? (
        <Button type="button" variant="ghost" onClick={onReset} disabled={pending}>
          Cancel
        </Button>
      ) : null}
      <Button type="submit" disabled={!dirty || pending}>
        {pending ? pendingLabel : label}
      </Button>
    </div>
  );
}

/** Label, control and a muted hint. */
export function Field({
  label,
  htmlFor,
  hint,
  error,
  children,
}: {
  label: ReactNode;
  htmlFor?: string;
  hint?: ReactNode;
  error?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-[13px] font-medium">
        {label}
      </label>
      {children}
      {error ? (
        <p className="text-xs text-destructive">{error}</p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}
