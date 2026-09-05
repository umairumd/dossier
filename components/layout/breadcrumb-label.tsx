"use client";

import { useEffect } from "react";

export function BreadcrumbLabel({ label }: { label: string }) {
  useEffect(() => {
    document.documentElement.setAttribute("data-breadcrumb-label", label);
    return () => {
      document.documentElement.removeAttribute("data-breadcrumb-label");
    };
  }, [label]);

  return null;
}
