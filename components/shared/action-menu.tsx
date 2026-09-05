"use client";

import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export interface ActionMenuItem {
  label: string;
  icon?: React.ReactNode;
  onSelect: () => void;
  disabled?: boolean;
  disabledReason?: string;
  destructive?: boolean;
}

export interface ActionMenuProps {
  items: (ActionMenuItem | "separator")[];
  disabled?: boolean;
  disabledReason?: string;
}

export function ActionMenu({ items, disabled, disabledReason }: ActionMenuProps) {
  if (disabled) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" disabled>
            <MoreHorizontal className="size-4" />
            <span className="sr-only">Actions</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>{disabledReason ?? "No actions available"}</TooltipContent>
      </Tooltip>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <MoreHorizontal className="size-4" />
          <span className="sr-only">Actions</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {items.map((item, index) => {
          if (item === "separator") {
            return <DropdownMenuSeparator key={`sep-${index}`} />;
          }

          return (
            <DropdownMenuItem
              key={item.label}
              onSelect={item.onSelect}
              disabled={item.disabled}
              className={item.destructive ? "text-destructive focus:text-destructive" : undefined}
            >
              {item.icon}
              {item.label}
              {item.disabled && item.disabledReason && (
                <span className="ml-auto text-xs text-muted-foreground">
                  ({item.disabledReason})
                </span>
              )}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
