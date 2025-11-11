import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-svh items-center justify-center bg-gradient-to-br from-background via-background to-muted">
      {children}
    </div>
  );
}

