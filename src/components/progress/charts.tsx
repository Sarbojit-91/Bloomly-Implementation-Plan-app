"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatShort } from "@/lib/dates";

export interface TrendDatum {
  week: string; // ISO date of week start
  rate: number | null; // 0–100
  completed: number;
}

export interface DailyDatum {
  date: string;
  count: number;
}

const axisTick = { fill: "var(--muted)", fontSize: 12 };

function TooltipCard({ title, lines }: { title: string; lines: string[] }) {
  return (
    <div className="rounded-xl border border-line bg-surface px-3 py-2 text-xs shadow-lift">
      <p className="font-semibold text-ink">{title}</p>
      {lines.map((l) => (
        <p key={l} className="text-ink-soft">
          {l}
        </p>
      ))}
    </div>
  );
}

/** Overall completion rate per week. A single series, so no legend: the title names it. */
export function WeeklyTrendChart({ data }: { data: TrendDatum[] }) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
          <defs>
            <linearGradient id="trend-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.28} />
              <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="0" />
          <XAxis
            dataKey="week"
            tickFormatter={(d: string) => formatShort(d)}
            tick={axisTick}
            axisLine={false}
            tickLine={false}
            minTickGap={24}
          />
          <YAxis
            domain={[0, 100]}
            ticks={[0, 50, 100]}
            tickFormatter={(v: number) => `${v}%`}
            tick={axisTick}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            cursor={{ stroke: "var(--accent)", strokeWidth: 1 }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const p = payload[0].payload as TrendDatum;
              return (
                <TooltipCard
                  title={`Week of ${formatShort(p.week)}`}
                  lines={[p.rate == null ? "Nothing scheduled" : `${p.rate}% complete`, `${p.completed} check-ins`]}
                />
              );
            }}
          />
          <Area
            type="monotone"
            dataKey="rate"
            stroke="var(--primary)"
            strokeWidth={2}
            fill="url(#trend-fill)"
            connectNulls
            dot={{ r: 4, fill: "var(--primary)", stroke: "var(--surface)", strokeWidth: 2 }}
            activeDot={{ r: 5, stroke: "var(--surface)", strokeWidth: 2, fill: "var(--primary)" }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Check-ins per day for the last 30 days. */
export function DailyBarsChart({ data }: { data: DailyDatum[] }) {
  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }} barCategoryGap={2}>
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis
            dataKey="date"
            tickFormatter={(d: string) => formatShort(d)}
            tick={axisTick}
            axisLine={false}
            tickLine={false}
            minTickGap={28}
          />
          <YAxis allowDecimals={false} tick={axisTick} axisLine={false} tickLine={false} />
          <Tooltip
            cursor={{ fill: "var(--tint)", opacity: 0.6 }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const p = payload[0].payload as DailyDatum;
              return <TooltipCard title={formatShort(p.date)} lines={[`${p.count} check-in${p.count === 1 ? "" : "s"}`]} />;
            }}
          />
          <Bar dataKey="count" fill="var(--accent)" radius={[4, 4, 0, 0]} maxBarSize={18} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
