import { cache } from "react";
import { createClient, getAuthUser } from "@/lib/supabase/server";
import { getOrganizationSettings } from "@/lib/supabase/queries/organization-settings";
import { getMyTodayAttendanceStatus } from "@/lib/supabase/queries/attendance";
import { dateNDaysAgo, hourInTimeZone, isWorkingDay, todayInTimezone } from "@/lib/helpers/dates";
import type { AttendanceStatus } from "@/types/attendance";

// The home page renders each card on its own, so every card can ask for the
// same day context. Both are cache()-wrapped: one fetch per request.

/** Today's date in the org time zone and whether it is a working day for the viewer. */
export const getHomeDay = cache(async () => {
  const settings = await getOrganizationSettings();
  const todayDate = todayInTimezone(settings.timezone);
  const todayAttendanceStatus = await getMyTodayAttendanceStatus(todayDate);
  const isHoliday = todayAttendanceStatus === "holiday";

  return {
    settings,
    todayDate,
    todayAttendanceStatus,
    isOffDay: !isWorkingDay(todayDate, settings.workingDays) || isHoliday,
    onFullDayLeave: todayAttendanceStatus === "leave",
    deadlinePassed: hourInTimeZone(settings.timezone) >= settings.reportDeadlineHourLocal,
  };
});

/** The signed-in person's attendance for the last 400 days (streaks, the 30-day strip). */
export const getMyAttendanceHistory = cache(
  async (): Promise<{ date: string; status: AttendanceStatus }[]> => {
    const supabase = await createClient();
    const user = await getAuthUser();
    if (!user) return [];

    const { data } = await supabase
      .from("attendance_records")
      .select("date, status")
      .eq("profile_id", user.id)
      .gte("date", dateNDaysAgo(399));

    return (data as { date: string; status: AttendanceStatus }[] | null) ?? [];
  },
);
