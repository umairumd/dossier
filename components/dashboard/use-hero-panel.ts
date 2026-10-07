"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import {
  setHeroPanel,
  type HeroPanelId,
} from "@/components/dashboard/hero-controller";

function writeHeroParam(next: HeroPanelId | null) {
  const url = new URL(window.location.href);
  if (next) url.searchParams.set("hero", next);
  else url.searchParams.delete("hero");
  const nextUrl = `${url.pathname}${url.search}${url.hash}`;
  window.history.replaceState(window.history.state, "", nextUrl);
}

function ignoreEscape(event: KeyboardEvent): boolean {
  if (event.defaultPrevented) return true;
  const target = event.target;
  if (target instanceof Element) {
    if (
      target.closest(
        "[role='listbox'], [data-slot='select-content'], [data-slot='popover-content']",
      )
    ) {
      return true;
    }
  }
  if (
    document.querySelector(
      "[role='listbox'], [data-slot='select-content'], [data-slot='popover-content']",
    )
  ) {
    return true;
  }
  return Boolean(document.querySelector("[role='combobox'][aria-expanded='true']"));
}

function commitHeroChange(apply: () => void) {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const doc = document as Document & {
    startViewTransition?: (callback: () => void) => unknown;
  };
  // Call it as a method: a detached reference throws "Illegal invocation".
  if (!reduce && typeof doc.startViewTransition === "function") {
    try {
      doc.startViewTransition(() => flushSync(apply));
      return;
    } catch {
      // Fall through to a plain update if the transition can't start.
    }
  }
  apply();
}

export function useHeroPanel({
  initial,
  allowReport,
  allowTeam,
}: {
  initial: HeroPanelId | null;
  allowReport: boolean;
  allowTeam: boolean;
}) {
  const allow = useCallback(
    (id: HeroPanelId | null): id is HeroPanelId => {
      if (id === "report") return allowReport;
      if (id === "team") return allowTeam;
      return false;
    },
    [allowReport, allowTeam],
  );

  const [open, setOpen] = useState<HeroPanelId | null>(() =>
    allow(initial) ? initial : null,
  );
  const panelRef = useRef<HTMLDivElement>(null);
  // Ignore null so the panel that is closing cannot clear the node the one
  // that is opening just attached.
  const setPanelNode = useCallback((node: HTMLDivElement | null) => {
    if (node) panelRef.current = node;
  }, []);
  const triggers = useRef<Partial<Record<HeroPanelId, HTMLButtonElement | null>>>({});
  const returnFocus = useRef<HeroPanelId | null>(null);
  const openRef = useRef(open);

  useEffect(() => {
    openRef.current = open;
  });

  const setTrigger = useCallback((id: HeroPanelId) => {
    return (node: HTMLButtonElement | null) => {
      triggers.current[id] = node;
      if (node && returnFocus.current === id) {
        returnFocus.current = null;
        node.focus({ preventScroll: true });
      }
    };
  }, []);

  const openPanel = useCallback(
    (id: HeroPanelId) => {
      if (!allow(id)) return;
      returnFocus.current = null;
      commitHeroChange(() => {
        setOpen(id);
        writeHeroParam(id);
      });
    },
    [allow],
  );

  const close = useCallback((options?: { restoreFocus?: boolean }) => {
    if (options?.restoreFocus === false) {
      returnFocus.current = null;
    } else if (openRef.current) {
      returnFocus.current = openRef.current;
    }
    commitHeroChange(() => {
      setOpen(null);
      writeHeroParam(null);
    });
  }, []);

  useEffect(() => {
    setHeroPanel(open);
    if (!open) return;
    panelRef.current?.focus({ preventScroll: true });
  }, [open]);

  useEffect(() => {
    const param = new URL(window.location.href).searchParams.get("hero");
    if (!param || param === open) return;
    if (!allow(param as HeroPanelId)) writeHeroParam(open);
  }, [allow, open]);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape" || event.repeat) return;
      if (ignoreEscape(event)) return;
      event.preventDefault();
      close();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, close]);

  return { open, openPanel, close, panelRef: setPanelNode, setTrigger };
}
