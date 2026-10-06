export const CHEEK_STYLES = ["none", "soft", "rosy", "freckles"] as const;
export type CheekStyle = (typeof CHEEK_STYLES)[number];
