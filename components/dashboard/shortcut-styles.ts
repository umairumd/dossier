// Shared by the shortcut cards (client) and their loading shape (server), so
// both lay out the same. Plain strings: a "use client" module can't export
// values to server components.

// Two to a row on a phone, the odd one out full width; three to a row above.
export const SHORTCUT_GRID =
  "grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 [&>:last-child:nth-child(odd)]:col-span-2 sm:[&>:last-child:nth-child(odd)]:col-span-1";

// The card is a size container: when it is narrow (two to a row on a phone)
// the icon stacks above the text and the chevron is dropped.
export const SHORTCUT_CARD =
  "@container surface-card group block w-full rounded-xl bg-card px-4 py-3.5 text-left";

export const SHORTCUT_BODY =
  "flex flex-col items-start gap-3 @[15rem]:flex-row @[15rem]:items-center @[15rem]:gap-3.5";
