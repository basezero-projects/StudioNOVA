"use client";

import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  getConfigStorageKey,
  getDefaultConfig,
  loadConfig,
  saveConfig,
  type StudioConfig,
} from "@/lib/studio-config";

type ConfigField = {
  key: keyof StudioConfig;
  label: string;
  description: string;
  placeholder: string;
};

const CONFIG_FIELDS: ConfigField[] = [
  {
    key: "apiBaseUrl",
    label: "Worker API Base URL",
    description: "Browser requests to the FastAPI worker.",
    placeholder: "http://localhost:8000",
  },
  {
    key: "comfyApiUrl",
    label: "COMFYUI_API_URL",
    description: "Direct access for image generation pipelines.",
    placeholder: "http://localhost:8188",
  },
  {
    key: "kohyaRoot",
    label: "KOHYA_PATH",
    description: "Local path to the kohya_ss repository.",
    placeholder: "external/kohya_ss",
  },
  {
    key: "outputDir",
    label: "OUTPUT_DIR",
    description: "Where generated assets are written.",
    placeholder: "storage/results",
  },
  {
    key: "datasetRoot",
    label: "KOHYA_DATASET_ROOT",
    description: "Base directory for training datasets.",
    placeholder: "datasets",
  },
];

export default function SettingsPage() {
  const defaults = useMemo(() => getDefaultConfig(), []);
  const [config, setConfig] = useState<StudioConfig>(defaults);
  const [draft, setDraft] = useState<StudioConfig>(defaults);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    const stored = loadConfig();
    setConfig(stored);
    setDraft(stored);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const handleStorage = (event: StorageEvent) => {
      if (event.key === getConfigStorageKey()) {
        const latest = loadConfig();
        setConfig(latest);
        setDraft(latest);
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const startEditing = () => {
    setDraft(config);
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setDraft(config);
    setIsEditing(false);
  };

  const saveEditing = () => {
    setConfig(draft);
    saveConfig(draft);
    setIsEditing(false);
  };

  const updateDraft = (key: keyof StudioConfig, value: string) => {
    setDraft((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  return (
    <section className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Settings are stored locally for this browser and override defaults used by the web app.
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-none bg-card/90 shadow-sm">
          <CardHeader className="flex items-center justify-between gap-2">
            <div>
              <CardTitle className="text-sm text-muted-foreground">Engine endpoints</CardTitle>
              <p className="text-xs text-muted-foreground/80">
                Update local connection targets without touching .env files.
              </p>
            </div>
            {isEditing ? (
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={cancelEditing}>
                  Cancel
                </Button>
                <Button size="sm" onClick={saveEditing}>
                  Save
                </Button>
              </div>
            ) : (
              <Button size="sm" variant="outline" onClick={startEditing}>
                Edit
              </Button>
            )}
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {CONFIG_FIELDS.map((field) => (
              <div
                key={field.key}
                className="space-y-1 rounded-lg border border-border/60 bg-muted/15 p-3"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <div>
                    <p className="font-semibold text-foreground">{field.label}</p>
                    <p className="text-[11px] text-muted-foreground/80">{field.description}</p>
                  </div>
                </div>
                {isEditing ? (
                  <Input
                    value={draft[field.key]}
                    onChange={(event) => updateDraft(field.key, event.target.value)}
                    placeholder={field.placeholder}
                    className="h-10 rounded-lg"
                    spellCheck={false}
                    autoComplete="off"
                  />
                ) : (
                  <p className="text-sm text-muted-foreground/90 break-all">{config[field.key]}</p>
                )}
              </div>
            ))}
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
              Phase 4 introduces local credentials. Until then, we surface reminders to ensure
              compliant datasets and responsible usage.
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

