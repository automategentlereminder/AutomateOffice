import Link from "next/link";

import { tools } from "@/lib/tools/registry";

export default function HomePage() {
  const availableTools = tools.filter((tool) => tool.id !== "home");

  return (
    <main className="flex flex-1 flex-col gap-8 p-6 md:p-8">
      <section className="max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">
          Local automation suite
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
          Corporate work, automated locally.
        </h1>
        <p className="mt-4 text-base leading-7 text-muted-foreground">
          AutomateOffice is a collection of practical tools for everyday
          office workflows. Each tool runs on your machine, stores data locally,
          and stays available when you upgrade to new versions.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {availableTools.length === 0 ? (
          <div className="border border-border bg-card p-6 md:col-span-2 xl:col-span-3">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">
              Coming soon
            </p>
            <h2 className="mt-2 text-xl font-semibold tracking-tight">
              First tool is on the way
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              The shell, sidebar, theme, and local database are ready. We will
              plug in the first automation tool next.
            </p>
          </div>
        ) : (
          availableTools.map((tool) => {
            const Icon = tool.icon;

            return (
              <Link
                key={tool.id}
                href={tool.href}
                className="border border-border bg-card p-6 transition-colors hover:bg-accent/40"
              >
                <div className="flex items-start gap-3">
                  <div className="rounded-sm bg-accent p-2 text-primary">
                    <Icon className="size-4" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold tracking-tight">
                      {tool.name}
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      {tool.description}
                    </p>
                  </div>
                </div>
              </Link>
            );
          })
        )}
      </section>
    </main>
  );
}
