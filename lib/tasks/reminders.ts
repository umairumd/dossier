import { shiftReportDate, todayInTimezone } from "@/lib/helpers/dates";
import { notifyGrouped } from "@/lib/notifications/grouped";
import { createAdminClient } from "@/lib/supabase/admin";

// Once a day: tell owners about tasks due tomorrow, and owners and assigners
// about tasks that went overdue yesterday. Server only; called from cron.

export async function sendTaskReminders(orgId: string): Promise<{ dueTomorrow: number; overdue: number }> {
  const admin = createAdminClient();
  const { data: settings } = await admin
    .from("organization_settings")
    .select("timezone")
    .eq("id", true)
    .maybeSingle();
  const today = todayInTimezone(settings?.timezone ?? "UTC");
  const tomorrow = shiftReportDate(today, 1);
  const yesterday = shiftReportDate(today, -1);

  const { data: tasks } = await admin
    .from("tasks")
    .select("id, title, owner_id, created_by, due_date")
    .eq("organization_id", orgId)
    .is("archived_at", null)
    .neq("status", "done")
    .not("owner_id", "is", null)
    .in("due_date", [tomorrow, yesterday]);

  let dueTomorrow = 0;
  let overdue = 0;
  for (const task of tasks ?? []) {
    if (task.due_date === tomorrow) {
      dueTomorrow += 1;
      await notifyGrouped(admin, {
        orgId,
        recipientIds: [task.owner_id as string],
        type: "task_due",
        entityType: "task",
        entityId: task.id,
        title: () => `Due tomorrow: ${task.title}`,
        body: () => null,
      });
    } else {
      overdue += 1;
      const recipients = [task.owner_id as string];
      if (task.created_by && task.created_by !== task.owner_id) recipients.push(task.created_by);
      await notifyGrouped(admin, {
        orgId,
        recipientIds: recipients,
        type: "task_due",
        entityType: "task",
        entityId: task.id,
        title: () => `Overdue: ${task.title}`,
        body: () => "It was due yesterday.",
      });
    }
  }
  return { dueTomorrow, overdue };
}
