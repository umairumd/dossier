"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronsUpDown, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export interface ViewAsOption {
  id: string;
  name: string;
  detail: string | null;
}

/** Owners and admins: see the handbook exactly as someone else does. */
export function HandbookViewAsPicker({ people }: { people: ViewAsOption[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          <Eye className="size-3.5" />
          View as…
          <ChevronsUpDown className="size-3.5 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <Command>
          <CommandInput placeholder="Search people…" />
          <CommandList>
            <CommandEmpty>No match.</CommandEmpty>
            <CommandGroup>
              {people.map((person) => (
                <CommandItem
                  key={person.id}
                  value={`${person.name} ${person.detail ?? ""} ${person.id}`}
                  onSelect={() => {
                    setOpen(false);
                    router.push(`/handbook?as=${person.id}`);
                  }}
                >
                  <span className="truncate">{person.name}</span>
                  {person.detail ? (
                    <span className="ml-auto truncate text-xs text-muted-foreground">
                      {person.detail}
                    </span>
                  ) : null}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
