import Link from "next/link";
import { redirect } from "next/navigation";

import { AuthForm } from "@/components/auth/AuthForm";
import { AUTH_DISABLED } from "@/lib/config";

export default function LoginPage() {
  if (AUTH_DISABLED) {
    redirect("/app");
  }

  return (
    <div className="flex w-full max-w-lg flex-col items-center gap-6 px-4 py-12 text-center">
      <div className="space-y-2">
        <span className="rounded-full border border-border/60 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
          StudioNOVA
        </span>
        <p className="text-sm text-muted-foreground">
          Local-first credential auth. No remote services involved.
        </p>
      </div>

      <AuthForm mode="login" />

      <p className="text-sm text-muted-foreground">
        Need access?{" "}
        <Link href="/app/register" className="font-medium text-accent underline-offset-4 hover:underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}

