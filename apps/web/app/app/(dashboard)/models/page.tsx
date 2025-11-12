"use client";

import { useEffect, useMemo, useState } from "react";

import { Loader2, Plus, ShieldAlert, Upload } from "lucide-react";
import { useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

import { useToast } from "@/components/ui/use-toast";
import {
  getConfigStorageKey,
  getDefaultConfig,
  loadConfig,
  type StudioConfig,
} from "@/lib/studio-config";
import { cn } from "@/lib/utils";

type Model = {
  id: string;
  name: string;
  token: string;
  description: string | null;
  lora_path: string | null;
  created_at: string;
  updated_at: string;
  slug: string;
  datasetPath: string;
  datasetCount?: number;
};

type JobStatus = "idle" | "queueing" | "queued" | "error";

type JobState = {
  status: JobStatus;
  jobId: string | null;
  datasetPath: string | null;
  logPath: string | null;
  outputDir: string | null;
  outputWeight: string | null;
  command: string | null;
  message: string | null;
  errorMessage: string | null;
};

const DEFAULT_JOB_STATE: JobState = {
  status: "idle",
  jobId: null,
  datasetPath: null,
  logPath: null,
  outputDir: null,
  outputWeight: null,
  command: null,
  message: null,
  errorMessage: null,
};

type DatasetListing = {
  root: string;
  folders: Array<{
    name: string;
    count: number;
  }>;
};

function joinDatasetPath(root: string, folder: string): string {
  const trimmedRoot = root.replace(/[\\\/]+$/, "");
  if (!trimmedRoot) {
    return folder;
  }
  return `${trimmedRoot}/${folder}`;
}

export default function ModelsPage() {
  const { toast } = useToast();
  const [models, setModels] = useState<Model[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [formState, setFormState] = useState({ name: "", token: "", description: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [jobStates, setJobStates] = useState<Record<string, JobState>>({});
  const [datasetInputs, setDatasetInputs] = useState<Record<string, string>>({});
  const defaults = useMemo(() => getDefaultConfig(), []);
  const [studioConfig, setStudioConfig] = useState<StudioConfig>(defaults);
  const [datasetListing, setDatasetListing] = useState<DatasetListing | null>(null);
  const searchParams = useSearchParams();
  const rawSearch = (searchParams.get("search") ?? "").trim();
  const searchQuery = rawSearch.toLowerCase();

  useEffect(() => {
    let active = true;

    async function loadModels() {
      try {
        const response = await fetch("/api/models", { cache: "no-store" });
        if (!response.ok) {
          throw new Error(await response.text());
        }
        const data = (await response.json()) as Model[];
        if (active) {
          setModels(data);
        }
      } catch (error) {
        console.error("[models] failed to load", error);
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    loadModels();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const stored = loadConfig();
    setStudioConfig(stored);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const handleStorage = (event: StorageEvent) => {
      if (event.key === getConfigStorageKey()) {
        setStudioConfig(loadConfig());
      }
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const controller = new AbortController();
    const baseUrl = studioConfig.apiBaseUrl?.trim();
    if (!baseUrl) {
      return;
    }

    const normalizedBase = baseUrl.replace(/\/$/, "");

    async function fetchDatasets() {
      try {
        const response = await fetch(`${normalizedBase}/api/datasets`, {
          signal: controller.signal,
        });
        if (!response.ok) {
          setDatasetListing(null);
          return;
        }
        const data = (await response.json()) as DatasetListing;
        const folders = Array.isArray(data.folders)
          ? data.folders.map((folder) => {
              if (typeof folder === "string") {
                return { name: folder, count: 0 };
              }
              return {
                name: folder?.name ?? "",
                count: Number.isFinite(folder?.count) ? Number(folder.count) : 0,
              };
            })
          : [];
        setDatasetListing({
          root: data.root,
          folders,
        });
      } catch {
        setDatasetListing(null);
      }
    }

    fetchDatasets();
    return () => controller.abort();
  }, [studioConfig.apiBaseUrl]);

  useEffect(() => {
    const root = studioConfig.datasetRoot?.trim();
    if (!root || models.length === 0) {
      return;
    }

    setDatasetInputs((prev) => {
      let changed = false;
      const next = { ...prev };

      models.forEach((model) => {
        if (next[model.id]) {
          return;
        }
        const currentState = jobStates[model.id] ?? DEFAULT_JOB_STATE;
        if (currentState.datasetPath) {
          return;
        }
        const suggestion = model.datasetPath || joinDatasetPath(root, model.slug);
        next[model.id] = suggestion;
        changed = true;
      });

      return changed ? next : prev;
    });
  }, [models, jobStates, studioConfig.datasetRoot]);

  const resetForm = () => {
    setFormState({ name: "", token: "", description: "" });
    setFormError(null);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/models", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formState.name,
          token: formState.token,
          description: formState.description,
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | (Model & { error?: string })
        | null;

      if (!response.ok || !payload) {
        throw new Error(payload?.error || "Unable to create model.");
      }

      const model = payload as Model;
      setModels((prev) => [model, ...prev]);
      resetForm();
      toast({
        title: "Model created",
        description: `${model.name} is ready for training.`,
      });
    } catch (error) {
      console.error("[models] create failed", error);
      setFormError(error instanceof Error ? error.message : "Unable to create model.");
      toast({
        title: "Model creation failed",
        description:
          error instanceof Error ? error.message : "Unable to create model.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getJobState = (modelId: string): JobState =>
    jobStates[modelId] ?? DEFAULT_JOB_STATE;

  const setJobState = (
    modelId: string,
    updater: (current: JobState) => JobState
  ) => {
    setJobStates((prev) => {
      const current = prev[modelId] ?? DEFAULT_JOB_STATE;
      return {
        ...prev,
        [modelId]: updater(current),
      };
    });
  };

  const filteredModels = useMemo(() => {
    if (!searchQuery) {
      return models;
    }

    return models.filter((model) => {
      const haystack = [
        model.name,
        model.token,
        model.description ?? "",
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(searchQuery);
    });
  }, [models, searchQuery]);

  const handleDatasetSelection = (
    modelId: string,
    datasetPath: string,
    detectedCount?: number
  ) => {
    setDatasetInputs((prev) => ({
      ...prev,
      [modelId]: datasetPath,
    }));

    setJobState(modelId, (current) => ({
      ...current,
      datasetPath,
      message: null,
      errorMessage: null,
      status: current.status === "error" ? "idle" : current.status,
    }));

    if (typeof detectedCount === "number" && detectedCount >= 0) {
      setModels((prev) =>
        prev.map((model) =>
          model.id === modelId ? { ...model, datasetCount: detectedCount } : model
        )
      );
    }
  };

  const handleTrain = async (model: Model, datasetItems: number) => {
    if (datasetItems <= 0) {
      setJobState(model.id, (current) => ({
        ...current,
        status: "error",
        errorMessage: "Add at least one dataset image before training.",
        message: null,
      }));
      toast({
        title: "Dataset required",
        description: "Generate and save preview images for this model before training.",
        variant: "destructive",
      });
      return;
    }

    const rawInput =
      datasetInputs[model.id] ?? getJobState(model.id).datasetPath ?? "";
    const datasetPath = rawInput.trim();

    if (!datasetPath) {
      setJobState(model.id, (current) => ({
        ...current,
        status: "error",
        errorMessage: "Set a dataset directory before training.",
        message: null,
      }));
      toast({
        title: "Dataset path required",
        description: "Set a dataset directory before training.",
        variant: "destructive",
      });
      return;
    }

    setJobState(model.id, (current) => ({
      ...current,
      status: "queueing",
      datasetPath,
      message: "Queueing training job…",
      errorMessage: null,
    }));

    try {
      const response = await fetch(`/api/models/${model.id}/train-lora`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          datasetPath,
          outputName: model.slug || model.id || model.name,
          additionalArgs: [],
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as {
          error?: string;
          detail?: string;
          message?: string;
        };
        const errorMessage =
          payload.detail?.toString().trim() ||
          payload.error?.toString().trim() ||
          payload.message?.toString().trim() ||
          "Worker error. Check worker logs or training config.";

        setJobState(model.id, (current) => ({
          ...current,
          status: "error",
          jobId: null,
          message: null,
          errorMessage,
        }));
        return;
      }

      const data = (await response.json()) as {
        job_id: string | null;
        status: string;
        message?: string | null;
        log_path?: string | null;
        output_dir?: string | null;
        output_weight?: string | null;
        command?: string | null;
        dataset_path?: string | null;
      };

      const responseDatasetPath = data.dataset_path ?? datasetPath;

      setJobState(model.id, (current) => ({
        ...current,
        status: "queued",
        jobId: data.job_id ?? null,
        datasetPath: responseDatasetPath,
        logPath: data.log_path ?? null,
        outputDir: data.output_dir ?? null,
        outputWeight: data.output_weight ?? null,
        command: data.command ?? null,
        message: data.message ?? "LoRA training job queued.",
        errorMessage: null,
      }));
      setDatasetInputs((prev) => ({ ...prev, [model.id]: responseDatasetPath }));
    } catch (error) {
      console.error("[models] train failed", error);

      const fallback =
        error instanceof Error
          ? error.message
          : "Worker error. Check worker logs or training config.";

      setJobState(model.id, (current) => ({
        ...current,
        status: "error",
        jobId: null,
        message: null,
        errorMessage: fallback,
      }));
    }
  };

  const sortedModels = useMemo(() => {
    return [...filteredModels].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [filteredModels]);

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Models</h1>
          <p className="text-sm text-muted-foreground">
            Create a persona, generate previews on the Generate tab, keep the best shots, then train a LoRA once the dataset looks solid.
          </p>
          <ul className="mt-2 space-y-1 text-xs text-muted-foreground/80">
            <li>1. Generate previews and keep images to build the dataset.</li>
            <li>2. Verify the dataset path below matches the kept images.</li>
            <li>3. Run Train LoRA to queue a kohya job for this model.</li>
          </ul>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" disabled>
            <Upload className="mr-2 h-4 w-4" aria-hidden="true" />
            Import dataset (coming soon)
          </Button>
          <Button onClick={() => document.getElementById("model-name")?.focus()}>
            <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
            New model
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
                <label className="text-xs font-semibold uppercase text-muted-foreground" htmlFor="model-name">
                  Name
                </label>
                <Input
                  id="model-name"
                  placeholder="Model name"
                  className="h-10 rounded-lg"
                  value={formState.name}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, name: event.target.value }))
                  }
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase text-muted-foreground" htmlFor="model-token">
                  Trigger token
                </label>
                <Input
                  id="model-token"
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
                <label className="text-xs font-semibold uppercase text-muted-foreground" htmlFor="model-description">
                  Description
                </label>
                <textarea
                  id="model-description"
                  className="min-h-[96px] w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  placeholder="Optional notes about the model."
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
                  "Create model"
                )}
              </Button>

              <p className="text-xs text-muted-foreground">
                Models are stored locally and tied to the dev user. Training links to the
                FastAPI worker stub.
              </p>
              <div className="flex items-start gap-2 rounded-md border border-border/60 bg-muted/20 p-3 text-xs text-muted-foreground">
                <ShieldAlert className="mt-0.5 h-4 w-4 flex-shrink-0 text-accent" aria-hidden="true" />
                <p>
                  Use images you have rights to, avoid sensitive personal data, and confirm consent
                  before training on real individuals. StudioNOVA stores datasets locally only.
                </p>
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-3 rounded-lg border border-border/40 bg-card/60 p-4 text-xs text-muted-foreground">
          <p className="font-semibold text-foreground">Training checklist</p>
          <ul className="list-inside list-disc space-y-2 leading-relaxed">
            <li>Curate at least 150 images per model for stable LoRA quality.</li>
            <li>Include the trigger token in 30%+ of captions for consistency.</li>
            <li>Keep datasets organized — one folder per model.</li>
            <li>Phase 8 will wire kohya_ss for real training runs.</li>
          </ul>
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="text-base font-semibold text-muted-foreground">Model roster</h2>
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Loading models…
          </div>
        ) : sortedModels.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {searchQuery
              ? `No models match “${rawSearch}”.`
              : "No models yet. Create one using the form above."}
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {sortedModels.map((model) => {
              const jobState = getJobState(model.id);
              const datasetValue =
                datasetInputs[model.id] ?? jobState.datasetPath ?? "";
              const isQueueing = jobState.status === "queueing";
              const hasInlineError =
                jobState.status === "error" && Boolean(jobState.errorMessage);
              const availableFolders = datasetListing?.folders ?? [];
              const detectedRoot = datasetListing?.root ?? studioConfig.datasetRoot;
              const datasetFolder = availableFolders.find(
                (folder) => folder.name === model.slug
              );
              const datasetCount =
                typeof datasetFolder?.count === "number"
                  ? datasetFolder.count
                  : typeof model.datasetCount === "number"
                    ? model.datasetCount
                    : 0;
              const canTrain = datasetCount > 0;

              return (
                <Card
                  key={model.id}
                  id={`model-${model.id}`}
                  className="border-none bg-card/90 shadow-sm"
                >
                  <CardContent className="space-y-3 py-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-lg font-semibold">{model.name}</h3>
                        <p className="text-xs text-muted-foreground">{model.token}</p>
                      </div>
                      <span className="rounded-full bg-accent/20 px-3 py-1 text-xs font-semibold uppercase text-accent-foreground">
                        {model.lora_path ? "Trained" : "Untrained"}
                      </span>
                    </div>

                    {model.description ? (
                      <p className="text-xs text-muted-foreground">{model.description}</p>
                    ) : null}

                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>
                        Created {new Date(model.created_at).toLocaleDateString()}
                      </span>
                      <span>
                        Updated {new Date(model.updated_at).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="space-y-2">
                      <label className="space-y-1 text-xs text-muted-foreground">
                        <span className="font-semibold uppercase">Dataset path</span>
                        <Input
                          value={datasetValue}
                          onChange={(event) =>
                            setDatasetInputs((prev) => ({
                              ...prev,
                              [model.id]: event.target.value,
                            }))
                          }
                          placeholder="e.g. D:/LoRA/ava or /data/ava"
                          className={cn(
                            "h-10 rounded-lg",
                            hasInlineError ? "border-destructive focus-visible:ring-destructive" : ""
                          )}
                          aria-invalid={hasInlineError}
                          spellCheck={false}
                          autoComplete="off"
                          inputMode="text"
                        />
                        <p className="text-[11px] text-muted-foreground/80">
                          Provide a folder containing captions and images for {model.name}.
                        </p>
                        <p className="text-[11px] text-muted-foreground/70">
                          Current dataset items: <span className="font-semibold">{datasetCount}</span>
                        </p>
                        {availableFolders.length > 0 ? (
                          <div className="space-y-1 pt-1">
                            <select
                              className="h-9 w-full rounded-lg border border-border bg-background/80 text-xs text-muted-foreground focus:outline-none"
                              defaultValue=""
                              onChange={(event) => {
                                const folderName = event.target.value;
                                if (!folderName) {
                                  return;
                                }
                                const fullPath = joinDatasetPath(detectedRoot, folderName);
                                const folderMeta = availableFolders.find(
                                  (folder) => folder.name === folderName
                                );
                                handleDatasetSelection(model.id, fullPath, folderMeta?.count);
                                event.target.value = "";
                              }}
                            >
                              <option value="">Select from detected folders</option>
                              {availableFolders.map((folder) => (
                                <option key={folder.name} value={folder.name}>
                                  {folder.name} ({folder.count})
                                </option>
                              ))}
                            </select>
                            <p className="text-[11px] text-muted-foreground/70">
                              Detected under {detectedRoot}.
                            </p>
                          </div>
                        ) : null}
                        {hasInlineError ? (
                          <p className="text-xs font-medium text-destructive">
                            {jobState.errorMessage}
                          </p>
                        ) : null}
                      </label>

                      <Button
                        variant="outline"
                        className="w-full justify-center"
                        onClick={() => handleTrain(model, datasetCount)}
                        disabled={isQueueing || !canTrain}
                      >
                        {isQueueing ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                            Queueing…
                          </>
                        ) : (
                          "Train LoRA"
                        )}
                      </Button>
                      {!canTrain ? (
                        <p className="text-[11px] text-muted-foreground/80">
                          Generate and save preview images for this model before training.
                        </p>
                      ) : null}

                      {jobState.status !== "idle" || jobState.jobId ? (
                        <div className="rounded-md border border-border/60 bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
                          <p>
                            Status: <span className="font-semibold">{jobState.status}</span>
                          </p>
                          {jobState.message ? (
                            <p className="mt-1 text-muted-foreground/80">{jobState.message}</p>
                          ) : null}
                          {jobState.jobId ? (
                            <p className="mt-1 break-all">Job ID: {jobState.jobId}</p>
                          ) : null}
                          {jobState.datasetPath ? (
                            <p className="mt-1 break-all">Dataset: {jobState.datasetPath}</p>
                          ) : null}
                          {jobState.outputWeight ? (
                            <p className="mt-1 break-all">Output: {jobState.outputWeight}</p>
                          ) : jobState.outputDir ? (
                            <p className="mt-1 break-all">Output dir: {jobState.outputDir}</p>
                          ) : null}
                          {jobState.logPath ? (
                            <p className="mt-1 break-all">
                              Log:{" "}
                              <a
                                className="underline"
                                href={`/api/assets/file?path=${encodeURIComponent(jobState.logPath)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                View log
                              </a>
                            </p>
                          ) : null}
                          {jobState.command ? (
                            <p className="mt-1 break-all text-[11px] text-muted-foreground/80">
                              Command: {jobState.command}
                            </p>
                          ) : null}
                          {jobState.errorMessage ? (
                            <p className="mt-1 text-destructive">{jobState.errorMessage}</p>
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

