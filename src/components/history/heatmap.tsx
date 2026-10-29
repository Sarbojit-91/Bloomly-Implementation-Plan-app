import { addDays, endOfWeek, formatMonth, formatShort, startOfWeek, type ISODate } from "@/lib/dates";
import { cn } from "@/lib/cn";

/**
 * GitHub-style activity heatmap: one column per week (Monday on top), one
 * square per day, darker = more completions. Server-rendered, no JS needed.
 */
export function Heatmap({
  counts,
  today,
  weeks = 53,
  max,
  color = "var(--primary)",
  label,
  unit = "habit",
}: {
  counts: Record<ISODate, number>;
  today: ISODate;
  weeks?: number;
  /** Value that renders as the darkest shade; defaults to the busiest day. */
  max?: number;
  color?: string;
  label: string;
  unit?: string;
}) {
  const end = endOfWeek(today);
  const start = addDays(startOfWeek(today), -7 * (weeks - 1));
  const peak = Math.max(1, max ?? Math.max(0, ...Object.values(counts)));
  const columns: ISODate[][] = [];
  for (let w = start; w <= end; w = addDays(w, 7)) {
    columns.push(Array.from({ length: 7 }, (_, i) => addDays(w, i)));
  }
  const total = Object.entries(counts).reduce((n, [d, c]) => (d >= start && d <= today ? n + c : n), 0);

  const shade = (n: number) => {
    if (n <= 0) return undefined;
    const level = Math.min(4, Math.ceil((n / peak) * 4));
    return `color-mix(in srgb, ${color} ${[0, 30, 52, 75, 100][level]}%, var(--tint))`;
  };

  return (
    <figure className="flex flex-col gap-3">
      <div className="overflow-x-auto pb-1 [scrollbar-width:thin]">
        <div className="inline-flex flex-col gap-1.5" role="img" aria-label={`${label}: ${total} completions in the last ${weeks} weeks`}>
          <div className="flex gap-[3px] pl-7 text-[10px] text-muted" aria-hidden>
            {columns.map((col, i) => {
              // Label a column when a new month starts in it.
              const firstOfMonth = col.find((d) => d.endsWith("-01"));
              return (
                <span key={i} className="w-3 shrink-0 overflow-visible whitespace-nowrap">
                  {firstOfMonth && i < columns.length - 1 ? formatMonth(firstOfMonth).slice(0, 3) : ""}
                </span>
              );
            })}
          </div>
          <div className="flex gap-[3px]">
            <div className="mr-1 flex w-6 flex-col gap-[3px] text-[10px] leading-3 text-muted" aria-hidden>
              {["Mon", "", "Wed", "", "Fri", "", ""].map((d, i) => (
                <span key={i} className="h-3">
                  {d}
                </span>
              ))}
            </div>
            {columns.map((col, i) => (
              <div key={i} className="flex flex-col gap-[3px]">
                {col.map((d) => {
                  const n = counts[d] ?? 0;
                  const future = d > today;
                  return (
                    <span
                      key={d}
                      title={future ? undefined : `${formatShort(d)}: ${n} ${unit}${n === 1 ? "" : "s"} completed`}
                      className={cn(
                        "size-3 rounded-[3px]",
                        future ? "bg-transparent" : "bg-tint",
                        d === today && "ring-1 ring-accent ring-offset-1 ring-offset-surface",
                      )}
                      style={!future && n > 0 ? { backgroundColor: shade(n) } : undefined}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
      <figcaption className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
        <span>
          {total} completion{total === 1 ? "" : "s"} in the last year
        </span>
        <span className="flex items-center gap-1.5" aria-hidden>
          Less
          {[0, 1, 2, 3, 4].map((l) => (
            <span
              key={l}
              className="size-3 rounded-[3px] bg-tint"
              style={l ? { backgroundColor: `color-mix(in srgb, ${color} ${[0, 30, 52, 75, 100][l]}%, var(--tint))` } : undefined}
            />
          ))}
          More
        </span>
      </figcaption>
    </figure>
  );
}
