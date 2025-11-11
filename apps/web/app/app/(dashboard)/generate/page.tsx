"use client";

import { useEffect, useMemo, useState } from "react";

import { Loader2, Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";

type Character = {
  id: string;
  name: string;
  token: string;
};

type GenerationResponse = {
  jobId: string | null;
  status: string;
  imagePath?: string | null;
  assetId?: string | null;
} | null;

export default function GeneratePage() {
  const { toast } = useToast();
  const [characters, setCharacters] = useState<Character[]>([]);
  const [isLoadingCharacters, setIsLoadingCharacters] = useState(true);
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");
  const [negativePrompt, setNegativePrompt] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [jobResponse, setJobResponse] = useState<GenerationResponse>(null);

  useEffect(() => {
    let active = true;

    async function loadCharacters() {
      try {
        const response = await fetch("/api/characters", { cache: "no-store" });
        if (!response.ok) {
          throw new Error(await response.text());
        }
        const data = (await response.json()) as Character[];
        if (active) {
          setCharacters(data);
          if (data.length > 0) {
            setSelectedCharacterId(data[0].id);
          }
        }
      } catch (error) {
        console.error("[generate] failed to load characters", error);
      } finally {
        if (active) {
          setIsLoadingCharacters(false);
        }
      }
    }

    loadCharacters();
    return () => {
      active = false;
    };
  }, []);

  const characterOptions = useMemo(
    () =>
      characters.map((character) => ({
        id: character.id,
        label: `${character.name} (${character.token})`,
      })),
    [characters]
  );

  const handleQueueGeneration = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    setJobResponse(null);

    if (!selectedCharacterId) {
      setFormError("Select a character before generating.");
      return;
    }

    if (!prompt.trim()) {
      setFormError("Prompt cannot be empty.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/generate/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          characterId: selectedCharacterId,
          prompt,
          negativePrompt,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || "Unable to queue generation job.");
      }

      const data = (await response.json()) as {
        jobId: string | null;
        status: string;
        imagePath?: string | null;
        assetId?: string | null;
      };
      setJobResponse(data);
      toast({
        title: "Generation queued",
        description: data.imagePath
          ? "Image saved to gallery."
          : "Worker will produce an image shortly.",
      });
    } catch (error) {
      console.error("[generate] job submission failed", error);
      setFormError(error instanceof Error ? error.message : "Unable to queue generation job.");
      toast({
        title: "Generation failed",
        description: error instanceof Error ? error.message : "Unable to queue generation job.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Generate</h1>
        <p className="text-sm text-muted-foreground">
          Craft prompts and send generation jobs to the local worker. ComfyUI produces real images saved to disk.
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,320px)]">
        <Card className="border-none bg-card/90 shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Prompt details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <form className="space-y-4" onSubmit={handleQueueGeneration}>
              <label className="flex flex-col gap-2">
                <span className="text-xs font-semibold uppercase text-muted-foreground">
                  Character
                </span>
                <select
                  className="h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground"
                  value={selectedCharacterId ?? ""}
                  onChange={(event) => setSelectedCharacterId(event.target.value)}
                  disabled={isLoadingCharacters || characters.length === 0}
                >
                  {characterOptions.length === 0 ? (
                    <option value="">No characters available</option>
                  ) : (
                    characterOptions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))
                  )}
                </select>
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-xs font-semibold uppercase text-muted-foreground">
                  Positive prompt
                </span>
                <textarea
                  className="min-h-[140px] rounded-lg border border-border bg-background px-3 py-2 text-sm leading-relaxed text-foreground"
                  placeholder="Ultra-detailed cinematic portrait, volumetric rim light..."
                  value={prompt}
                  onChange={(event) => setPrompt(event.target.value)}
                  required
                />
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-xs font-semibold uppercase text-muted-foreground">
                  Negative prompt
                </span>
                <textarea
                  className="min-h-[100px] rounded-lg border border-border bg-background px-3 py-2 text-sm leading-relaxed text-foreground"
                  placeholder="blurry, distorted hands, low-resolution..."
                  value={negativePrompt}
                  onChange={(event) => setNegativePrompt(event.target.value)}
                />
              </label>

              <p className="text-xs text-muted-foreground">
                Keep uploads and prompts compliant with local laws and personal rights. Generated
                assets remain on this machine only.
              </p>

              <div className="grid gap-3 sm:grid-cols-3">
                <Input type="number" min={1} placeholder="CFG (coming soon)" className="h-10 rounded-lg" disabled />
                <Input type="number" min={10} placeholder="Steps (coming soon)" className="h-10 rounded-lg" disabled />
                <Input type="number" placeholder="Seed (coming soon)" className="h-10 rounded-lg" disabled />
              </div>

              {formError ? (
                <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {formError}
                </p>
              ) : null}

              <Button
                type="submit"
                className="ml-auto flex min-w-[200px] items-center justify-center bg-[color:var(--accent)] hover:bg-[color:var(--accent)]/90"
                disabled={isSubmitting || characters.length === 0}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                    Queueing…
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" aria-hidden="true" />
                    Generate image
                  </>
                )}
              </Button>
            </form>

            {jobResponse ? (
              <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-3 text-xs text-muted-foreground">
                <p>
                  Status: <span className="font-semibold">{jobResponse.status}</span>
                </p>
                {jobResponse.jobId ? <p className="break-all">Job ID: {jobResponse.jobId}</p> : null}
                {jobResponse.imagePath ? (
                  <p className="mt-1">
                    Output:&nbsp;
                    <a
                      className="text-foreground underline"
                      href={`/api/assets/file?path=${encodeURIComponent(jobResponse.imagePath)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      View image
                    </a>
                  </p>
                ) : null}
                <p className="mt-1">
                  Browse the Gallery tab to inspect stored assets and trigger upscales.
                </p>
              </div>
            ) : null}
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
              {[
                {
                  id: "studio-portrait",
                  label: "Studio Portrait",
                  description: "Cinematic lighting, 50mm depth of field, subtle rim highlights.",
                  steps: 28,
                  guidance: 6.5,
                },
                {
                  id: "travel-journal",
                  label: "Travel Journal",
                  description: "Analog film grain, sun-soaked palettes, minimal background clutter.",
                  steps: 24,
                  guidance: 5.8,
                },
                {
                  id: "neon-runner",
                  label: "Neon Runner",
                  description: "Energetic action frame, neon accent trails, chromatic aberration.",
                  steps: 32,
                  guidance: 7.2,
                },
              ].map((preset) => (
                <div
                  key={preset.id}
                  className="rounded-lg border border-border/60 bg-muted/15 p-3 transition-colors hover:border-[color:var(--accent)]/60"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold">{preset.label}</p>
                    <span className="rounded-full border border-border/60 px-2 py-0.5 text-[11px] uppercase text-muted-foreground">
                      {preset.steps} steps · {preset.guidance} cfg
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{preset.description}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-none bg-card/90 shadow-sm">
            <CardHeader>
              <CardTitle className="text-sm text-muted-foreground">Worker endpoint</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs font-mono text-muted-foreground">
              <p>POST /generate-image</p>
              <pre className="rounded-lg border border-border bg-background/80 p-3">
                {`{
"character_id": "<character_id>",
"prompt": "cinematic portrait...",
"negative_prompt": "overexposed, blurry"
}`}
              </pre>
              <p>The response includes a jobId which can be polled via /jobs/:id.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}

