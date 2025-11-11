"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { APP_NAV_ITEMS } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden min-h-svh w-64 shrink-0 flex-col justify-between border-r border-sidebar-border bg-sidebar px-4 py-6 text-sm text-sidebar-foreground lg:flex">
      <div className="space-y-6">
        <div>
          <div className="flex items-start justify-between">
            <Link href="/app" className="font-semibold uppercase tracking-[0.3em]">
              StudioNOVA
            </Link>
            <span className="rounded-md bg-sidebar-accent/60 px-2 py-0.5 text-xs font-medium">
              v0.01
            </span>
          </div>
          <p className="mt-2 text-xs text-sidebar-foreground/70">
            Local-first studio for LoRA training and generation.
          </p>
        </div>

        <nav className="space-y-1">
          {APP_NAV_ITEMS.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "block rounded-lg px-3 py-2 transition-colors",
                  "text-sm font-medium",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/75 hover:bg-sidebar-accent/40 hover:text-sidebar-foreground"
                )}
              >
                <div>{item.label}</div>
                <p className="text-[11px] font-normal text-sidebar-foreground/60">
                  {item.description}
                </p>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="space-y-2 rounded-lg border border-sidebar-border/40 bg-sidebar-accent/30 p-3 text-xs text-sidebar-foreground/80">
        <p className="font-semibold text-sidebar-foreground">
          Engine status · Mocked
        </p>
        <ul className="space-y-1">
          <li className="flex items-center justify-between">
            <span>ComfyUI</span>
            <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[11px] font-semibold uppercase text-emerald-400">
              Ready
            </span>
          </li>
          <li className="flex items-center justify-between">
            <span>kohya_ss</span>
            <span className="rounded-full bg-yellow-400/20 px-2 py-0.5 text-[11px] font-semibold uppercase text-yellow-300">
              Idle
            </span>
          </li>
        </ul>
      </div>
    </aside>
  );
}

