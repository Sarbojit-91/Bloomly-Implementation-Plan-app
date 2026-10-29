import { diffDays, type ISODate } from "@/lib/dates";

export function greeting(hour: number): string {
  if (hour < 5) return "Good night";
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

/** A short, kind line based on how today is going. Never guilt-trips. */
export function progressMessage(done: number, due: number): { title: string; body: string } {
  if (due === 0) return { title: "A quiet day", body: "Nothing is planned for today. Rest is part of growing, too." };
  if (done === 0) return { title: "Today's a fresh start", body: "Pick the easiest one first. Small wins build momentum." };
  if (done >= due) return { title: "Full bloom!", body: "Everything planned for today is done. Take a moment to enjoy it." };
  const left = due - done;
  if (done / due >= 0.5)
    return { title: "More than halfway there", body: `Just ${left} more to go. You're doing beautifully.` };
  return { title: "Nice start", body: `${done} down, ${left} to go. Every check-in counts.` };
}

const SEEDS = [
  "Progress, not perfection.",
  "Tiny habits grow into big changes.",
  "Showing up is the hardest part, and you're here.",
  "A missed day is just a pause, not a reset of who you are.",
  "Be as patient with yourself as you would be with a seedling.",
  "Consistency is built one ordinary day at a time.",
  "You don't have to do it all today. Just the next small thing.",
  "Every check-in is a vote for the person you're becoming.",
  "Gentle and steady still gets there.",
  "Celebrate the small stuff. It adds up.",
];

/** A thought for the day that stays the same all day. */
export function dailySeed(today: ISODate): string {
  const idx = Math.abs(diffDays("2026-01-01", today)) % SEEDS.length;
  return SEEDS[idx];
}
