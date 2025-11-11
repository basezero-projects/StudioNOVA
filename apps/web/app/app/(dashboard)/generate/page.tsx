import { Loader2, Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { MOCK_CHARACTERS, MOCK_PROMPT_PRESETS } from "@/lib/constants";

export default function GeneratePage() {
  return (
    <section className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Generate</h1>
        <p className="text-sm text-muted-foreground">
          Craft prompts and send generation jobs to the worker. The UI is wired with
          mock state until Phase 6+.
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,320px)]">
        <Card className="border-none bg-card/90 shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">
              Prompt details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <label className="flex flex-col gap-2">
              <span className="text-xs font-semibold uppercase text-muted-foreground">
                Character
              </span>
              <select className="h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground">
                {MOCK_CHARACTERS.map((character) => (
                  <option key={character.id} value={character.id}>
                    {character.name} ({character.status})
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-xs font-semibold uppercase text-muted-foreground">
                Positive prompt
              </span>
              <textarea
                className="min-h-[140px] rounded-lg border border-border bg-background px-3 py-2 text-sm leading-relaxed text-foreground"
                placeholder="Ultra-detailed cinematic portrait, volumetric rim light, 50mm lens, grounded color palette..."
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-xs font-semibold uppercase text-muted-foreground">
                Negative prompt
              </span>
              <textarea
                className="min-h-[100px] rounded-lg border border-border bg-background px-3 py-2 text-sm leading-relaxed text-foreground"
                placeholder="blurry, distorted hands, low-resolution, duplicate, overexposed"
              />
            </label>

            <div className="grid gap-3 sm:grid-cols-3">
              <Input
                type="number"
                min={1}
                placeholder="CFG"
                className="h-10 rounded-lg"
                defaultValue={7}
              />
              <Input
                type="number"
                min={10}
                placeholder="Steps"
                className="h-10 rounded-lg"
                defaultValue={30}
              />
              <Input
                type="number"
                placeholder="Seed"
                className="h-10 rounded-lg"
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border border-dashed border-border/70 px-3 py-3 text-xs text-muted-foreground">
              <p>Upscale after generation</p>
              <Button variant="outline" size="sm" disabled>
                Toggle (Phase 7)
              </Button>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="ghost" disabled>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                Mocking worker
              </Button>
              <Button className="bg-[color:var(--accent)] hover:bg-[color:var(--accent)]/90" disabled>
                <Send className="mr-2 h-4 w-4" aria-hidden="true" />
                Queue job (Phase 6)
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="border-none bg-card/90 shadow-sm">
            <CardHeader>
              <CardTitle className="text-sm text-muted-foreground">
                Prompt presets
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {MOCK_PROMPT_PRESETS.map((preset) => (
                <div
                  key={preset.id}
                  className="rounded-lg border border-border/60 bg-muted/15 p-3 transition-colors hover:border-[color:var(--accent)]/60"
                >
                  <p className="flex items-center justify-between text-sm font-semibold">
                    {preset.label}
                    <span className="rounded-full border border-border/60 px-2 py-0.5 text-[11px] uppercase text-muted-foreground">
                      {preset.steps} steps · {preset.guidance} cfg
                    </span>
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {preset.description}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-none bg-card/90 shadow-sm">
            <CardHeader>
              <CardTitle className="text-sm text-muted-foreground">
                Worker endpoint preview
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs font-mono text-muted-foreground">
              <p>POST /generate-image</p>
              <pre className="rounded-lg border border-border bg-background/80 p-3">
                {`{
"character_id": "char-aurelia",
"prompt": "cinematic portrait...",
"negative_prompt": "...",
"settings": {
  "cfg": 7,
  "steps": 30,
  "seed": null
}
}`}
              </pre>
              <p>Actual wiring arrives in Phase 6.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}

