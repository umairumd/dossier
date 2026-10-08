import { cn } from "@/lib/utils"

// Shapes should mirror the real content exactly, so nothing jumps when it
// loads. The sweep is shared across every block on screen (see the
// `skeleton` utility in globals.css).
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      aria-hidden
      className={cn("skeleton rounded-md", className)}
      {...props}
    />
  )
}

export { Skeleton }
