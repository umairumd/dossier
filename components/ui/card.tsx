import * as React from "react"
import Link from "next/link"
import { ChevronRight } from "lucide-react"

import { cn } from "@/lib/utils"

function Card({
  className,
  size = "default",
  ...props
}: React.ComponentProps<"div"> & { size?: "default" | "sm" }) {
  return (
    <div
      data-slot="card"
      data-size={size}
      className={cn(
        "surface-card bg-card group/card flex flex-col gap-(--card-spacing) overflow-hidden rounded-xl py-(--card-spacing) text-sm text-card-foreground [--card-spacing:--spacing(5)] has-data-[slot=card-footer]:pb-0 has-[>img:first-child]:pt-0 data-[size=sm]:[--card-spacing:--spacing(3)] data-[size=sm]:has-data-[slot=card-footer]:pb-0 *:[img:first-child]:rounded-t-xl *:[img:last-child]:rounded-b-xl",
        className
      )}
      {...props}
    />
  )
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "group/card-header @container/card-header grid auto-rows-min items-start gap-1 rounded-t-xl px-(--card-spacing) has-data-[slot=card-action]:grid-cols-[1fr_auto] has-data-[slot=card-description]:grid-rows-[auto_auto] [.border-b]:pb-(--card-spacing)",
        className
      )}
      {...props}
    />
  )
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn(
        "font-heading text-base leading-snug font-medium tracking-tight group-data-[size=sm]/card:text-sm",
        className
      )}
      {...props}
    />
  )
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        className
      )}
      {...props}
    />
  )
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("px-(--card-spacing)", className)}
      {...props}
    />
  )
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn(
        "flex items-center rounded-b-xl border-t bg-fill-subtle p-(--card-spacing)",
        className
      )}
      {...props}
    />
  )
}

// Home-card header, same pattern as the hero tiles: a small caps label on the
// left and a quiet note or control on the right.
function CardLabelHeader({
  label,
  aside,
  className,
}: {
  label: React.ReactNode
  aside?: React.ReactNode
  className?: string
}) {
  return (
    <div
      data-slot="card-label-header"
      className={cn(
        "-mb-1.5 flex min-h-7 items-center justify-between gap-3 px-(--card-spacing)",
        className
      )}
    >
      <h2 className="label-eyebrow">{label}</h2>
      {aside != null && aside !== false && (
        <div className="flex shrink-0 items-center text-xs text-muted-foreground">
          {aside}
        </div>
      )}
    </div>
  )
}

// The card's main link as a full-width row along the bottom (matches
// TileFooterAction in the hero).
function CardFooterLink({
  href,
  children,
  className,
}: {
  href: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      data-slot="card-footer"
      className={cn("mt-auto border-t border-edge", className)}
    >
      <Link
        href={href}
        className="group/footer flex h-12 w-full items-center justify-between px-(--card-spacing) text-sm font-medium text-muted-foreground transition-colors outline-none hover:bg-fill-subtle hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-inset"
      >
        {children}
        <ChevronRight
          aria-hidden
          className="size-4 transition-transform group-hover/footer:translate-x-0.5"
        />
      </Link>
    </div>
  )
}

export {
  Card,
  CardLabelHeader,
  CardFooterLink,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
}
