"use client";

import { AlertCircle, Clock, Star, Wifi } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function RemoteIndicator() {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex shrink-0">
            <Wifi className="size-3.5 text-muted-foreground/60" />
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <p>Remote employee</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function PartTimeIndicator() {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex shrink-0">
            <Clock className="size-3.5 text-muted-foreground/60" />
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <p>Part-time employee</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function ManagerIndicator() {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex shrink-0">
            <Star className="size-3.5 fill-primary text-primary" />
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <p>Department manager</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function NoMembersIndicator() {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className="inline-flex shrink-0 cursor-help"
          >
            <AlertCircle className="size-3.5 text-primary/70" />
          </button>
        </TooltipTrigger>
        <TooltipContent>
          <p>No members assigned to this department</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
