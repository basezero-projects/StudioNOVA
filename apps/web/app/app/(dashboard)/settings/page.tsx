import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function SettingsPage() {
  return (
    <section className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Configure StudioNOVA environment variables and worker targets. All values are
          placeholders until later roadmap phases.
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-none bg-card/90 shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">
              Engine endpoints (mock)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/15 px-3 py-3">
              <div>
                <p className="font-semibold text-foreground">COMFYUI_API_URL</p>
                <p className="text-xs text-muted-foreground">
                  http://localhost:8188 (Phase 7 live connection)
                </p>
              </div>
              <Button size="sm" variant="outline" disabled>
                Edit
              </Button>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/15 px-3 py-3">
              <div>
                <p className="font-semibold text-foreground">KOHYA_ROOT</p>
                <p className="text-xs text-muted-foreground">
                  ./external/kohya_ss (Phase 8 subprocess)
                </p>
              </div>
              <Button size="sm" variant="outline" disabled>
                Edit
              </Button>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/15 px-3 py-3">
              <div>
                <p className="font-semibold text-foreground">OUTPUT_DIR</p>
                <p className="text-xs text-muted-foreground">
                  ./storage/results (planned local volume)
                </p>
              </div>
              <Button size="sm" variant="outline" disabled>
                Edit
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none bg-card/90 shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">
              Account &amp; safety copy
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              Phase 4 introduces local credentials. Until then, we surface reminders to
              ensure compliant datasets and responsible usage.
            </p>
            <ul className="list-inside list-disc space-y-2">
              <li>Use imagery you own or have explicit rights to fine-tune.</li>
              <li>Capture consent for real individuals; anonymize metadata.</li>
              <li>Review outputs before sharing; flag sensitive content.</li>
            </ul>
            <Button variant="outline" disabled>
              Configure notices (Phase 9)
            </Button>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

