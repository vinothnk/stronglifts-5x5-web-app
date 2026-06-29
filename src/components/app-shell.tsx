"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import type { LucideIcon } from "lucide-react";
import { Dumbbell, Gauge, History, Home, LineChart, LogOut, Scale, Settings, Sparkles, StickyNote } from "lucide-react";
import { cn, api } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/workout", label: "Workout", icon: Dumbbell },
  { href: "/working-weights", label: "Weights", icon: Gauge },
  { href: "/assistance", label: "Assist", icon: Sparkles },
  { href: "/history", label: "History", icon: History },
  { href: "/analytics", label: "Analytics", icon: LineChart },
  { href: "/body-weight", label: "Weight", icon: Scale },
  { href: "/notes", label: "Notes", icon: StickyNote },
  { href: "/settings", label: "Settings", icon: Settings }
];

export function AppShell({
  children,
  user
}: {
  children: React.ReactNode;
  user: { email: string; onboardingComplete: boolean };
}) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!user.onboardingComplete && pathname !== "/onboarding") router.replace("/onboarding");
  }, [pathname, router, user.onboardingComplete]);

  async function logout() {
    await api("/api/auth/logout", { method: "POST", body: "{}" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[240px_1fr]">
      <aside className="hidden border-r border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 lg:block">
        <Link href="/dashboard" className="flex items-center gap-2 text-xl font-bold">
          <span className="grid size-9 place-items-center rounded-md bg-steel text-white">5</span>
          StrongLifts
        </Link>
        <nav className="mt-8 space-y-1">
          {nav.map((item) => <NavItem key={item.href} item={item} active={pathname.startsWith(item.href)} />)}
        </nav>
      </aside>
      <div className="pb-20 lg:pb-0">
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90 sm:px-6">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
            <div>
              <p className="text-xs text-slate-500">Signed in as</p>
              <p className="truncate text-sm font-medium">{user.email}</p>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <button aria-label="Sign out" onClick={logout} className="focus-ring grid size-10 place-items-center rounded-md border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
                <LogOut className="size-4" />
              </button>
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">{children}</main>
      </div>
      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 sm:grid-cols-9 lg:hidden">
        {nav.map((item) => {
          const Icon = item.icon;
          const active = pathname.startsWith(item.href);
          return (
            <Link key={item.href} href={item.href} className={cn("flex flex-col items-center gap-1 px-1 py-2 text-[11px]", active ? "text-steel" : "text-slate-500")}>
              <Icon className="size-5" />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

function NavItem({ item, active }: { item: { href: string; label: string; icon: LucideIcon }; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link href={item.href} className={cn("flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium", active ? "bg-steel text-white" : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800")}>
      <Icon className="size-4" />
      {item.label}
    </Link>
  );
}
