import Link from "next/link";
import { Icon, type IconName } from "@/components/icon";

/** Bento-Grid: asymmetrisches Kachel-Layout, dark-first, Akzent-Glow beim Hover. */
export function BentoGrid({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`grid grid-cols-1 gap-3 sm:grid-cols-2 lg:auto-rows-[minmax(0,1fr)] lg:grid-cols-4 ${className}`}
    >
      {children}
    </div>
  );
}

type Span = "1" | "2" | "3" | "4";

const colSpan: Record<Span, string> = {
  "1": "lg:col-span-1",
  "2": "lg:col-span-2",
  "3": "lg:col-span-3",
  "4": "lg:col-span-4",
};
const rowSpan: Record<Span, string> = {
  "1": "lg:row-span-1",
  "2": "lg:row-span-2",
  "3": "lg:row-span-3",
  "4": "lg:row-span-4",
};

export function BentoTile({
  icon,
  eyebrow,
  title,
  children,
  href,
  cta,
  cols = "1",
  rows = "1",
  accent = false,
  className = "",
}: {
  icon?: IconName;
  eyebrow?: string;
  title: React.ReactNode;
  children?: React.ReactNode;
  href?: string;
  cta?: string;
  cols?: Span;
  rows?: Span;
  accent?: boolean;
  className?: string;
}) {
  const inner = (
    <>
      {/* Akzent-Glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-accent/0 blur-3xl transition-[background-color] duration-700 group-hover:bg-accent/20"
      />
      <div className="relative flex h-full flex-col">
        {icon ? (
          <div
            className={`mb-5 flex h-11 w-11 items-center justify-center rounded-xl border transition-colors duration-500 ${
              accent
                ? "border-on-accent/20 bg-on-accent/10 text-on-accent"
                : "border-border bg-surface-2 text-accent group-hover:border-accent/50"
            }`}
          >
            <Icon name={icon} size={22} />
          </div>
        ) : null}
        {eyebrow ? (
          <span
            className={`text-[0.65rem] uppercase tracking-[0.25em] ${
              accent ? "text-on-accent/70" : "text-faint"
            }`}
          >
            {eyebrow}
          </span>
        ) : null}
        <h3
          className={`mt-1 text-xl font-semibold ${accent ? "text-on-accent" : "text-fg"}`}
        >
          {title}
        </h3>
        {children ? (
          <div className={`mt-3 text-sm ${accent ? "text-on-accent/85" : "text-muted"}`}>
            {children}
          </div>
        ) : null}
        {cta ? (
          <div
            className={`mt-auto flex items-center gap-2 pt-6 text-sm font-medium ${
              accent ? "text-on-accent" : "text-accent"
            }`}
          >
            <span>{cta}</span>
            <span className="transition-transform duration-300 group-hover:translate-x-1">
              <Icon name="arrowRight" size={18} />
            </span>
          </div>
        ) : null}
      </div>
    </>
  );

  const base = `group relative overflow-hidden rounded-2xl border p-6 transition-[transform,border-color,background-color] duration-500 ${
    accent
      ? "border-accent bg-accent hover:bg-accent-hover"
      : "border-border bg-surface hover:border-accent/50 hover:-translate-y-0.5"
  } ${colSpan[cols]} ${rowSpan[rows]} ${className}`;

  if (href) {
    return (
      <Link href={href} className={base}>
        {inner}
      </Link>
    );
  }
  return <div className={base}>{inner}</div>;
}
