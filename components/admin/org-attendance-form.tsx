"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Field, SaveBar, SettingsSection } from "@/components/shared/settings-section";
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
  const current = [
    graceMinutes,
    fineLate,
    fineVeryLate,
    fineUninformed,
    informedLeaves,
    shiftFulltimeStart,
    shiftMorningStart,
    shiftMorningEnd,
    shiftEveningStart,
    shiftEveningEnd,
  ];
  const [saved, setSaved] = useState(current);
  const dirty = current.join("|") !== saved.join("|");
  const reset = () => {
    const [g, fl, fvl, fu, il, sf, sms, sme, ses, see] = saved;
    setGraceMinutes(g);
    setFineLate(fl);
    setFineVeryLate(fvl);
    setFineUninformed(fu);
    setInformedLeaves(il);
    setShiftFulltimeStart(sf);
    setShiftMorningStart(sms);
    setShiftMorningEnd(sme);
    setShiftEveningStart(ses);
    setShiftEveningEnd(see);
  };

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
      setSaved(current);
      toast.success("Attendance settings saved.");
    });
  };

  const sub = "text-[13px] font-semibold";
  return (
    <SettingsSection
      title="Attendance"
      description="Shift times, the grace period and fines used when attendance is marked."
      onSubmit={handleSubmit}
      footer={<SaveBar dirty={dirty} pending={isPending} onReset={reset} />}
    >
      <div className="flex flex-col gap-4">
        <h3 className={sub}>Grace period and leave</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Grace period (minutes)"
            htmlFor="grace-minutes"
            hint="Minutes after shift start before lateness is recorded."
          >
            <Input
              id="grace-minutes"
              type="number"
              inputMode="numeric"
              min={0}
              max={60}
              value={graceMinutes}
              onChange={(e) => setGraceMinutes(e.target.value)}
            />
          </Field>
          <Field
            label="Informed leaves per month"
            htmlFor="informed-leaves"
            hint="Beyond this, absences count as uninformed."
          >
            <Input
              id="informed-leaves"
              type="number"
              inputMode="numeric"
              min={0}
              max={31}
              value={informedLeaves}
              onChange={(e) => setInformedLeaves(e.target.value)}
            />
          </Field>
        </div>
      </div>

      <div className="flex flex-col gap-4 border-t border-edge pt-5">
        <h3 className={sub}>Fines (PKR)</h3>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Late" htmlFor="fine-late" hint="After the grace period.">
            <Input
              id="fine-late"
              type="number"
              inputMode="numeric"
              min={0}
              value={fineLate}
              onChange={(e) => setFineLate(e.target.value)}
            />
          </Field>
          <Field label="Very late" htmlFor="fine-very-late" hint="Significantly late arrival.">
            <Input
              id="fine-very-late"
              type="number"
              inputMode="numeric"
              min={0}
              value={fineVeryLate}
              onChange={(e) => setFineVeryLate(e.target.value)}
            />
          </Field>
          <Field label="Uninformed absence" htmlFor="fine-uninformed" hint="No advance notice given.">
            <Input
              id="fine-uninformed"
              type="number"
              inputMode="numeric"
              min={0}
              value={fineUninformed}
              onChange={(e) => setFineUninformed(e.target.value)}
            />
          </Field>
        </div>
      </div>

      <div className="flex flex-col gap-4 border-t border-edge pt-5">
        <h3 className={sub}>Shifts</h3>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Full-time start" htmlFor="shift-fulltime-start" hint="The grace period counts from here.">
            <Input
              id="shift-fulltime-start"
              type="time"
              value={shiftFulltimeStart}
              onChange={(e) => setShiftFulltimeStart(e.target.value)}
            />
          </Field>
          <Field label="Part-time morning" htmlFor="shift-morning-start">
            <div className="flex items-center gap-2">
              <Input
                id="shift-morning-start"
                type="time"
                aria-label="Morning shift start"
                value={shiftMorningStart}
                onChange={(e) => setShiftMorningStart(e.target.value)}
              />
              <span className="text-xs text-muted-foreground">to</span>
              <Input
                id="shift-morning-end"
                type="time"
                aria-label="Morning shift end"
                value={shiftMorningEnd}
                onChange={(e) => setShiftMorningEnd(e.target.value)}
              />
            </div>
          </Field>
          <Field label="Part-time evening" htmlFor="shift-evening-start">
            <div className="flex items-center gap-2">
              <Input
                id="shift-evening-start"
                type="time"
                aria-label="Evening shift start"
                value={shiftEveningStart}
                onChange={(e) => setShiftEveningStart(e.target.value)}
              />
              <span className="text-xs text-muted-foreground">to</span>
              <Input
                id="shift-evening-end"
                type="time"
                aria-label="Evening shift end"
                value={shiftEveningEnd}
                onChange={(e) => setShiftEveningEnd(e.target.value)}
              />
            </div>
          </Field>
        </div>
      </div>
    </SettingsSection>
  );
}
