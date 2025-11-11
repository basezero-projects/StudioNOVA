const FALLBACK_SLUG = "character";

function sanitizeFragment(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function characterSlug(name: string | null | undefined, token: string | null | undefined): string {
  const fragments = [name, token]
    .map((fragment) => sanitizeFragment(fragment ?? ""))
    .filter(Boolean);

  if (fragments.length === 0) {
    return FALLBACK_SLUG;
  }

  return sanitizeFragment(fragments.join("-")) || FALLBACK_SLUG;
}

export function defaultDatasetPath(slug: string, root?: string): string {
  const safeRoot = root?.trim() || "datasets";
  return `${safeRoot.replace(/[\\\/]+$/, "")}/${slug}`;
}


