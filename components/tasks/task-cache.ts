"use client";

import { loadTaskDetail } from "@/lib/actions/tasks";
import type { TaskDetail } from "@/types/task";

// Task details kept for the session so the window opens with everything in
// place. Rows prefetch on hover; the window shows what's cached at once and
// refreshes it quietly in the background.

const FRESH_MS = 30_000;
const cache = new Map<string, { detail: TaskDetail; at: number }>();
const inflight = new Map<string, Promise<TaskDetail | null>>();

export function getCachedTask(id: string): TaskDetail | null {
  return cache.get(id)?.detail ?? null;
}

export function setCachedTask(detail: TaskDetail) {
  cache.set(detail.id, { detail, at: Date.now() });
}

export function fetchTask(id: string, force = false): Promise<TaskDetail | null> {
  const hit = cache.get(id);
  if (!force && hit && Date.now() - hit.at < FRESH_MS) return Promise.resolve(hit.detail);
  const running = inflight.get(id);
  if (running && !force) return running;
  const request = loadTaskDetail(id)
    .then((detail) => {
      if (detail) setCachedTask(detail);
      else cache.delete(id);
      return detail;
    })
    .catch(() => getCachedTask(id))
    .finally(() => inflight.delete(id));
  inflight.set(id, request);
  return request;
}

export function prefetchTask(id: string) {
  void fetchTask(id);
}
