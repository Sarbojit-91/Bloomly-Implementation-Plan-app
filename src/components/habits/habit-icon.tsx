import {
  Apple,
  Bike,
  BookHeart,
  BookOpen,
  Brain,
  Briefcase,
  Code,
  Coffee,
  Droplets,
  Dumbbell,
  Flame,
  Flower2,
  Footprints,
  GraduationCap,
  Heart,
  Languages,
  Leaf,
  Medal,
  Moon,
  Music,
  NotebookPen,
  Palette,
  PenLine,
  Phone,
  Sparkles,
  Sprout,
  Sun,
  Target,
  Timer,
  TreeDeciduous,
  Trophy,
  type LucideIcon,
} from "lucide-react";
import { colorHex } from "@/lib/habits/catalog";
import { cn } from "@/lib/cn";

export const ICON_COMPONENTS: Record<string, LucideIcon> = {
  Apple,
  Bike,
  BookHeart,
  BookOpen,
  Brain,
  Briefcase,
  Code,
  Coffee,
  Droplets,
  Dumbbell,
  Flame,
  Flower2,
  Footprints,
  GraduationCap,
  Heart,
  Languages,
  Leaf,
  Medal,
  Moon,
  Music,
  NotebookPen,
  Palette,
  PenLine,
  Phone,
  Sparkles,
  Sprout,
  Sun,
  Target,
  Timer,
  TreeDeciduous,
  Trophy,
};

export function Icon({ name, className }: { name: string; className?: string }) {
  const C = ICON_COMPONENTS[name] ?? Sprout;
  return <C className={className} aria-hidden />;
}

/** A habit's icon on a soft tile in its colour. */
export function HabitIcon({
  icon,
  color,
  size = "md",
  className,
}: {
  icon: string;
  color: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const hex = colorHex(color);
  const sizes = { sm: "size-9 rounded-xl", md: "size-11 rounded-2xl", lg: "size-14 rounded-2xl" };
  const iconSizes = { sm: "size-4", md: "size-5", lg: "size-7" };
  return (
    <span
      className={cn("grid shrink-0 place-items-center", sizes[size], className)}
      style={{ backgroundColor: `color-mix(in srgb, ${hex} 16%, transparent)`, color: hex }}
    >
      <Icon name={icon} className={iconSizes[size]} />
    </span>
  );
}
