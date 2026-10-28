import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

// Reads a public page's title and icon for a link card. Server only.
// Guards: http(s) on the default ports, every hop's host must resolve to a
// public address, at most 3 redirects, 3 seconds, and the first 200 KB.

export type FetchedPreview = {
  ok: boolean;
  title: string | null;
  siteName: string | null;
  iconUrl: string | null;
};

const TIMEOUT_MS = 3000;
const MAX_BYTES = 200_000;
const MAX_REDIRECTS = 3;
const FAILED: FetchedPreview = { ok: false, title: null, siteName: null, iconUrl: null };

function isPrivateV4(ip: string): boolean {
  const [a, b] = ip.split(".").map(Number);
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224
  );
}

function isPrivateAddress(ip: string): boolean {
  if (isIP(ip) === 4) return isPrivateV4(ip);
  const v6 = ip.toLowerCase();
  const mapped = v6.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return isPrivateV4(mapped[1]);
  return (
    v6 === "::" ||
    v6 === "::1" ||
    v6.startsWith("fc") ||
    v6.startsWith("fd") ||
    v6.startsWith("fe8") ||
    v6.startsWith("fe9") ||
    v6.startsWith("fea") ||
    v6.startsWith("feb") ||
    v6.startsWith("ff")
  );
}

async function isPublicUrl(url: URL): Promise<boolean> {
  if (url.protocol !== "http:" && url.protocol !== "https:") return false;
  if (url.port && url.port !== "80" && url.port !== "443") return false;
  if (url.username || url.password) return false;
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".internal")) {
    return false;
  }
  try {
    const addresses = isIP(host) ? [{ address: host }] : await lookup(host, { all: true });
    return addresses.length > 0 && addresses.every(({ address }) => !isPrivateAddress(address));
  } catch {
    return false;
  }
}

const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

function decodeEntities(value: string): string {
  return value.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, code: string) => {
    if (code[0] === "#") {
      const n = code[1].toLowerCase() === "x" ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return Number.isFinite(n) && n > 0 && n < 0x110000 ? String.fromCodePoint(n) : match;
    }
    return ENTITIES[code.toLowerCase()] ?? match;
  });
}

function clean(value: string | null | undefined, max = 200): string | null {
  if (!value) return null;
  const text = decodeEntities(value).replace(/\s+/g, " ").trim();
  return text ? text.slice(0, max) : null;
}

function attr(tag: string, name: string): string | null {
  const match = tag.match(new RegExp(`\\b${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, "i"));
  return match ? (match[2] ?? match[3] ?? match[4] ?? null) : null;
}

function metaContent(html: string, key: string): string | null {
  for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
    const name = attr(tag, "property") ?? attr(tag, "name");
    if (name?.toLowerCase() === key) return attr(tag, "content");
  }
  return null;
}

function iconHref(html: string): string | null {
  let best: string | null = null;
  for (const tag of html.match(/<link\b[^>]*>/gi) ?? []) {
    const rel = attr(tag, "rel")?.toLowerCase() ?? "";
    if (!rel.split(/\s+/).includes("icon") && !rel.includes("apple-touch-icon")) continue;
    const href = attr(tag, "href");
    if (!href) continue;
    if (rel.includes("apple-touch-icon")) return href;
    best ??= href;
  }
  return best;
}

async function readCapped(response: Response): Promise<string> {
  const reader = response.body?.getReader();
  if (!reader) return "";
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (size < MAX_BYTES) {
    const { done, value } = await reader.read();
    if (done || !value) break;
    chunks.push(value);
    size += value.byteLength;
  }
  await reader.cancel().catch(() => {});
  return new TextDecoder("utf-8", { fatal: false }).decode(
    Buffer.concat(chunks.map((chunk) => Buffer.from(chunk))).subarray(0, MAX_BYTES),
  );
}

export async function fetchLinkPreview(rawUrl: string): Promise<FetchedPreview> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return FAILED;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    let response: Response | null = null;
    for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
      if (!(await isPublicUrl(url))) return FAILED;
      response = await fetch(url, {
        redirect: "manual",
        signal: controller.signal,
        headers: {
          "user-agent": "Mozilla/5.0 (compatible; DossierLinkPreview/1.0)",
          accept: "text/html,application/xhtml+xml",
        },
        cache: "no-store",
      });
      const location = response.headers.get("location");
      if (response.status >= 300 && response.status < 400 && location) {
        await response.body?.cancel().catch(() => {});
        url = new URL(location, url);
        response = null;
        continue;
      }
      break;
    }
    if (!response || !response.ok) return FAILED;
    const type = response.headers.get("content-type") ?? "";
    if (!type.includes("text/html") && !type.includes("application/xhtml")) {
      await response.body?.cancel().catch(() => {});
      return FAILED;
    }

    const html = await readCapped(response);
    const head = html.split(/<\/head>/i)[0] ?? html;
    const title =
      clean(metaContent(head, "og:title")) ??
      clean(metaContent(head, "twitter:title")) ??
      clean(head.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]);
    const siteName = clean(metaContent(head, "og:site_name"), 80);
    const href = iconHref(head);
    let iconUrl: string | null = null;
    try {
      const icon = new URL(href ?? "/favicon.ico", url);
      if (icon.protocol === "https:" || icon.protocol === "http:") iconUrl = icon.toString();
    } catch {
      iconUrl = null;
    }
    return { ok: Boolean(title), title, siteName, iconUrl };
  } catch {
    return FAILED;
  } finally {
    clearTimeout(timer);
  }
}
