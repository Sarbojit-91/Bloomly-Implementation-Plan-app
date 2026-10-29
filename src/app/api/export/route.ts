import { NextResponse, type NextRequest } from "next/server";
import { getProfile, getUser, listAchievements, listCompletions, listHabits, listJournalEntries } from "@/lib/data";
import { todayInTimeZone } from "@/lib/dates";
import { ACHIEVEMENTS } from "@/lib/habits/achievements";
import { categoryLabel } from "@/lib/habits/catalog";

/** CSV cell escaping, including protection against spreadsheet formula injection. */
function cell(value: unknown): string {
  let s = value == null ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function toCsv(header: string[], rows: unknown[][]): string {
  return [header, ...rows].map((r) => r.map(cell).join(",")).join("\r\n") + "\r\n";
}

/**
 * Downloads the signed-in user's own data. Queries run under the user's
 * session, so row-level security guarantees nobody else's data is included.
 */
export async function GET(request: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const format = request.nextUrl.searchParams.get("format") ?? "json";
  const type = request.nextUrl.searchParams.get("type") ?? "completions";
  const [profile, habits, completions, journal, achievements] = await Promise.all([
    getProfile(),
    listHabits(),
    listCompletions(),
    listJournalEntries(),
    listAchievements(),
  ]);
  const stamp = todayInTimeZone(profile.timezone);
  const habitName = new Map(habits.map((h) => [h.id, h.name]));

  const download = (body: string, filename: string, contentType: string) =>
    new NextResponse(body, {
      headers: {
        "Content-Type": `${contentType}; charset=utf-8`,
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });

  if (format === "csv" && type === "journal") {
    const csv = toCsv(
      ["date", "mood", "reflection", "notes"],
      journal.map((j) => [j.date, j.mood ?? "", j.reflection, j.notes]),
    );
    return download(csv, `bloomly-journal-${stamp}.csv`, "text/csv");
  }

  if (format === "csv") {
    const csv = toCsv(
      ["date", "habit", "value", "unit", "habit_id"],
      completions.map((c) => [
        c.date,
        habitName.get(c.habitId) ?? "",
        c.value ?? "",
        habits.find((h) => h.id === c.habitId)?.unit ?? "",
        c.habitId,
      ]),
    );
    return download(csv, `bloomly-completions-${stamp}.csv`, "text/csv");
  }

  const data = {
    exportedAt: new Date().toISOString(),
    profile: { email: profile.email, displayName: profile.displayName, timezone: profile.timezone, theme: profile.theme },
    habits: habits.map((h) => ({
      id: h.id,
      name: h.name,
      description: h.description,
      category: categoryLabel(h.category),
      icon: h.icon,
      color: h.color,
      scheduleDays: h.scheduleDays,
      weeklyGoal: h.weeklyGoal,
      target: h.targetValue == null ? null : { value: h.targetValue, unit: h.unit },
      reminderTime: h.reminderTime,
      createdOn: h.createdOn,
      archived: Boolean(h.archivedAt),
    })),
    completions: completions.map((c) => ({ habitId: c.habitId, habit: habitName.get(c.habitId), date: c.date, value: c.value })),
    journal: journal.map((j) => ({ date: j.date, mood: j.mood, reflection: j.reflection, notes: j.notes })),
    achievements: achievements.map((a) => ({
      key: a.key,
      title: ACHIEVEMENTS[a.key]?.title ?? a.key,
      habit: a.habitId ? habitName.get(a.habitId) : null,
      earnedAt: a.earnedAt,
    })),
  };
  return download(JSON.stringify(data, null, 2), `bloomly-export-${stamp}.json`, "application/json");
}
