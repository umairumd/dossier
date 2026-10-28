"use client";

import { useEffect, useRef } from "react";
import { markHandbookDocOpened } from "@/lib/actions/handbook";

/** Records that a doc without a confirmation step was read. Renders nothing. */
export function MarkOpened({ docId }: { docId: string }) {
  const sent = useRef(false);
  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    void markHandbookDocOpened(docId);
  }, [docId]);
  return null;
}
