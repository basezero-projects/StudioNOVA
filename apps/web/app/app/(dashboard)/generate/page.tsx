"use client";

import { useEffect, useMemo, useState } from "react";

import { Loader2, Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { addImageToDataset, generateComfyPreviews } from "@/lib/worker-client";

type Character = {
  id: string;
  name: string;
  token: string;
  slug?: string;
  datasetPath?: string;
  datasetCount?: number;
};

type PreviewState = {
  id: string;
  imagePath: string;
  previewUrl: string;
  status: "fresh" | "saving" | "saved" | "error";
  errorMessage?: string;
};

export default function GeneratePage() {
  const { toast } = useToast();
  const [characters, setCharacters] = useState<Character[]>([]);
  const [isLoadingCharacters, setIsLoadingCharacters] = useState(true);
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");
  const [negativePrompt, setNegativePrompt] = useState("");
  const [steps, setSteps] = useState(20);
  const [cfgScale, setCfgScale] = useState(7);
  const [seed, setSeed] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [previews, setPreviews] = useState<PreviewState[]>([]);

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
            setSelectedCharacterId((prev) => prev ?? data[0].id);
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

  const selectedCharacter = useMemo(
    () => characters.find((character) => character.id === selectedCharacterId) ?? null,
    [characters, selectedCharacterId]
  );

  const selectedDatasetPath =
    selectedCharacter?.datasetPath ??
    (selectedCharacter?.slug ? `datasets/${selectedCharacter.slug}` : null);

  const handleGeneratePreviews = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    if (!selectedCharacterId) {
      setFormError("Select a character before generating.");
      return;
    }

    if (!prompt.trim()) {
      setFormError("Prompt cannot be empty.");
      return;
    }

    const trimmedSeed = seed.trim();
    let numericSeed: number | null = null;
    if (trimmedSeed) {
      const parsed = Number(trimmedSeed);
      if (Number.isNaN(parsed)) {
        setFormError("Seed must be a number or left blank for random.");
        return;
      }
      numericSeed = parsed;
    }

    setIsGenerating(true);
    try {
      const data = await generateComfyPreviews({
        characterId: selectedCharacterId,
        prompt,
        negativePrompt,
        steps,
        cfgScale,
        seed: numericSeed,
      });

      if (!data.previews || data.previews.length === 0) {
        toast({
          title: "No previews returned",
          description: "Worker did not produce any images. Check ComfyUI configuration.",
          variant: "destructive",
        });
        setPreviews([]);
        return;
      }

      setPreviews(
        data.previews.map((preview) => ({
          id: preview.id,
          imagePath: preview.image_path,
          previewUrl: `/api/assets/file?path=${encodeURIComponent(preview.image_path)}`,
          status: "fresh",
        }))
      );

      toast({
        title: "Previews ready",
        description: "Review the images below and keep the good ones for dataset building.",
      });
    } catch (error) {
      console.error("[generate] preview generation failed", error);
      toast({
        title: "Generation failed",
        description: error instanceof Error ? error.message : "Unable to reach the worker.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleKeepPreview = async (preview: PreviewState) => {
    if (!selectedCharacter) {
      toast({
        title: "Select a character first",
        description: "Choose a character to associate with this dataset image.",
        variant: "destructive",
      });
      return;
    }

    const datasetPath = selectedDatasetPath;
    if (!datasetPath) {
      toast({
        title: "Dataset path missing",
        description: "Set a dataset path on the Characters page before keeping previews.",
        variant: "destructive",
      });
      return;
    }

    setPreviews((prev) =>
      prev.map((item) =>
        item.id === preview.id ? { ...item, status: "saving", errorMessage: undefined } : item
      )
    );

    try {
      const response = await addImageToDataset({
        characterId: selectedCharacter.id,
        datasetPath,
        imagePath: preview.imagePath,
        source: "comfyui",
      });

      setPreviews((prev) =>
        prev.map((item) =>
          item.id === preview.id ? { ...item, status: "saved", errorMessage: undefined } : item
        )
      );

      const displayDatasetPath = selectedCharacter.datasetPath ?? datasetPath;

      setCharacters((prev) =>
        prev.map((character) =>
          character.id === selectedCharacter.id
            ? {
                ...character,
                datasetCount: response.count,
                datasetPath: displayDatasetPath,
              }
            : character
        )
      );

      toast({
        title: "Preview kept",
        description: `Saved to ${response.dataset_path}`,
      });
    } catch (error) {
      console.error("[generate] failed to keep preview", error);
      const message =
        error instanceof Error ? error.message : "Unable to copy preview into the dataset.";
      setPreviews((prev) =>
        prev.map((item) =>
          item.id === preview.id ? { ...item, status: "error", errorMessage: message } : item
        )
      );
      toast({
        title: "Failed to keep preview",
        description: message,
        variant: "destructive",
      });
    }
  };

  return (
    <section className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Generate previews</h1>
        <p className="text-sm text-muted-foreground">
          Run lightweight ComfyUI generations to curate a dataset for each character. Keeping an
          image places it in the character&apos;s dataset folder; models are unchanged until you run
          Train LoRA.
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,320px)]">
        <Card className="border-none bg-card/90 shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Generation controls</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <form className="space-y-4" onSubmit={handleGeneratePreviews}>
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

              <div className="grid gap-3 sm:grid-cols-3">
                <label className="flex flex-col gap-1">
                  <span className="text-[11px] font-semibold uppercase text-muted-foreground">
                    Steps
                  </span>
                  <Input
                    type="number"
                    min={1}
                    max={150}
                    value={steps}
                    onChange={(event) => setSteps(Number(event.target.value) || 1)}
                    className="h-10 rounded-lg"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-[11px] font-semibold uppercase text-muted-foreground">
                    CFG scale
                  </span>
                  <Input
                    type="number"
                    min={1}
                    max={20}
                    step="0.5"
                    value={cfgScale}
                    onChange={(event) => setCfgScale(Number(event.target.value) || 7)}
                    className="h-10 rounded-lg"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-[11px] font-semibold uppercase text-muted-foreground">
                    Seed (blank = random)
                  </span>
                  <Input
                    type="text"
                    value={seed}
                    onChange={(event) => setSeed(event.target.value)}
                    className="h-10 rounded-lg"
                  />
                </label>
              </div>

              <p className="text-xs text-muted-foreground">
                Use “Keep preview” below to add an image to the character&apos;s dataset folder.
                Train LoRA only after you have kept enough consistent examples.
              </p>
              {selectedDatasetPath ? (
                <p className="text-[11px] text-muted-foreground/80">
                  Dataset target: <span className="font-semibold">{selectedDatasetPath}</span>
                  {typeof selectedCharacter.datasetCount === "number"
                    ? ` · ${selectedCharacter.datasetCount} items`
                    : null}
                </p>
              ) : null}

              {formError ? (
                <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {formError}
                </p>
              ) : null}

              <Button
                type="submit"
                className="ml-auto flex min-w-[200px] items-center justify-center bg-[color:var(--accent)] hover:bg-[color:var(--accent)]/90"
                disabled={isGenerating || characters.length === 0}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                    Generating…
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" aria-hidden="true" />
                    Generate previews
                  </>
                )}
              </Button>
            </form>

            {previews.length > 0 ? (
              <div className="space-y-2">
                <h3 className="text-xs font-semibold uppercase text-muted-foreground">
                  Latest previews
                </h3>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {previews.map((preview) => (
                    <div
                      key={preview.id}
                      className="overflow-hidden rounded-lg border border-border/60 bg-muted/15"
                    >
                      <div className="aspect-square w-full overflow-hidden bg-background">
                        <img
                          src={preview.previewUrl}
                          alt="Preview"
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div className="space-y-2 p-3 text-xs text-muted-foreground">
                        <p className="truncate">
                          {preview.status === "saved"
                            ? "Saved to dataset"
                            : preview.status === "saving"
                            ? "Saving to dataset…"
                            : preview.status === "error"
                            ? preview.errorMessage ?? "Failed to save preview."
                            : "Review this image before keeping it."}
                        </p>
                        <Button
                          size="sm"
                          className="w-full justify-center"
                          variant="outline"
                          disabled={
                            preview.status === "saving" ||
                            preview.status === "saved" ||
                            !selectedCharacterId
                          }
                          onClick={() => handleKeepPreview(preview)}
                        >
                          {preview.status === "saved"
                            ? "Saved"
                            : preview.status === "saving"
                            ? "Saving…"
                            : "Keep for dataset"}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="border-none bg-card/90 shadow-sm">
            <CardHeader>
              <CardTitle className="text-sm text-muted-foreground">Workflow tips</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs text-muted-foreground">
              <p className="font-semibold text-foreground">Preview first</p>
              <p>
                Generate several previews, keep only consistent angles, lighting, and outfits. Delete
                rejected shots directly from the dataset folder if needed.
              </p>
              <p className="font-semibold text-foreground pt-2">Dataset goals</p>
              <ul className="list-inside list-disc space-y-1">
                <li>20–50 curated images per character is a solid starting point.</li>
                <li>Mix close-ups and full-body shots with the trigger token in captions.</li>
                <li>Keep the dataset folder tidy—only the filtered previews should remain.</li>
              </ul>
              <p className="font-semibold text-foreground pt-2">Next step</p>
              <p>
                Once happy with the dataset, head back to Characters and run Train LoRA to queue a
                kohya job.
              </p>
            </CardContent>
          </Card>

          <Card className="border-none bg-card/90 shadow-sm">
            <CardHeader>
              <CardTitle className="text-sm text-muted-foreground">Prompt presets</CardTitle>
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
        </div>
      </div>
    </section>
  );
}

