import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "group/badge inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-4xl border border-transparent px-2 py-0.5 text-xs font-medium whitespace-nowrap transition-all focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&>svg]:pointer-events-none [&>svg]:size-3!",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground [a]:hover:bg-primary/80",
        secondary:
          "bg-secondary text-secondary-foreground [a]:hover:bg-secondary/80",
        destructive:
          "bg-destructive/10 text-destructive focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:focus-visible:ring-destructive/40 [a]:hover:bg-destructive/20",
        outline:
          "border-border text-foreground [a]:hover:bg-muted [a]:hover:text-muted-foreground",
        ghost:
          "hover:bg-muted hover:text-muted-foreground dark:hover:bg-fill-active",
        link: "text-primary underline-offset-4 hover:underline",
        // Tinted status pills. Text is a solid shade (not the fill) so it
        // stays above 4.5:1 on the 12% wash in both themes. Neutral uses
        // neutral-700 in light because muted-foreground drops under 4.5:1
        // once the foreground/8 fill darkens the background.
        success:
          "border-transparent bg-ok/12 text-ok ring-1 ring-inset ring-ok/30",
        warning:
          "border-transparent bg-warn/12 text-warn ring-1 ring-inset ring-warn/30",
        danger:
          "border-transparent bg-danger/12 text-danger ring-1 ring-inset ring-danger/30",
        neutral:
          "border-transparent bg-fill-active text-neutral-700 ring-1 ring-inset ring-line-strong dark:text-neutral-300",
        leave:
          "border-transparent bg-leave/12 text-leave ring-1 ring-inset ring-leave/30",
        info:
          "border-transparent bg-info/12 text-info ring-1 ring-inset ring-info/30",
        teal:
          "border-transparent bg-holiday/12 text-holiday ring-1 ring-inset ring-holiday/30",
        // Day off: the same amber as the day-off date control, with its icon.
        off: "border-transparent bg-warn/12 text-warn ring-1 ring-inset ring-warn/30",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span"

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
