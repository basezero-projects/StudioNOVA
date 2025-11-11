import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MOCK_ASSETS } from "@/lib/constants";

export default function GalleryPage() {
  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Gallery</h1>
          <p className="text-sm text-muted-foreground">
            Browse generated outputs and review mock metadata. Upscaling toggles arrive
            later in the roadmap.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" disabled>
            Filter (Phase 6)
          </Button>
          <Button disabled>Export selected</Button>
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {MOCK_ASSETS.map((asset) => (
          <Card key={asset.id} className="overflow-hidden border-none bg-card/90 shadow-sm">
            <div
              className={`relative aspect-square w-full bg-gradient-to-br ${asset.previewClass}`}
            >
              <div className="absolute inset-0 bg-black/20" />
              <div className="absolute bottom-3 left-3 rounded-full bg-black/50 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-white">
                {asset.characterName}
              </div>
            </div>
            <CardContent className="space-y-3 py-4 text-sm">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-foreground">{asset.title}</p>
                  <p className="text-xs text-muted-foreground">{asset.resolution}</p>
                </div>
                {asset.isUpscaled ? (
                  <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold uppercase text-emerald-400">
                    Upscaled
                  </span>
                ) : (
                  <span className="rounded-full bg-border px-2 py-0.5 text-[11px] font-semibold uppercase text-muted-foreground">
                    Base
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{asset.updatedAt}</span>
                <Button variant="ghost" size="sm" className="h-7 px-2" disabled>
                  View details
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}

