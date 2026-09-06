import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/supabase/queries/profile";
import { getOrganizationSettings } from "@/lib/supabase/queries/organization-settings";
import {
  getAttendanceSettings,
  getMonthlyAttendance,
  getPendingLeaveRequests,
} from "@/lib/supabase/queries/attendance";
import { getAllEmployees } from "@/lib/supabase/queries/admin/employees";
import { todayInTimezone } from "@/lib/helpers/dates";
import { MonthNav } from "@/components/attendance/month-nav";
import { AttendanceGrid } from "@/components/attendance/attendance-grid";
import { LeaveRequestsList } from "@/components/attendance/leave-requests-list";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

export default async function AttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; tab?: string }>;
}) {
  const profile = await getCurrentProfile();

  // Attendance is admin/owner only for now
  if (!profile || !["owner", "admin"].includes(profile.role)) {
    redirect("/");
  }

  const { month: monthParam, tab } = await searchParams;
  const settings = await getOrganizationSettings();
  const today = todayInTimezone(settings.timezone);
  const currentMonth = today.slice(0, 7); // "YYYY-MM"
  const month = monthParam ?? currentMonth;

  const [employees, attendanceSettings, records, leaveRequests] =
    await Promise.all([
      getAllEmployees(),
      getAttendanceSettings(),
      getMonthlyAttendance(month),
      getPendingLeaveRequests(),
    ]);

  // Only show active, non-archived employees
  const activeEmployees = employees
    .filter((emp) => emp.status === "active" || emp.status === "invited")
    .map((emp) => ({
      id: emp.id,
      full_name: emp.full_name,
      org_id: emp.organization_id ?? "",
      is_remote: emp.is_remote,
      employment_type: emp.employment_type,
    }));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-col gap-0.5">
          <h1 className="text-2xl font-semibold tracking-tight">Attendance</h1>
          <p className="text-sm text-muted-foreground">
            {activeEmployees.length} employee
            {activeEmployees.length !== 1 ? "s" : ""}
          </p>
        </div>
        <MonthNav month={month} baseHref="/attendance" />
      </div>

      <Tabs defaultValue={tab ?? "grid"}>
        <TabsList>
          <TabsTrigger value="grid">Monthly Grid</TabsTrigger>
          <TabsTrigger value="leaves" className="gap-2">
            Leave Requests
            {leaveRequests.length > 0 && (
              <Badge variant="secondary" className="px-1.5 py-0 text-xs">
                {leaveRequests.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="grid" className="mt-4">
          <AttendanceGrid
            employees={activeEmployees}
            records={records}
            yearMonth={month}
            settings={attendanceSettings}
            workingDays={settings.workingDays}
          />
        </TabsContent>

        <TabsContent value="leaves" className="mt-4">
          <Card className="card-gradient">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Pending Leave Requests</CardTitle>
              <CardDescription>
                Requests submitted by employees via email and logged here by HR.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <LeaveRequestsList requests={leaveRequests} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
