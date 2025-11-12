"use client";

import { useEffect, useMemo, useState, useTransition } from "react";

import { Bell } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { APP_NAV_ITEMS } from "@/lib/constants";
import { AUTH_DISABLED } from "@/lib/config";
import { DEV_USER } from "@/lib/dev-constants";
import { cn } from "@/lib/utils";

export function Topbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();
  const [userEmail, setUserEmail] = useState<string | null>(AUTH_DISABLED ? DEV_USER.email : null);
  const [isLoadingUser, setIsLoadingUser] = useState(!AUTH_DISABLED);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoggingOut, startLogout] = useTransition();
  const [isSearching, startSearch] = useTransition();

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
        description: "Studio status snapshots before diving into models and jobs.",
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

  const handleSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const query = searchTerm.trim();
    if (!query) {
      toast({
        title: "Enter a search term",
        description: "Search by model name or trigger token.",
      });
      return;
    }

    startSearch(async () => {
      try {
        const response = await fetch("/api/models", { cache: "no-store" });
        if (!response.ok) {
          throw new Error(await response.text());
        }
        const models = (await response.json()) as Array<{
          id: string;
          name: string;
          token: string;
          description?: string | null;
        }>;

        const lowered = query.toLowerCase();
        const match = models.find((model) => {
          return (
            model.name.toLowerCase().includes(lowered) ||
            model.token.toLowerCase().includes(lowered) ||
            (model.description ?? "").toLowerCase().includes(lowered)
          );
        });

        const encoded = encodeURIComponent(query);
        if (match) {
          router.push(`/app/models?search=${encoded}#model-${match.id}`);
          toast({
            title: "Model found",
            description: `Jumped to ${match.name}.`,
          });
          setSearchTerm("");
        } else {
          router.push(`/app/models?search=${encoded}`);
          toast({
            title: "No direct match",
            description: "Showing filtered roster instead.",
          });
          setSearchTerm("");
        }
      } catch (error) {
        console.error("[topbar] search failed", error);
        toast({
          title: "Search failed",
          description: "Unable to search models right now.",
          variant: "destructive",
        });
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
        <form className="hidden items-center gap-2 sm:flex" onSubmit={handleSearch}>
          <Input
            placeholder="Search models or jobs"
            className="h-9 w-52 rounded-full border-border bg-background/80 text-sm placeholder:text-muted-foreground/70"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            disabled={isSearching}
          />
          <Button type="submit" size="sm" variant="outline" disabled={isSearching}>
            {isSearching ? "Searching…" : "Go"}
          </Button>
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

