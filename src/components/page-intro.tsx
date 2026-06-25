import { Container } from "@/components/container";

export function PageIntro({
  eyebrow,
  title,
  children,
}: {
  eyebrow?: string;
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <section className="border-b border-border pb-16 pt-36">
      <Container>
        {eyebrow && (
          <span className="inline-block rounded-full border border-border px-3 py-1 text-[0.65rem] uppercase tracking-[0.25em] text-muted">
            {eyebrow}
          </span>
        )}
        <h1 className="mt-5 text-4xl font-semibold sm:text-5xl">{title}</h1>
        {children && (
          <div className="mt-5 max-w-2xl text-lg text-muted">{children}</div>
        )}
      </Container>
    </section>
  );
}
