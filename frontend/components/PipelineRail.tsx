"use client";

export type Stage = "upload" | "preview" | "extract" | "done";

const STAGES: { key: Stage; label: string; hint: string }[] = [
  { key: "upload", label: "Upload", hint: "01" },
  { key: "preview", label: "Preview", hint: "02" },
  { key: "extract", label: "Extract", hint: "03" },
  { key: "done", label: "Imported", hint: "04" },
];

export function PipelineRail({ stage }: { stage: Stage }) {
  const activeIndex = STAGES.findIndex((s) => s.key === stage);

  return (
    <div className="w-full">
      <div className="flex items-stretch">
        {STAGES.map((s, i) => {
          const isDone = i < activeIndex;
          const isActive = i === activeIndex;
          return (
            <div key={s.key} className="flex flex-1 items-center last:flex-none">
              <div className="flex items-center gap-3">
                <div
                  className={[
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border font-display text-xs font-semibold transition-colors duration-300",
                    isActive
                      ? "border-accent bg-accent text-[#0e1015]"
                      : isDone
                      ? "border-accent/60 bg-accent-soft text-accent"
                      : "border-border-strong text-text-faint",
                  ].join(" ")}
                >
                  {s.hint}
                </div>
                <span
                  className={[
                    "hidden font-display text-sm font-medium tracking-wide sm:inline",
                    isActive ? "text-text" : isDone ? "text-text-muted" : "text-text-faint",
                  ].join(" ")}
                >
                  {s.label}
                </span>
              </div>
              {i < STAGES.length - 1 && (
                <div className="mx-3 h-px flex-1 bg-border">
                  <div
                    className="h-px bg-accent transition-all duration-500 ease-out"
                    style={{ width: isDone ? "100%" : "0%" }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
