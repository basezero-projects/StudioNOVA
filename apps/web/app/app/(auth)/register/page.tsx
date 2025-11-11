import Link from "next/link";
import { redirect } from "next/navigation";

import { AuthForm } from "@/components/auth/AuthForm";
import { AUTH_DISABLED } from "@/lib/config";

export default function RegisterPage() {
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
          Create a local-only account for your StudioNOVA workspace.
        </p>
      </div>

      <AuthForm mode="register" />

      <p className="text-sm text-muted-foreground">
        Already registered?{" "}
        <Link href="/app/login" className="font-medium text-accent underline-offset-4 hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}

