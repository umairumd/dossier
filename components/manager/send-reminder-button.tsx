"use client";

import { Bell } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

// Placeholder: no notification system exists yet (out of scope for this
// milestone). This confirms the intent to the manager without pretending
// to have sent anything real.
export function SendReminderButton({ fullName }: { fullName: string }) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={() =>
        toast.info(`Reminders aren't set up yet — nothing was sent to ${fullName}.`)
      }
    >
      <Bell />
      Send Reminder
    </Button>
  );
}
