/** Ordered thumbnail URLs for a YouTube video (API first, then i.ytimg fallbacks). */
export function getYouTubeThumbnailCandidates(
  videoId: string,
  apiThumbnailUrl?: string | null,
): string[] {
  const seen = new Set<string>();
  const out: string[] = [];

  const push = (url: string | null | undefined) => {
    const trimmed = url?.trim();
    if (!trimmed || seen.has(trimmed)) return;
    seen.add(trimmed);
    out.push(trimmed);
  };

  push(apiThumbnailUrl);

  if (videoId.trim()) {
    const id = encodeURIComponent(videoId.trim());
    push(`https://i.ytimg.com/vi/${id}/mqdefault.jpg`);
    push(`https://i.ytimg.com/vi/${id}/hqdefault.jpg`);
    push(`https://i.ytimg.com/vi/${id}/default.jpg`);
  }

  return out;
}
