"use client";

import { Search } from "lucide-react";
import type { ReactNode } from "react";
import { Input } from "@/components/ui/input";

export const filterSelectTriggerClassName = "w-full min-w-0 overflow-hidden";

export function FilterSearchInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <div className="relative min-w-0">
      <Search className="absolute top-2.5 left-2.5 size-4 text-muted-foreground" />
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="pl-8"
      />
    </div>
  );
}

export function FilterToolbar({
  search,
  filters,
}: {
  search: ReactNode;
  filters: ReactNode[];
}) {
  if (filters.length <= 1) {
    return (
      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1">{search}</div>
        {filters.map((filter, index) => (
          <div key={index} className="w-36 shrink-0 sm:w-44">
            {filter}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <div className="min-w-0 w-full sm:flex-1">{search}</div>
      <div className="grid grid-cols-2 gap-2 sm:flex sm:shrink-0">
        {filters.map((filter, index) => (
          <div key={index} className="min-w-0 sm:w-44">
            {filter}
          </div>
        ))}
      </div>
    </div>
  );
}
