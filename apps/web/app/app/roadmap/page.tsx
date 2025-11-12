"use client";

import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function RoadmapPage() {
  return (
    <section className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">StudioNOVA Roadmap</h1>
        <p className="text-sm text-muted-foreground">
          High-level milestones for the StudioNOVA local-first LoRA studio. This summary links back to the living document in the repo.
        </p>
      </header>

      <Card className="border-none bg-card/90 shadow-sm">
        <CardHeader>
          <CardTitle className="text-sm text-muted-foreground">Phase highlights</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <div>
            <p className="font-semibold text-foreground">Phases 0–4 · Foundations</p>
            <ul className="list-inside list-disc pl-4">
              <li>Monorepo scaffolding, mock auth, and model CRUD.</li>
              <li>Gallery surface with mocked assets and prompt presets.</li>
              <li>Initial worker stubs plus local dataset guidance.</li>
            </ul>
          </div>

          <div>
            <p className="font-semibold text-foreground">Phases 5–7 · Engines</p>
            <ul className="list-inside list-disc pl-4">
              <li>ComfyUI integration hooks for image generation.</li>
              <li>Inline job status and gallery asset inspection.</li>
              <li>Training UX iteration ahead of kohya_ss wiring.</li>
            </ul>
          </div>

          <div>
            <p className="font-semibold text-foreground">Phases 8–10 · Local MVP</p>
            <ul className="list-inside list-disc pl-4">
              <li>Kohya training launcher with graceful fallbacks.</li>
              <li>Configurable engine targets and dataset helpers.</li>
              <li>Polish pass on dashboards, status, and error messaging.</li>
            </ul>
          </div>

          <p className="text-xs text-muted-foreground/80">
            Full roadmap:&nbsp;
            <Link
              href="https://github.com/BaseZero/StudioNOVA/blob/main/docs/BUILD_ROADMAP.md"
              className="underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              docs/BUILD_ROADMAP.md
            </Link>
          </p>
        </CardContent>
      </Card>
    </section>
  );
}


