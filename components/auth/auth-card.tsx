import type { ReactNode } from "react";
import { LogOut } from "lucide-react";
import { SignOutForm } from "@/components/auth/sign-out-form";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

// Every signed-out screen (sign in, reset, first sign-in, account states):
// the logo comes from the (auth) layout, this is the card under it, and
// `footer` is a quiet link below the card.
export function AuthCard({
  title,
  description,
  footer,
  children,
}: {
  title: ReactNode;
  description?: ReactNode;
  footer?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <>
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-lg tracking-tight">{title}</CardTitle>
          {description ? <CardDescription>{description}</CardDescription> : null}
        </CardHeader>
        {children ? <CardContent>{children}</CardContent> : null}
      </Card>
      {footer ? (
        <div className="text-center text-[13px] text-muted-foreground [&_a]:underline-offset-4 [&_a:hover]:text-foreground [&_a:hover]:underline">
          {footer}
        </div>
      ) : null}
    </>
  );
}

/** Inline message at the top of an auth form. */
export function AuthNotice({
  tone = "neutral",
  children,
}: {
  tone?: "neutral" | "danger";
  children: ReactNode;
}) {
  return (
    <p
      role={tone === "danger" ? "alert" : "status"}
      className={cn(
        "rounded-lg px-3 py-2 text-[13px] leading-relaxed",
        tone === "danger"
          ? "bg-destructive/10 text-destructive"
          : "bg-foreground/[0.04] text-muted-foreground",
      )}
    >
      {children}
    </p>
  );
}

/** Sign-out button for the account-state screens. */
export function AuthSignOut() {
  return (
    <SignOutForm>
      <Button type="submit" variant="outline" className="w-full">
        <LogOut />
        Sign out
      </Button>
    </SignOutForm>
  );
}
