import { Wand2, Workflow } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function DashboardHomePage() {
  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
            Welcome back
          </p>
          <h1 className="mt-1 text-2xl font-semibold">Today&apos;s control room</h1>
          <p className="text-sm text-muted-foreground">
            Review outstanding jobs, kick off new experiments, and monitor engine
            readiness. All status data is mocked in Phase 1.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">View roadmap</Button>
          <Button>
            <Wand2 className="mr-2 h-4 w-4" aria-hidden="true" />
            New generation
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-none bg-card/80 shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">
              Characters ready
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">3</p>
            <p className="text-xs text-muted-foreground">Last trained 2h ago</p>
          </CardContent>
        </Card>
        <Card className="border-none bg-card/80 shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">
              Jobs in queue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">5</p>
            <p className="text-xs text-muted-foreground">2 training · 3 generation</p>
          </CardContent>
        </Card>
        <Card className="border-none bg-card/80 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm text-muted-foreground">
              Engines
            </CardTitle>
            <Workflow className="h-4 w-4 text-accent" aria-hidden="true" />
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <div className="flex items-center justify-between">
              <span>ComfyUI</span>
              <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs font-semibold uppercase text-emerald-400">
                Ready
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>kohya_ss</span>
              <span className="rounded-full bg-yellow-400/20 px-2 py-0.5 text-xs font-semibold uppercase text-yellow-300">
                Idle
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

