"use client";

import { useSyncExternalStore } from "react";
import { formatLocalDateTime } from "@/lib/helpers/time";

function subscribe() {
  return () => {};
}

function getClientSnapshot() {
  return true;
}

function getServerSnapshot() {
  return false;
}

export function LocalDateTime({ isoString }: { isoString: string }) {
  const mounted = useSyncExternalStore(
    subscribe,
    getClientSnapshot,
    getServerSnapshot,
  );

  if (!mounted) {
    return null;
  }

  return <>{formatLocalDateTime(isoString)}</>;
}
