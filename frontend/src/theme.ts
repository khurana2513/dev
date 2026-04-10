/**
 * BlackMonkey brand tokens — single source of truth for all brand references.
 * Import { BRAND } from "@/theme" anywhere instead of hardcoding strings.
 */
export const BRAND = {
  name: "BlackMonkey",
  shortName: "BM",
  tagline: "Next-Gen Math Education",
  taglineLong: "Where Brilliant Minds Are Built",
  description:
    "The all-in-one platform for abacus and mental maths education — built for institutes, loved by students.",
  /** Primary brand colour (deep violet) */
  primaryColor: "#7C3AED",
  /** Secondary accent (cyan) */
  accentColor: "#06B6D4",
  /** Dark background */
  bgColor: "#07070F",
  logo: "/logo.png",
  logoAlt: "BlackMonkey",
  website: "https://blackmonkey.in",
  supportEmail: "support@blackmonkey.in",
  social: {
    twitter: "https://twitter.com/blackmonkeyapp",
    instagram: "https://instagram.com/blackmonkeyapp",
  },
  /** App store short name used in PWA manifest / meta tags */
  appName: "BlackMonkey – Math Education",
  appShortName: "BlackMonkey",
} as const;

export type Brand = typeof BRAND;
