export const ACCENT_COLOR = "#7A5CFF";

export const APP_NAV_ITEMS = [
  {
    label: "Models",
    href: "/app/models",
    description: "Manage LoRA-ready personas and track training progress.",
  },
  {
    label: "Generate",
    href: "/app/generate",
    description: "Send prompts to ComfyUI using your curated models.",
  },
  {
    label: "Gallery",
    href: "/app/gallery",
    description: "Review generated assets and mark upscaled outputs.",
  },
  {
    label: "Settings",
    href: "/app/settings",
    description: "Control studio configuration and engine targets.",
  },
];

export const MOCK_MODELS = [
  {
    id: "char-aurelia",
    name: "Aurelia Nova",
    token: "@aurelia",
    status: "Trained",
    updatedAt: "2 hours ago",
    datasetSize: "216 images",
    accentClass: "from-[#7A5CFF] via-[#9C8BFF] to-[#C5BFFF]",
  },
  {
    id: "char-orion",
    name: "Orion Voss",
    token: "@orion",
    status: "Training",
    updatedAt: "18 minutes ago",
    datasetSize: "152 images",
    accentClass: "from-[#4AD0C7] via-[#5EE7E0] to-[#B8FFF2]",
  },
  {
    id: "char-celeste",
    name: "Celeste Ada",
    token: "@celeste",
    status: "Queued",
    updatedAt: "Queued for tonight",
    datasetSize: "184 images",
    accentClass: "from-[#FEBF6D] via-[#FFD589] to-[#FFE5B3]",
  },
];

export const MOCK_PROMPT_PRESETS = [
  {
    id: "studio-portrait",
    label: "Studio Portrait",
    description:
      "Cinematic lighting, 50mm depth of field, subtle rim highlights.",
    guidance: 6.5,
    steps: 28,
  },
  {
    id: "travel-journal",
    label: "Travel Journal",
    description:
      "Analog film grain, sun-soaked palettes, minimal background clutter.",
    guidance: 5.8,
    steps: 24,
  },
  {
    id: "neon-runner",
    label: "Neon Runner",
    description:
      "Energetic action frame, neon accent trails, chromatic aberration.",
    guidance: 7.2,
    steps: 32,
  },
];

export const MOCK_ASSETS = [
  {
    id: "asset-01",
    title: "Aurelia · studio lighting test",
    modelName: "Aurelia Nova",
    resolution: "1024 × 1024",
    updatedAt: "Yesterday",
    isUpscaled: true,
    previewClass: "from-[#7A5CFF] via-[#8F74FF] to-[#24243E]",
  },
  {
    id: "asset-02",
    title: "Orion · kinetic motion sketch",
    modelName: "Orion Voss",
    resolution: "768 × 1024",
    updatedAt: "3 hours ago",
    isUpscaled: false,
    previewClass: "from-[#4AD0C7] via-[#3387A1] to-[#16222A]",
  },
  {
    id: "asset-03",
    title: "Celeste · concept sheet",
    modelName: "Celeste Ada",
    resolution: "2048 × 2048",
    updatedAt: "Draft",
    isUpscaled: false,
    previewClass: "from-[#FEBF6D] via-[#F18805] to-[#311E10]",
  },
  {
    id: "asset-04",
    title: "Aurelia · cinematic close-up",
    modelName: "Aurelia Nova",
    resolution: "1536 × 1024",
    updatedAt: "Just now",
    isUpscaled: true,
    previewClass: "from-[#F78FB3] via-[#AF3B6E] to-[#3A1C71]",
  },
];

