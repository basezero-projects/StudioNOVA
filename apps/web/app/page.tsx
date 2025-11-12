import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-gradient-to-br from-background via-background to-muted px-6 py-24 text-center">
      <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-8">
        <span className="rounded-full border border-border px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
          StudioNOVA v0.01
        </span>
        <div className="space-y-4">
          <h1 className="text-pretty text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
            Local-first AI model creation, training, and generation.
          </h1>
          <p className="mx-auto max-w-2xl text-base text-muted-foreground sm:text-lg">
            Manage LoRA-ready models, train with kohya_ss, and generate assets
            with ComfyUI&mdash;all from a unified studio experience designed for
            creators who stay in control of their workflows.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button asChild size="lg" className="min-w-[200px]">
            <Link href="/app">Enter StudioNOVA</Link>
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="min-w-[200px] border-border bg-transparent text-muted-foreground hover:text-foreground"
            asChild
          >
            <Link href="/docs">Read the roadmap</Link>
          </Button>
        </div>
        <div className="grid w-full gap-4 rounded-xl border border-border/60 bg-card/60 p-6 text-left shadow-sm sm:grid-cols-3">
          <div>
            <p className="text-xs font-medium uppercase text-muted-foreground">
              Engines
            </p>
            <p className="mt-1 text-sm font-semibold">ComfyUI &amp; kohya_ss</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase text-muted-foreground">
              Stack
            </p>
            <p className="mt-1 text-sm font-semibold">
              Next.js, Tailwind, shadcn/ui
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase text-muted-foreground">
              Scope
            </p>
            <p className="mt-1 text-sm font-semibold">
              Phase 1 UI shell &amp; mocked data
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
