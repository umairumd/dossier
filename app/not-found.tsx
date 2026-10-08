import Link from "next/link";
import { BuddyStatus } from "@/components/status/buddy-status";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <BuddyStatus
      expression="surprised"
      title="We couldn't find that page"
      body="It may have moved, or the link is out of date."
    >
      <div className="mt-6">
        <Button
          variant="default"
          className="max-md:min-h-11 motion-reduce:transition-none motion-reduce:active:scale-100"
          asChild
        >
          <Link href="/">Go to dashboard</Link>
        </Button>
      </div>
    </BuddyStatus>
  );
}
