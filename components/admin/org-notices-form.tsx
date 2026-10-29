"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { SaveBar, SettingsSection } from "@/components/shared/settings-section";
import { saveNoticeRules } from "@/lib/actions/notices";
import { NOTICE_RULES } from "@/lib/notices/rules";
import type { NoticeRuleKey, NoticeRuleSetting } from "@/types/notice";
import { cn } from "@/lib/utils";

type Rules = Record<NoticeRuleKey, NoticeRuleSetting>;

export function OrgNoticesForm({ initial }: { initial: Rules }) {
  const [saved, setSaved] = useState(initial);
  const [rules, setRules] = useState(initial);
  const [pending, startTransition] = useTransition();
  const dirty = JSON.stringify(rules) !== JSON.stringify(saved);

  const update = (rule: NoticeRuleKey, patch: Partial<NoticeRuleSetting>) =>
    setRules((current) => ({ ...current, [rule]: { ...current[rule], ...patch } }));

  return (
    <SettingsSection
      title="Automatic notices"
      description="Shown in For you on Home. Each one is checked when Home loads and goes away by itself when the cause is fixed."
      onSubmit={(event) => {
        event.preventDefault();
        startTransition(async () => {
          const result = await saveNoticeRules(Object.values(rules));
          if (!result.success) {
            toast.error(result.error);
            return;
          }
          setSaved(rules);
          toast.success("Automatic notices saved.");
        });
      }}
      footer={<SaveBar dirty={dirty} pending={pending} onReset={() => setRules(saved)} />}
    >
      <ul className="flex flex-col divide-y divide-line">
        {NOTICE_RULES.map((def) => {
          const setting = rules[def.rule];
          const [before, after] = (def.when ?? "").split("{n}");
          return (
            <li key={def.rule} className="flex items-start gap-4 py-4 first:pt-0 last:pb-0">
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <label htmlFor={`rule-${def.rule}`} className="text-sm font-medium">
                  {def.label}
                </label>
                <p className="text-[13px] text-muted-foreground">{def.hint}</p>
                <div
                  className={cn(
                    "mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px]",
                    !setting.enabled && "opacity-50",
                  )}
                >
                  {def.when ? (
                    <span className="inline-flex items-center gap-1.5">
                      {before}
                      <Input
                        type="number"
                        inputMode="numeric"
                        min={def.min}
                        max={def.max}
                        disabled={!setting.enabled}
                        aria-label={`${def.label}: number`}
                        value={setting.threshold ?? ""}
                        onChange={(event) =>
                          update(def.rule, {
                            threshold: event.target.value === "" ? null : Number(event.target.value),
                          })
                        }
                        className="h-7 w-14 px-2 text-center tabular-nums"
                      />
                      {after}
                    </span>
                  ) : (
                    <span>As soon as it happens</span>
                  )}
                  <span className="text-muted-foreground">· Also tells: {def.alsoTells}</span>
                </div>
              </div>
              <Switch
                id={`rule-${def.rule}`}
                checked={setting.enabled}
                onCheckedChange={(enabled) => update(def.rule, { enabled })}
                className="mt-0.5"
              />
            </li>
          );
        })}
      </ul>
    </SettingsSection>
  );
}
