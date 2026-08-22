import { cn } from "@/lib/utils";

type StepStatus = "pending" | "active" | "complete" | "warning";

type StepPanelProps = {
  step: number;
  title: string;
  description: string;
  status: StepStatus;
  hint?: string;
  children: React.ReactNode;
};

const statusStyles: Record<StepStatus, string> = {
  pending: "border-border bg-card text-muted-foreground",
  active: "border-primary bg-card",
  complete: "border-emerald-600/40 bg-emerald-50/40 dark:bg-emerald-950/20",
  warning: "border-amber-500/50 bg-amber-50/40 dark:bg-amber-950/20",
};

const badgeStyles: Record<StepStatus, string> = {
  pending: "bg-muted text-muted-foreground",
  active: "bg-primary text-primary-foreground",
  complete: "bg-emerald-600 text-white",
  warning: "bg-amber-500 text-white",
};

export function StepPanel({
  step,
  title,
  description,
  status,
  hint,
  children,
}: StepPanelProps) {
  return (
    <section
      className={cn(
        "border p-5 md:p-6",
        statusStyles[status],
      )}
    >
      <div className="flex flex-wrap items-start gap-3">
        <span
          className={cn(
            "inline-flex size-8 shrink-0 items-center justify-center text-sm font-semibold",
            badgeStyles[status],
          )}
        >
          {step}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold tracking-tight text-foreground">
            {title}
          </h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            {description}
          </p>
          {hint ? (
            <p className="mt-2 text-xs leading-5 text-muted-foreground">{hint}</p>
          ) : null}
        </div>
      </div>

      <div className="mt-5">{children}</div>
    </section>
  );
}
