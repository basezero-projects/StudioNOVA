"use client";

import { useEffect, useMemo, useState, useTransition } from "react";

import { Bell, Sparkles } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";

import { APP_NAV_ITEMS } from "@/lib/constants";
import { AUTH_DISABLED } from "@/lib/config";
import { DEV_USER } from "@/lib/dev-constants";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function Topbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [userEmail, setUserEmail] = useState<string | null>(AUTH_DISABLED ? DEV_USER.email : null);
  const [isLoadingUser, setIsLoadingUser] = useState(!AUTH_DISABLED);
  const [isLoggingOut, startLogout] = useTransition();

  useEffect(() => {
    if (AUTH_DISABLED) {
      return;
    }

    let isActive = true;

    async function fetchUser() {
      try {
        const response = await fetch("/api/auth/me", { credentials: "include" });
        if (!isActive) return;

        if (response.ok) {
          const data = (await response.json()) as { email: string };
          setUserEmail(data.email);
        } else {
          setUserEmail(null);
        }
      } catch (error) {
        console.error("[auth] failed to load current user", error);
        setUserEmail(null);
      } finally {
        if (isActive) {
          setIsLoadingUser(false);
        }
      }
    }

    fetchUser();
    return () => {
      isActive = false;
    };
  }, []);

  const activeNav = useMemo(() => {
    if (pathname === "/app" || pathname === "/app/") {
      return {
        label: "Overview",
        description: "Studio status snapshots before diving into characters and jobs.",
      };
    }

    const match = APP_NAV_ITEMS.find((item) => pathname.startsWith(item.href));
    return (
      match ?? {
        label: "StudioNOVA",
        description: "Navigate between studio surfaces.",
      }
    );
  }, [pathname]);

  const handleLogout = () => {
    startLogout(async () => {
      try {
        await fetch("/api/auth/logout", {
          method: "POST",
          credentials: "include",
        });
      } catch (error) {
        console.error("[auth] logout error", error);
      } finally {
        router.replace("/app/login");
        router.refresh();
      }
    });
  };

  return (
    <header className="flex h-16 w-full items-center justify-between border-b border-border bg-card/70 px-6 backdrop-blur">
      <div className="flex flex-1 items-center gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.25em] text-muted-foreground">
            {activeNav.label}
          </p>
          <p className="text-sm text-muted-foreground/90">{activeNav.description}</p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="hidden items-center gap-2 rounded-full border border-border/70 bg-background/80 px-3 py-1.5 text-sm text-muted-foreground sm:flex">
          <Sparkles className="h-4 w-4 text-accent" aria-hidden="true" />
          <span>Mock credits · 284</span>
        </div>

        <form className="hidden items-center gap-2 sm:flex">
          <Input
            placeholder="Search characters or jobs"
            className="h-9 w-52 rounded-full border-border bg-background/80 text-sm placeholder:text-muted-foreground/70"
          />
        </form>

        <Button variant="ghost" size="icon" className="rounded-full">
          <Bell className="h-5 w-5" aria-hidden="true" />
          <span className="sr-only">Notifications</span>
        </Button>

        <div
          className={cn(
            "hidden flex-col items-end sm:flex",
            "rounded-lg border border-border/60 bg-background/80 px-3 py-1 text-xs text-muted-foreground"
          )}
        >
          <span className="font-semibold text-foreground">
            {isLoadingUser ? "Loading…" : userEmail ?? "Account"}
          </span>
          <span className="text-[11px] text-muted-foreground/70">
            {AUTH_DISABLED ? "Dev session" : "Local session"}
          </span>
        </div>

        {AUTH_DISABLED ? null : (
          <Button variant="outline" size="sm" onClick={handleLogout} disabled={isLoggingOut}>
            {isLoggingOut ? "Signing out…" : "Sign out"}
          </Button>
        )}
      </div>
    </header>
  );
}
