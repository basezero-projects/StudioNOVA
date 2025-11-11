import { useEffect, useMemo, useState } from "react";

import { Loader2, Plus, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type Character = {
  id: string;
  name: string;
  token: string;
  description: string | null;
  lora_path: string | null;
  created_at: string;
  updated_at: string;
};

type JobState = {
  jobId: string | null;
  status: string;
};

export default function CharactersPage() {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [formState, setFormState] = useState({ name: "", token: "", description: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [jobStates, setJobStates] = useState<Record<string, JobState>>({});
  const [trainingInFlight, setTrainingInFlight] = useState<string | null>(null);

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
        }
      } catch (error) {
        console.error("[characters] failed to load", error);
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    loadCharacters();
    return () => {
      active = false;
    };
  }, []);

  const resetForm = () => {
    setFormState({ name: "", token: "", description: "" });
    setFormError(null);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/characters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formState.name,
          token: formState.token,
          description: formState.description,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || "Unable to create character.");
      }

      const character = (await response.json()) as Character;
      setCharacters((prev) => [character, ...prev]);
      resetForm();
    } catch (error) {
      console.error("[characters] create failed", error);
      setFormError(error instanceof Error ? error.message : "Unable to create character.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTrain = async (characterId: string) => {
    setTrainingInFlight(characterId);

    try {
      const response = await fetch(`/api/characters/${characterId}/train`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || "Unable to queue training job.");
      }

      const data = (await response.json()) as { jobId: string | null; status: string };
      setJobStates((prev) => ({
        ...prev,
        [characterId]: { jobId: data.jobId, status: data.status },
      }));
    } catch (error) {
      console.error("[characters] train failed", error);
      setJobStates((prev) => ({
        ...prev,
        [characterId]: { jobId: null, status: "error" },
      }));
    } finally {
      setTrainingInFlight(null);
    }
  };

  const sortedCharacters = useMemo(
    () =>
      [...characters].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ),
    [characters]
  );

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Characters</h1>
          <p className="text-sm text-muted-foreground">
            Create LoRA-ready personas and queue training jobs via the local worker.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" disabled>
            <Upload className="mr-2 h-4 w-4" aria-hidden="true" />
            Import dataset (coming soon)
          </Button>
          <Button onClick={() => document.getElementById("character-name")?.focus()}>
            <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
            New character
          </Button>
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,320px)]">
        <Card className="border-none bg-card/80 shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Quick create</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="grid gap-3 text-sm" onSubmit={handleSubmit}>
              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase text-muted-foreground" htmlFor="character-name">
                  Name
                </label>
                <Input
                  id="character-name"
                  placeholder="Character name"
                  className="h-10 rounded-lg"
                  value={formState.name}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, name: event.target.value }))
                  }
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase text-muted-foreground" htmlFor="character-token">
                  Trigger token
                </label>
                <Input
                  id="character-token"
                  placeholder="@nova"
                  className="h-10 rounded-lg"
                  value={formState.token}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, token: event.target.value }))
                  }
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase text-muted-foreground" htmlFor="character-description">
                  Description
                </label>
                <textarea
                  id="character-description"
                  className="min-h-[96px] w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  placeholder="Optional notes about the character."
                  value={formState.description}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, description: event.target.value }))
                  }
                />
              </div>

              {formError ? (
                <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {formError}
                </p>
              ) : null}

              <Button type="submit" className="justify-center" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                    Creating…
                  </>
                ) : (
                  "Create character"
                )}
              </Button>

              <p className="text-xs text-muted-foreground">
                Characters are stored locally and tied to the dev user. Training links to the
                FastAPI worker stub.
              </p>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-3 rounded-lg border border-border/40 bg-card/60 p-4 text-xs text-muted-foreground">
          <p className="font-semibold text-foreground">Training checklist</p>
          <ul className="list-inside list-disc space-y-2 leading-relaxed">
            <li>Curate at least 150 images per character for stable LoRA quality.</li>
            <li>Include the trigger token in 30%+ of captions for consistency.</li>
            <li>Keep datasets organized — one folder per character.</li>
            <li>Phase 8 will wire kohya_ss for real training runs.</li>
          </ul>
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="text-base font-semibold text-muted-foreground">Character roster</h2>
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Loading characters…
          </div>
        ) : sortedCharacters.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No characters yet. Create one using the form above.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {sortedCharacters.map((character) => {
              const jobState = jobStates[character.id];
              const isTraining = trainingInFlight === character.id;

              return (
                <Card key={character.id} className="border-none bg-card/90 shadow-sm">
                  <CardContent className="space-y-3 py-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-lg font-semibold">{character.name}</h3>
                        <p className="text-xs text-muted-foreground">{character.token}</p>
                      </div>
                      <span className="rounded-full bg-accent/20 px-3 py-1 text-xs font-semibold uppercase text-accent-foreground">
                        {character.lora_path ? "Trained" : "Untrained"}
                      </span>
                    </div>

                    {character.description ? (
                      <p className="text-xs text-muted-foreground">{character.description}</p>
                    ) : null}

                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>
                        Created {new Date(character.created_at).toLocaleDateString()}
                      </span>
                      <span>
                        Updated {new Date(character.updated_at).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="space-y-2">
                      <Button
                        variant="outline"
                        className="w-full justify-center"
                        onClick={() => handleTrain(character.id)}
                        disabled={isTraining}
                      >
                        {isTraining ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                            Queueing…
                          </>
                        ) : (
                          "Train LoRA"
                        )}
                      </Button>

                      {jobState ? (
                        <div className="rounded-md border border-border/60 bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
                          <p>
                            Status: <span className="font-semibold">{jobState.status}</span>
                          </p>
                          {jobState.jobId ? (
                            <p className="break-all">Job ID: {jobState.jobId}</p>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

