"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

import { Loader2, Wand2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";

type Asset = {
  id: string;
  model_id: string;
  file_path: string;
  is_upscaled: boolean;
  created_at: string;
};

export default function GalleryPage() {
  const { toast } = useToast();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [upscaleTarget, setUpscaleTarget] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadAssets() {
      try {
        const response = await fetch("/api/assets", { cache: "no-store" });
        if (!response.ok) {
          throw new Error(await response.text());
        }
        const data = (await response.json()) as Asset[];
        if (active) {
          setAssets(data);
        }
      } catch (error) {
        console.error("[gallery] failed to load assets", error);
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    loadAssets();
    return () => {
      active = false;
    };
  }, []);

  const handleUpscale = async (asset: Asset) => {
    setUpscaleTarget(asset.id);
    try {
      const response = await fetch(`/api/assets/${asset.id}/upscale`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) {
        throw new Error(await response.text());
      }
      const data = await response.json();
      if (data.asset) {
        setAssets((prev) =>
          prev.map((entry) => (entry.id === data.asset.id ? data.asset : entry))
        );
      }
      toast({
        title: "Upscale complete",
        description: "The gallery has been updated with the enhanced image.",
      });
    } catch (error) {
      console.error("[gallery] upscale failed", error);
      toast({
        title: "Upscale failed",
        description: error instanceof Error ? error.message : "Unable to upscale image.",
        variant: "destructive",
      });
    } finally {
      setUpscaleTarget(null);
    }
  };

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Gallery</h1>
          <p className="text-sm text-muted-foreground">
            Browse generated outputs, trigger upscales, and inspect job assets stored on disk.
          </p>
        </div>
      </header>

      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          Loading assets…
        </div>
      ) : assets.length === 0 ? (
        <p className="text-sm text-muted-foreground">No assets yet. Generate an image to populate the gallery.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {assets.map((asset) => {
            const imageUrl = `/api/assets/file?path=${encodeURIComponent(asset.file_path)}`;

            return (
              <Card key={asset.id} className="overflow-hidden border-none bg-card/90 shadow-sm">
                <div className="relative aspect-square w-full overflow-hidden bg-muted">
                  <Image
                    src={imageUrl}
                    alt="Generated asset"
                    fill
                    sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                    className="object-cover"
                    priority={false}
                  />
                  <div className="absolute bottom-2 left-2 rounded-full bg-black/60 px-2 py-1 text-[11px] font-semibold uppercase text-white">
                    {asset.is_upscaled ? "Upscaled" : "Base"}
                  </div>
                </div>
                <CardContent className="space-y-2 py-4 text-sm">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{new Date(asset.created_at).toLocaleString()}</span>
                    <span className="truncate">#{asset.id.slice(0, 8)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleUpscale(asset)}
                      disabled={asset.is_upscaled || upscaleTarget === asset.id}
                    >
                      {upscaleTarget === asset.id ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                          Upscaling…
                        </>
                      ) : (
                        <>
                          <Wand2 className="mr-2 h-4 w-4" aria-hidden="true" />
                          Upscale
                        </>
                      )}
                    </Button>
                    <Button asChild variant="ghost" size="sm" className="flex-1">
                      <a href={imageUrl} target="_blank" rel="noopener noreferrer">
                        Open
                      </a>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </section>
  );
}

