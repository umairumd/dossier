/** Shared destination for a notification. The nav bell and the hero list both use this. */
export function resolveNotificationUrl(
  type: string,
  entityType: string | null,
  entityId: string | null,
): string | null {
  if (entityType === "employee" && entityId) return `/employees/${entityId}`;
  if (entityType === "leave_request" && entityId) return `/attendance`;
  if (entityType === "report" && entityId) return `/reports?view=${entityId}`;
  if (entityType === "handbook_doc" && entityId) return `/handbook/${entityId}`;
  if (entityType === "handbook") return "/handbook";
  if (entityType === "team_report" && entityId) {
    return `/track-reports?report=${entityId}`;
  }

  switch (type) {
    case "leave_approved":
    case "leave_rejected":
    case "leave_request_submitted":
    case "leave_balance_adjusted":
      return "/attendance";
    case "report_commented":
      return entityId ? `/reports?view=${entityId}` : "/reports";
    case "report_deadline":
      return "/?hero=report";
    case "employee_invited":
    case "employee_onboarded":
    case "employee_deactivated":
    case "employee_archived":
      return entityId ? `/employees/${entityId}` : "/employees";
    case "attendance_fine":
      return "/attendance";
    case "shift_assigned":
    case "template_assigned":
    case "supervisor_assigned":
      return "/attendance";
    case "birthday":
      return "/birthdays";
    default:
      return null;
  }
}

/** Verb on the hero row. The bell itself has no verb; it uses the same URL. */
export function notificationActionLabel(type: string): string {
  if (type === "report_commented" || type === "team_report_commented") {
    return "Reply";
  }
  if (
    type === "leave_approved" ||
    type === "leave_rejected" ||
    type === "leave_request_submitted"
  ) {
    return "View";
  }
  if (type === "birthday") return "Say hi";
  if (type === "handbook_published" || type === "handbook_reminder") return "Read";
  return "Open";
}
