"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { updateAttendanceSettings } from "@/lib/actions/admin/organization-settings";

// Strip seconds from "HH:MM:SS" → "HH:MM" for <input type="time">
function toTimeInput(value: string): string {
  return value.slice(0, 5);
}

export function OrgAttendanceForm({
  initialGraceMinutes,
  initialFineLate,
  initialFineVeryLate,
  initialFineUninformed,
  initialInformedLeaves,
  initialShiftFulltimeStart,
  initialShiftMorningStart,
  initialShiftMorningEnd,
  initialShiftEveningStart,
  initialShiftEveningEnd,
}: {
  initialGraceMinutes: number;
  initialFineLate: number;
  initialFineVeryLate: number;
  initialFineUninformed: number;
  initialInformedLeaves: number;
  initialShiftFulltimeStart: string;
  initialShiftMorningStart: string;
  initialShiftMorningEnd: string;
  initialShiftEveningStart: string;
  initialShiftEveningEnd: string;
}) {
  const [graceMinutes, setGraceMinutes] = useState(
    String(initialGraceMinutes),
  );
  const [fineLate, setFineLate] = useState(String(initialFineLate));
  const [fineVeryLate, setFineVeryLate] = useState(String(initialFineVeryLate));
  const [fineUninformed, setFineUninformed] = useState(
    String(initialFineUninformed),
  );
  const [informedLeaves, setInformedLeaves] = useState(
    String(initialInformedLeaves),
  );
  const [shiftFulltimeStart, setShiftFulltimeStart] = useState(
    toTimeInput(initialShiftFulltimeStart),
  );
  const [shiftMorningStart, setShiftMorningStart] = useState(
    toTimeInput(initialShiftMorningStart),
  );
  const [shiftMorningEnd, setShiftMorningEnd] = useState(
    toTimeInput(initialShiftMorningEnd),
  );
  const [shiftEveningStart, setShiftEveningStart] = useState(
    toTimeInput(initialShiftEveningStart),
  );
  const [shiftEveningEnd, setShiftEveningEnd] = useState(
    toTimeInput(initialShiftEveningEnd),
  );
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const parsed = {
      graceMinutes: parseInt(graceMinutes, 10),
      fineLateAmount: parseInt(fineLate, 10),
      fineVeryLateAmount: parseInt(fineVeryLate, 10),
      fineUninformedAmount: parseInt(fineUninformed, 10),
      informedLeavesPerMonth: parseInt(informedLeaves, 10),
      shiftFulltimeStart,
      shiftMorningStart,
      shiftMorningEnd,
      shiftEveningStart,
      shiftEveningEnd,
    };

    if (Object.values(parsed).some((v) => typeof v === "number" && isNaN(v))) {
      toast.error("Please fill in all fields correctly.");
      return;
    }

    startTransition(async () => {
      const result = await updateAttendanceSettings(parsed);
      if (!result.success) {
        toast.error(result.error ?? "Failed to save attendance settings.");
        return;
      }
      toast.success("Attendance settings saved.");
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      {/* Section 1: Fines & Grace */}
      <div className="flex flex-col gap-4">
        <h3 className="text-sm font-medium">Fines & Grace Period</h3>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="grace-minutes">Grace Period (minutes)</Label>
            <Input
              id="grace-minutes"
              type="number"
              min={0}
              max={60}
              value={graceMinutes}
              onChange={(e) => setGraceMinutes(e.target.value)}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              Minutes after shift start before lateness is recorded.
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="informed-leaves">
              Informed Leaves Allowed (per month)
            </Label>
            <Input
              id="informed-leaves"
              type="number"
              min={0}
              max={31}
              value={informedLeaves}
              onChange={(e) => setInformedLeaves(e.target.value)}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              Beyond this count, absences are treated as uninformed.
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="fine-late">Late Fine (PKR)</Label>
            <Input
              id="fine-late"
              type="number"
              min={0}
              value={fineLate}
              onChange={(e) => setFineLate(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">After grace period.</p>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="fine-very-late">Very Late Fine (PKR)</Label>
            <Input
              id="fine-very-late"
              type="number"
              min={0}
              value={fineVeryLate}
              onChange={(e) => setFineVeryLate(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Significantly late arrival.
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="fine-uninformed">Uninformed Absence Fine (PKR)</Label>
            <Input
              id="fine-uninformed"
              type="number"
              min={0}
              value={fineUninformed}
              onChange={(e) => setFineUninformed(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              No advance notice given.
            </p>
          </div>
        </div>
      </div>

      <Separator />

      {/* Section 2: Full-time shift */}
      <div className="flex flex-col gap-4">
        <h3 className="text-sm font-medium">Full-time Shift</h3>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="shift-fulltime-start">Shift Start</Label>
          <Input
            id="shift-fulltime-start"
            type="time"
            value={shiftFulltimeStart}
            onChange={(e) => setShiftFulltimeStart(e.target.value)}
            className="w-36"
          />
          <p className="text-xs text-muted-foreground">
            Grace period applies from this time.
          </p>
        </div>
      </div>

      <Separator />

      {/* Section 3: Part-time shifts */}
      <div className="flex flex-col gap-4">
        <h3 className="text-sm font-medium">Part-time Shifts</h3>

        <div className="grid gap-6 sm:grid-cols-2">
          <div className="flex flex-col gap-3">
            <p className="text-sm font-medium text-muted-foreground">
              Morning Shift
            </p>
            <div className="flex flex-wrap items-end gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="shift-morning-start">Start</Label>
                <Input
                  id="shift-morning-start"
                  type="time"
                  value={shiftMorningStart}
                  onChange={(e) => setShiftMorningStart(e.target.value)}
                  className="w-32"
                />
              </div>
              <span className="pb-2 text-sm text-muted-foreground">to</span>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="shift-morning-end">End</Label>
                <Input
                  id="shift-morning-end"
                  type="time"
                  value={shiftMorningEnd}
                  onChange={(e) => setShiftMorningEnd(e.target.value)}
                  className="w-32"
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <p className="text-sm font-medium text-muted-foreground">
              Evening Shift
            </p>
            <div className="flex flex-wrap items-end gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="shift-evening-start">Start</Label>
                <Input
                  id="shift-evening-start"
                  type="time"
                  value={shiftEveningStart}
                  onChange={(e) => setShiftEveningStart(e.target.value)}
                  className="w-32"
                />
              </div>
              <span className="pb-2 text-sm text-muted-foreground">to</span>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="shift-evening-end">End</Label>
                <Input
                  id="shift-evening-end"
                  type="time"
                  value={shiftEveningEnd}
                  onChange={(e) => setShiftEveningEnd(e.target.value)}
                  className="w-32"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <Button type="submit" disabled={isPending} className="self-start">
        {isPending ? "Saving..." : "Save Changes"}
      </Button>
    </form>
  );
}
