"use server";

import { getAuthUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchLinkPreview } from "@/lib/links/fetch-preview";
import { canFetchTitle, parseLink } from "@/lib/links/known";

export type LinkPreview = {
  title: string | null;
  siteName: string | null;
  iconUrl: string | null;
};

const FRESH_MS = 7 * 24 * 60 * 60 * 1000;
const FAILED_RETRY_MS = 24 * 60 * 60 * 1000;
const MAX_URLS = 20;
const MAX_FETCHES = 6;

/** Titles and icons for links on screen. Cached for everyone; fetched once. */
export async function getLinkPreviews(
  rawUrls: string[],
): Promise<Record<string, LinkPreview | null>> {
  const user = await getAuthUser();
  if (!user || !Array.isArray(rawUrls)) return {};

  const urls = [
    ...new Set(
      rawUrls
        .slice(0, MAX_URLS)
        .map((raw) => (typeof raw === "string" ? parseLink(raw) : null))
        .flatMap((link) =>
          link?.kind === "web" && canFetchTitle(link.app) && link.url.length <= 2000
            ? [link.url]
            : [],
        ),
    ),
  ];
  if (urls.length === 0) return {};

  const admin = createAdminClient();
  const { data: cached } = await admin
    .from("link_previews")
    .select("url, title, site_name, icon_url, ok, fetched_at")
    .in("url", urls);

  const now = Date.now();
  const result: Record<string, LinkPreview | null> = {};
  const stale: string[] = [];
  const byUrl = new Map((cached ?? []).map((row) => [row.url as string, row]));
  for (const url of urls) {
    const row = byUrl.get(url);
    const age = row ? now - new Date(row.fetched_at as string).getTime() : Infinity;
    if (row && age < (row.ok ? FRESH_MS : FAILED_RETRY_MS)) {
      result[url] = row.ok
        ? { title: row.title, siteName: row.site_name, iconUrl: row.icon_url }
        : null;
    } else {
      stale.push(url);
    }
  }

  const fetched = await Promise.all(
    stale.slice(0, MAX_FETCHES).map(async (url) => ({ url, preview: await fetchLinkPreview(url) })),
  );
  if (fetched.length > 0) {
    await admin.from("link_previews").upsert(
      fetched.map(({ url, preview }) => ({
        url,
        title: preview.title,
        site_name: preview.siteName,
        icon_url: preview.iconUrl,
        ok: preview.ok,
        fetched_at: new Date().toISOString(),
      })),
    );
  }
  for (const { url, preview } of fetched) {
    result[url] = preview.ok
      ? { title: preview.title, siteName: preview.siteName, iconUrl: preview.iconUrl }
      : null;
  }
  return result;
}
