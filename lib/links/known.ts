// Recognises links from the URL alone. Safe in the browser and on the server.

export type KnownApp =
  | "docs"
  | "sheets"
  | "slides"
  | "forms"
  | "drive"
  | "figma"
  | "notion"
  | "canva"
  | "loom"
  | "youtube";

export const KNOWN_APP_NAMES: Record<KnownApp, string> = {
  docs: "Google Docs",
  sheets: "Google Sheets",
  slides: "Google Slides",
  forms: "Google Forms",
  drive: "Google Drive",
  figma: "Figma",
  notion: "Notion",
  canva: "Canva",
  loom: "Loom",
  youtube: "YouTube",
};

/** What a Google file is called when we can't read its title. */
const KNOWN_APP_NOUNS: Partial<Record<KnownApp, string>> = {
  docs: "Document",
  sheets: "Spreadsheet",
  slides: "Presentation",
  forms: "Form",
  drive: "File",
  figma: "Design",
  canva: "Design",
};

export type ParsedLink =
  | { kind: "web"; url: string; host: string; app: KnownApp | null }
  | { kind: "file"; url: string; name: string };

function hostOf(url: URL): string {
  return url.hostname.replace(/^www\./, "").toLowerCase();
}

export function knownApp(url: URL): KnownApp | null {
  const host = hostOf(url);
  const path = url.pathname;
  if (host === "docs.google.com") {
    if (path.startsWith("/document")) return "docs";
    if (path.startsWith("/spreadsheets")) return "sheets";
    if (path.startsWith("/presentation")) return "slides";
    if (path.startsWith("/forms")) return "forms";
    return "drive";
  }
  if (host === "drive.google.com") return "drive";
  if (host === "figma.com" || host.endsWith(".figma.com")) return "figma";
  if (host === "notion.so" || host.endsWith(".notion.so") || host.endsWith(".notion.site")) {
    return "notion";
  }
  if (host === "canva.com" || host.endsWith(".canva.com")) return "canva";
  if (host === "loom.com" || host.endsWith(".loom.com")) return "loom";
  if (host === "youtube.com" || host === "m.youtube.com" || host === "youtu.be") return "youtube";
  return null;
}

/** Google files need a sign-in, so their pages can't be read for a title. */
export function canFetchTitle(app: KnownApp | null): boolean {
  return app == null || app === "youtube" || app === "loom" || app === "figma" || app === "notion";
}

export function parseLink(raw: string): ParsedLink | null {
  const value = raw.trim();
  if (/^file:\/\//i.test(value)) {
    const last = decodeSafe(value.split(/[\\/]/).filter(Boolean).pop() ?? value);
    return { kind: "file", url: value, name: last };
  }
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  return { kind: "web", url: url.toString(), host: hostOf(url), app: knownApp(url) };
}

function decodeSafe(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

/** Title to show before (or instead of) a fetched one. */
export function fallbackTitle(link: Extract<ParsedLink, { kind: "web" }>): string {
  if (link.app) return KNOWN_APP_NOUNS[link.app] ?? KNOWN_APP_NAMES[link.app];
  return link.host;
}

export function siteLabel(link: Extract<ParsedLink, { kind: "web" }>): string {
  return link.app ? KNOWN_APP_NAMES[link.app] : link.host;
}
