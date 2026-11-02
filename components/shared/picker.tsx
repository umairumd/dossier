"use client";

import { Fragment, useState, type ReactNode } from "react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

// One picker for the whole app: the same rows, search, ticks, keyboard and
// height limits for people, boards, priorities and audience lists.

export interface PickerOption {
  value: string;
  label: string;
  /** Second line, e.g. a designation or what the choice does. */
  description?: string | null;
  /** Short text on the right, e.g. a date. */
  hint?: string | null;
  /** Avatar or icon on the left. */
  icon?: ReactNode;
  /** Extra words search should match. */
  keywords?: string;
}

export interface PickerSection {
  heading?: string;
  options: PickerOption[];
}

export function PickerList({
  sections,
  selected = [],
  onSelect,
  searchPlaceholder,
  query,
  onQueryChange,
  empty = "No match.",
}: {
  sections: PickerSection[];
  /** Values shown with a tick. */
  selected?: string[];
  onSelect: (value: string) => void;
  /** Shows a search box when set. */
  searchPlaceholder?: string;
  /** Controlled search, for lists that add "Add …" rows from what's typed. */
  query?: string;
  onQueryChange?: (query: string) => void;
  empty?: string;
}) {
  const shown = sections.filter((section) => section.options.length > 0);
  return (
    <Command>
      {searchPlaceholder ? (
        <CommandInput placeholder={searchPlaceholder} value={query} onValueChange={onQueryChange} />
      ) : null}
      <CommandList>
        <CommandEmpty>{empty}</CommandEmpty>
        {shown.map((section, index) => (
          <Fragment key={section.heading ?? index}>
            {index > 0 && !section.heading ? <CommandSeparator /> : null}
            <CommandGroup heading={section.heading}>
              {section.options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={`${option.label} ${option.description ?? ""} ${option.keywords ?? ""} ${option.value}`}
                  data-checked={selected.includes(option.value)}
                  onSelect={() => onSelect(option.value)}
                  className={cn("gap-2.5", option.description ? "py-1.5" : undefined)}
                >
                  {option.icon}
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate">{option.label}</span>
                    {option.description ? (
                      <span className="text-xs whitespace-normal text-muted-foreground">{option.description}</span>
                    ) : null}
                  </span>
                  {option.hint ? (
                    <span className="max-w-28 shrink-0 truncate text-xs text-muted-foreground">{option.hint}</span>
                  ) : null}
                </CommandItem>
              ))}
            </CommandGroup>
          </Fragment>
        ))}
      </CommandList>
    </Command>
  );
}

/** A trigger and a picker list in a popover. Closes on pick unless `multiple`. */
export function PickerPopover({
  trigger,
  align = "start",
  width = "w-64",
  multiple = false,
  onSelect,
  ...list
}: {
  trigger: ReactNode;
  align?: "start" | "center" | "end";
  width?: string;
  /** Keep the list open after a pick, for choosing several. */
  multiple?: boolean;
} & Parameters<typeof PickerList>[0]) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent className={cn(width, "p-0")} align={align}>
        <PickerList
          {...list}
          onSelect={(value) => {
            onSelect(value);
            if (!multiple) setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
