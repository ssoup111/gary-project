/**
 * Turns a category slug (e.g. "female-models") into a clean, human-readable
 * label (e.g. "Female Models") for use as a customer-facing title/caption.
 *
 * We never show the raw `prompt` field to customers — it's leftover
 * AI-generation / stock-photo import metadata (search queries, keyword tag
 * dumps, sometimes even photographer credit lines) and is not fit for
 * display. This is the safe, always-clean fallback used everywhere a
 * product title or short caption is needed.
 */
export function categoryLabel(slug: string | null | undefined): string {
  if (!slug) return "Approved Image";
  return slug
    .split("-")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
