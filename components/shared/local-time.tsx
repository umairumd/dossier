"use client";

import { useSyncExternalStore } from "react";
import { formatLocalTime } from "@/lib/helpers/time";

function subscribe() {
  return () => {};
}

function getClientSnapshot() {
  return true;
}

function getServerSnapshot() {
  return false;
}

export function LocalTime({ isoString }: { isoString: string }) {
  const mounted = useSyncExternalStore(
    subscribe,
    getClientSnapshot,
    getServerSnapshot,
  );

  if (!mounted) {
    return null;
  }

  return <>{formatLocalTime(isoString)}</>;
}
