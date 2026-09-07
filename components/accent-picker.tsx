"use client";

import { Check, Palette } from "lucide-react";
import { ACCENT_PRESETS, useAccent, type Accent } from "@/components/accent-provider";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const ACCENT_LABELS: Record<Accent, string> = {
  neutral: "Neutral",
  blue: "Blue",
  green: "Green",
  violet: "Violet",
  orange: "Orange",
  rose: "Rose",
};

const ACCENT_SWATCH: Record<Accent, string> = {
  neutral: "#71717a",
  blue: "#2563eb",
  green: "#16a34a",
  violet: "#7c3aed",
  orange: "#ea580c",
  rose: "#e11d48",
};

export function AccentPicker() {
  const { accent, setAccent } = useAccent();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="text-foreground/70"
          aria-label="Change accent color"
        >
          <Palette />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {ACCENT_PRESETS.map((preset) => (
          <DropdownMenuItem key={preset} onSelect={() => setAccent(preset)}>
            <span
              className="size-3 rounded-full border border-border"
              style={{ backgroundColor: ACCENT_SWATCH[preset] }}
            />
            {ACCENT_LABELS[preset]}
            {accent === preset && <Check className="ml-auto size-4" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
