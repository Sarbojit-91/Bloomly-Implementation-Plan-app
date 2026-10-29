"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { BarChart3, BookHeart, ChevronDown, LayoutList, LogOut, Menu, Settings, Sun, X } from "lucide-react";
import { Wordmark } from "@/components/brand/bloom";
import { signOut } from "@/lib/actions/auth";
import { cn } from "@/lib/cn";

const LINKS = [
  { href: "/today", label: "Today", icon: Sun },
  { href: "/habits", label: "Habits", icon: LayoutList },
  { href: "/progress", label: "Progress", icon: BarChart3 },
  { href: "/journal", label: "Journal", icon: BookHeart },
];

function isActive(pathname: string, href: string) {
  if (href === "/habits") return pathname.startsWith("/habits") || pathname.startsWith("/templates");
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppNav({ displayName, email }: { displayName: string; email: string }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const initial = (displayName || email || "?").trim().charAt(0).toUpperCase();

  // Close menus when navigating.
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setMobileOpen(false);
    setMenuOpen(false);
  }

  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  return (
    <header className="sticky top-0 z-40 border-b border-line/70 bg-canvas/80 backdrop-blur-xl">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:rounded-xl focus:bg-surface focus:px-4 focus:py-2 focus:shadow-lift"
      >
        Skip to content
      </a>
      <nav aria-label="Main" className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 sm:px-6">
        <Link href="/today" className="rounded-xl" aria-label="Bloomly, go to Today">
          <Wordmark />
        </Link>

        <ul className="ml-6 hidden items-center gap-1 md:flex">
          {LINKS.map(({ href, label, icon: IconC }) => {
            const active = isActive(pathname, href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "relative flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium transition-colors",
                    active ? "text-primary" : "text-ink-soft hover:bg-tint/70 hover:text-ink",
                  )}
                >
                  {active && (
                    <motion.span
                      layoutId="nav-pill"
                      className="absolute inset-0 -z-10 rounded-xl bg-tint"
                      transition={{ type: "spring", stiffness: 500, damping: 38 }}
                    />
                  )}
                  <IconC className="size-4" aria-hidden />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="ml-auto flex items-center gap-2">
          <div className="relative hidden md:block" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
              aria-expanded={menuOpen}
              aria-haspopup="menu"
              className="flex items-center gap-2 rounded-2xl py-1.5 pl-1.5 pr-3 text-sm font-medium text-ink-soft hover:bg-tint/70"
            >
              <span className="grid size-8 place-items-center rounded-xl bg-primary text-sm font-semibold text-primary-ink">
                {initial}
              </span>
              <span className="max-w-32 truncate">{displayName || "Account"}</span>
              <ChevronDown className={cn("size-4 transition-transform", menuOpen && "rotate-180")} aria-hidden />
            </button>
            <AnimatePresence>
              {menuOpen && (
                <motion.div
                  role="menu"
                  initial={{ opacity: 0, y: -6, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.98 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 mt-2 w-64 origin-top-right rounded-2xl border border-line bg-surface p-2 shadow-lift"
                >
                  <div className="px-3 py-2">
                    <p className="truncate text-sm font-semibold text-ink">{displayName || "Bloomly member"}</p>
                    <p className="truncate text-xs text-muted">{email}</p>
                  </div>
                  <div className="my-1 h-px bg-line" />
                  <Link
                    role="menuitem"
                    href="/settings"
                    className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-ink-soft hover:bg-tint hover:text-ink"
                  >
                    <Settings className="size-4" aria-hidden /> Settings
                  </Link>
                  <form action={signOut}>
                    <button
                      role="menuitem"
                      type="submit"
                      className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-ink-soft hover:bg-tint hover:text-ink"
                    >
                      <LogOut className="size-4" aria-hidden /> Sign out
                    </button>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <button
            type="button"
            onClick={() => setMobileOpen((o) => !o)}
            aria-expanded={mobileOpen}
            aria-controls="mobile-nav"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            className="grid size-10 place-items-center rounded-xl text-ink-soft hover:bg-tint md:hidden"
          >
            {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </nav>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            id="mobile-nav"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="overflow-hidden border-t border-line md:hidden"
          >
            <div className="flex flex-col gap-1 px-4 py-3">
              {LINKS.map(({ href, label, icon: IconC }) => {
                const active = isActive(pathname, href);
                return (
                  <Link
                    key={href}
                    href={href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-3 rounded-2xl px-4 py-3 font-medium",
                      active ? "bg-tint text-primary" : "text-ink-soft hover:bg-tint/70",
                    )}
                  >
                    <IconC className="size-5" aria-hidden /> {label}
                  </Link>
                );
              })}
              <div className="my-2 h-px bg-line" />
              <Link
                href="/settings"
                aria-current={pathname === "/settings" ? "page" : undefined}
                className="flex items-center gap-3 rounded-2xl px-4 py-3 font-medium text-ink-soft hover:bg-tint/70"
              >
                <Settings className="size-5" aria-hidden /> Settings
              </Link>
              <form action={signOut}>
                <button
                  type="submit"
                  className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 font-medium text-ink-soft hover:bg-tint/70"
                >
                  <LogOut className="size-5" aria-hidden /> Sign out
                </button>
              </form>
              <p className="px-4 pt-1 text-xs text-muted">Signed in as {email}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
