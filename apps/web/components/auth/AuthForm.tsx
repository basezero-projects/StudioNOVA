"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type AuthMode = "login" | "register";

interface AuthFormProps {
  mode: AuthMode;
}

const ENDPOINT_BY_MODE: Record<AuthMode, string> = {
  login: "/api/auth/login",
  register: "/api/auth/register",
};

const TITLE_BY_MODE: Record<AuthMode, string> = {
  login: "Sign in to StudioNOVA",
  register: "Create your StudioNOVA account",
};

const SUBTEXT_BY_MODE: Record<AuthMode, string> = {
  login: "Enter your credentials to access the studio.",
  register: "Set up local credentials for your StudioNOVA workspace.",
};

const CTA_BY_MODE: Record<AuthMode, string> = {
  login: "Sign in",
  register: "Create account",
};

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!email || !password) {
      setError("Please provide both email and password.");
      return;
    }

    startTransition(async () => {
      try {
        const response = await fetch(ENDPOINT_BY_MODE[mode], {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email, password }),
          credentials: "include",
        });

        if (!response.ok) {
          const body = await response.json().catch(() => null);
          setError(body?.error ?? "Unable to authenticate. Please try again.");
          return;
        }

        router.replace("/app");
        router.refresh();
      } catch (caughtError) {
        console.error("[auth] submission error", caughtError);
        setError("Unexpected error. Check your connection and try again.");
      }
    });
  };

  return (
    <Card className="w-full max-w-md border border-border/60 bg-card/95 shadow-subtle backdrop-blur">
      <CardHeader>
        <CardTitle className="text-xl font-semibold">{TITLE_BY_MODE[mode]}</CardTitle>
        <CardDescription>{SUBTEXT_BY_MODE[mode]}</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground" htmlFor="email">
              Email
            </label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground" htmlFor="password">
              Password
            </label>
            <Input
              id="password"
              type="password"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Minimum 8 characters"
              minLength={8}
              required
            />
          </div>

          {error ? (
            <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          ) : null}

          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Working..." : CTA_BY_MODE[mode]}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

