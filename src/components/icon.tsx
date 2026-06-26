/**
 * Riegel Icon-System — eine kohärente, handgezeichnete Line-Art-Familie
 * (24er-Raster, runde Enden, currentColor) passend zur „Waves"-Ästhetik.
 * Bewusst ohne schwere Icon-Library: volle Kontrolle über Stil & Bundle.
 */
import type { SVGProps } from "react";

export type IconName =
  | "home"
  | "building"
  | "key"
  | "chart"
  | "handshake"
  | "calculator"
  | "calendar"
  | "heart"
  | "search"
  | "shield"
  | "sparkle"
  | "ruler"
  | "euro"
  | "trend"
  | "phone"
  | "mail"
  | "whatsapp"
  | "pin"
  | "arrowRight"
  | "arrowUpRight"
  | "check"
  | "bolt"
  | "bed"
  | "bath"
  | "car"
  | "tree"
  | "compass"
  | "layers"
  | "clock"
  | "star"
  | "users"
  | "doc"
  | "lock";

const PATHS: Record<IconName, React.ReactNode> = {
  home: <path d="M3 10.5 12 4l9 6.5M5 9.5V20h14V9.5M9.5 20v-5h5v5" />,
  building: (
    <>
      <path d="M4 21V5a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v16M15 21V9h4a1 1 0 0 1 1 1v11M3 21h18" />
      <path d="M7.5 8h3M7.5 12h3M7.5 16h3" />
    </>
  ),
  key: (
    <>
      <circle cx="8" cy="8" r="3.5" />
      <path d="m10.5 10.5 8 8M16 16l2-2M18.5 18.5l1.5-1.5" />
    </>
  ),
  chart: <path d="M4 19V5m0 14h16M8 16l3-4 3 2 4-6" />,
  handshake: (
    <path d="m11 17 2 2 4-4 2-2-3.5-3.5a2 2 0 0 0-1.4-.6H9.5L6 8.5M3 13l3 3M14 9l-2-2-1.5 1.5a1.5 1.5 0 1 0 2.1 2.1L14 9Z" />
  ),
  calculator: (
    <>
      <rect x="5" y="3" width="14" height="18" rx="2" />
      <path d="M8 7h8M8 11h.01M12 11h.01M16 11h.01M8 15h.01M12 15h.01M16 15v3M8 18h4" />
    </>
  ),
  calendar: (
    <>
      <rect x="4" y="5" width="16" height="16" rx="2" />
      <path d="M4 9h16M8 3v4M16 3v4M8 13h3M8 17h6" />
    </>
  ),
  heart: <path d="M12 20s-7-4.3-7-9.3A3.7 3.7 0 0 1 12 8a3.7 3.7 0 0 1 7-1.3c0 5-7 9.3-7 9.3Z" />,
  search: (
    <>
      <circle cx="11" cy="11" r="6" />
      <path d="m20 20-4.3-4.3" />
    </>
  ),
  shield: <path d="M12 3 5 6v6c0 4 3 6.5 7 8 4-1.5 7-4 7-8V6l-7-3ZM9 12l2 2 4-4" />,
  sparkle: <path d="M12 3v4M12 17v4M3 12h4M17 12h4M6.5 6.5 9 9M15 15l2.5 2.5M17.5 6.5 15 9M9 15l-2.5 2.5" />,
  ruler: (
    <path d="m4 16 12-12 4 4-12 12-4 4 0-8ZM8 12l1.5 1.5M11 9l1.5 1.5M14 6l1.5 1.5" />
  ),
  euro: <path d="M17 7a6 6 0 1 0 0 10M4 10h7M4 14h6" />,
  trend: <path d="M4 17 10 11l3 3 7-7M16 7h4v4" />,
  phone: (
    <path d="M6.5 4h3l1.5 4-2 1.5a11 11 0 0 0 5 5l1.5-2 4 1.5v3a2 2 0 0 1-2.2 2A16 16 0 0 1 4.5 6.2 2 2 0 0 1 6.5 4Z" />
  ),
  mail: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m4 7 8 6 8-6" />
    </>
  ),
  whatsapp: (
    <path d="M4 20l1.4-4.1A7.5 7.5 0 1 1 8.5 18.6L4 20Zm5.2-9.2c-.2-.4-.3-.4-.5-.4h-.5a1 1 0 0 0-.7.3c-.2.3-.8.8-.8 1.9s.8 2.2 1 2.4c.1.2 1.6 2.5 4 3.4 2 .8 2.4.6 2.8.6.4 0 1.3-.5 1.5-1 .2-.6.2-1 .1-1.1l-.6-.3c-.3-.1-1.3-.6-1.5-.7-.2-.1-.4-.1-.5.1l-.6.8c-.1.2-.3.2-.5.1a6 6 0 0 1-2.9-2.6c-.2-.4 0-.5.1-.7l.4-.5.2-.4v-.5l-.6-1.6Z" />
  ),
  pin: (
    <>
      <path d="M12 21c4-4 7-7.2 7-11a7 7 0 1 0-14 0c0 3.8 3 7 7 11Z" />
      <circle cx="12" cy="10" r="2.5" />
    </>
  ),
  arrowRight: <path d="M5 12h14M13 6l6 6-6 6" />,
  arrowUpRight: <path d="M7 17 17 7M9 7h8v8" />,
  check: <path d="m5 12 4 4 10-10" />,
  bolt: <path d="M13 3 5 13h5l-1 8 8-11h-5l1-7Z" />,
  bed: <path d="M3 18v-6h13a4 4 0 0 1 4 4v2M3 18v-2M21 18v-2M3 12V7M7 10h2a2 2 0 0 1 2 2" />,
  bath: (
    <path d="M4 12h16v3a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4v-3ZM6 12V6a2 2 0 0 1 2-2 2 2 0 0 1 2 2M7 19l-1 2M18 19l1 2" />
  ),
  car: (
    <path d="M5 16v2M19 16v2M4 16v-3l2-5a2 2 0 0 1 1.9-1.3h8.2A2 2 0 0 1 18 8l2 5v3H4ZM4 13h16M7.5 16h.01M16.5 16h.01" />
  ),
  tree: <path d="M12 3 6 11h3l-3 5h12l-3-5h3L12 3ZM12 16v5" />,
  compass: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m15 9-2 5-4 1 2-5 4-1Z" />
    </>
  ),
  layers: <path d="m12 3 9 5-9 5-9-5 9-5ZM3 13l9 5 9-5M3 18l9 5 9-5" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  star: <path d="m12 4 2.4 5 5.6.6-4 4 1 5.4L12 16l-5 3 1-5.4-4-4 5.6-.6L12 4Z" />,
  users: (
    <path d="M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM3 20c0-3 2.7-5 6-5s6 2 6 5M16 5.5a3 3 0 0 1 0 5.8M17 15c2.4.4 4 2.2 4 5" />
  ),
  doc: (
    <>
      <path d="M6 3h8l4 4v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" />
      <path d="M14 3v4h4M8 12h8M8 16h6" />
    </>
  ),
  lock: (
    <>
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3M12 15v2" />
    </>
  ),
};

export interface IconProps extends Omit<SVGProps<SVGSVGElement>, "name"> {
  name: IconName;
  size?: number;
  /** Strichstärke (Default 1.5 — feine, hochwertige Linie). */
  weight?: number;
  title?: string;
}

export function Icon({ name, size = 24, weight = 1.5, title, ...rest }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={weight}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={title ? "img" : "presentation"}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      {...rest}
    >
      {title ? <title>{title}</title> : null}
      {PATHS[name]}
    </svg>
  );
}
