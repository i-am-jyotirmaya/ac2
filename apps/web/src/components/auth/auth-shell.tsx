import type { ReactNode } from "react";

interface AuthShellProps {
  eyebrow: string;
  title: string;
  description: string;
  footer: ReactNode;
  spotlight: ReactNode;
  children: ReactNode;
}

export function AuthShell({
  eyebrow,
  title,
  description,
  footer,
  spotlight,
  children,
}: AuthShellProps) {
  return (
    <main className="relative flex min-h-screen flex-1 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(196,116,59,0.15),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.55),rgba(255,255,255,0))]" />
      <div className="relative z-10 grid flex-1 lg:grid-cols-[minmax(0,1fr)_440px]">
        <section className="flex min-h-[42rem] flex-col justify-between border-border/70 px-6 py-8 sm:px-10 lg:border-r lg:px-14 lg:py-12">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary">
                AC2
              </p>
              <p className="mt-2 max-w-sm text-sm text-muted-foreground">
                API-first image workflows for operator teams shipping templates fast.
              </p>
            </div>
            <div className="rounded-full border border-border/70 bg-background/80 px-4 py-2 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground backdrop-blur">
              Template Studio
            </div>
          </div>

          <div className="mt-12 flex flex-col gap-8 lg:mt-16">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary">
                {eyebrow}
              </p>
              <h1 className="mt-4 max-w-xl text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
                {title}
              </h1>
              <p className="mt-5 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">
                {description}
              </p>
            </div>
            <div className="max-w-2xl">{spotlight}</div>
          </div>

          <div className="mt-12 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <div className="rounded-full border border-border/70 bg-background/80 px-4 py-2 backdrop-blur">
              Deterministic rendering
            </div>
            <div className="rounded-full border border-border/70 bg-background/80 px-4 py-2 backdrop-blur">
              Shared Zod contracts
            </div>
            <div className="rounded-full border border-border/70 bg-background/80 px-4 py-2 backdrop-blur">
              Agent-ready API flows
            </div>
          </div>
        </section>

        <aside className="flex items-center px-6 py-8 sm:px-10 lg:px-12 lg:py-12">
          <div className="w-full rounded-[2rem] border border-border/70 bg-background/88 p-6 shadow-[0_24px_80px_rgba(36,27,18,0.08)] backdrop-blur xl:p-8">
            {children}
            <div className="mt-8 border-t border-border/70 pt-6 text-sm text-muted-foreground">
              {footer}
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
