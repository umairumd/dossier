"use server";

import { revalidatePath } from "next/cache";
import { createNotification } from "@/lib/actions/notifications";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  LEAVE_REQUEST_TYPE_LABELS,
  type LeaveRequestType,
} from "@/types/attendance";

export interface SubmitLeaveRequestResult {
  success: boolean;
  error?: string;
  id?: string;
}

/**
 * Employee self-service leave request. Inserts a pending row (RLS
 * leave_requests_self_insert) then fans out leave_request_submitted
 * notifications to owners, admins, and managers in the org.
 */
export async function submitLeaveRequestAction(input: {
  date: string;
  type: LeaveRequestType;
  notes?: string;
}): Promise<SubmitLeaveRequestResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "Not authenticated." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id, full_name")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.organization_id) {
    return { success: false, error: "Organization not found." };
  }

  const { data: inserted, error } = await supabase
    .from("leave_requests")
    .insert({
      org_id: profile.organization_id,
      profile_id: user.id,
      date: input.date,
      type: input.type,
      informed: true,
      status: "pending",
      notes: input.notes?.trim() || null,
    })
    .select("id, date, type")
    .single();

  if (error || !inserted) {
    if (error?.code === "23505") {
      return {
        success: false,
        error: "You already have a leave request for that date.",
      };
    }
    return {
      success: false,
      error: error?.message ?? "Failed to submit leave request.",
    };
  }

  const employeeName = profile.full_name?.trim() || "An employee";
  const typeLabel =
    LEAVE_REQUEST_TYPE_LABELS[inserted.type as LeaveRequestType] ??
    inserted.type;
  const body = `${typeLabel} · ${inserted.date}`;

  try {
    const adminClient = createAdminClient();
    const { data: recipients } = await adminClient
      .from("profiles")
      .select("id")
      .eq("organization_id", profile.organization_id)
      .in("role", ["owner", "admin", "manager"]);

    await Promise.all(
      (recipients ?? [])
        .filter((recipient) => recipient.id !== user.id)
        .map((recipient) =>
          createNotification({
            orgId: profile.organization_id,
            profileId: recipient.id,
            type: "leave_request_submitted",
            title: `${employeeName} submitted a leave request`,
            body,
            entityType: "leave_request",
            entityId: inserted.id,
          }),
        ),
    );
  } catch (notifyError) {
    console.error(
      "[notifications] Failed to notify leave request submission:",
      notifyError,
    );
  }

  revalidatePath("/attendance");
  revalidatePath("/", "layout");
  return { success: true, id: inserted.id };
}
