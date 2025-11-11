import { Plus, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { MOCK_CHARACTERS } from "@/lib/constants";

export default function CharactersPage() {
  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Characters</h1>
          <p className="text-sm text-muted-foreground">
            Curate LoRA-ready personas. Data is mocked until worker wiring in later
            phases.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Upload className="mr-2 h-4 w-4" aria-hidden="true" />
            Import dataset
          </Button>
          <Button>
            <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
            New character
          </Button>
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,320px)]">
        <Card className="border-none bg-card/80 shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">
              Quick create
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm">
            <Input placeholder="Character name" className="h-10 rounded-lg" />
            <Input placeholder="Trigger token" className="h-10 rounded-lg" />
            <Input placeholder="Dataset folder path" className="h-10 rounded-lg" />
            <Button className="justify-center" disabled>
              Submit (Phase 2)
            </Button>
            <p className="text-xs text-muted-foreground">
              Creation is mocked until database wiring in Phase 2+.
            </p>
          </CardContent>
        </Card>

        <div className="space-y-3 rounded-lg border border-border/40 bg-card/60 p-4 text-xs text-muted-foreground">
          <p className="font-semibold text-foreground">Training checklist</p>
          <ul className="list-inside list-disc space-y-2 leading-relaxed">
            <li>Minimum 150 curated images, 768px minimum resolution.</li>
            <li>Include trigger token in at least 30% of captions.</li>
            <li>Keep metadata tidy: avoid conflicting class names.</li>
            <li>Training jobs will call kohya_ss in Phase 8.</li>
          </ul>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {MOCK_CHARACTERS.map((character) => (
          <Card key={character.id} className="overflow-hidden border-none bg-card/90 shadow-sm">
            <div
              className={`h-28 bg-gradient-to-br ${character.accentClass} opacity-90`}
              aria-hidden="true"
            />
            <CardContent className="space-y-3 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">{character.name}</h3>
                  <p className="text-xs text-muted-foreground">{character.token}</p>
                </div>
                <span className="rounded-full bg-accent/20 px-3 py-1 text-xs font-semibold uppercase text-accent-foreground">
                  {character.status}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{character.datasetSize}</span>
                <span>{character.updatedAt}</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <Button variant="outline" className="h-8 flex-1 justify-center" disabled>
                  Train (Phase 5)
                </Button>
                <Button variant="ghost" className="h-8 flex-1 justify-center" disabled>
                  View dataset
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}

