type LessonDescriptionInput = {
  description?: string | null;
  video_source?: string | null;
  external_metadata?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
};

const SOCIAL_LINK_PATTERNS = [
  /telegram/i,
  /instagram/i,
  /linkedin/i,
  /twitter\.com/i,
  /x\.com/i,
  /facebook\.com/i,
];

function countHashtags(text: string): number {
  const matches = text.match(/#\w+/g);
  return matches?.length ?? 0;
}

function countTimestampLines(text: string): number {
  const matches = text.match(/^\s*\d{1,2}:\d{2}/gm);
  return matches?.length ?? 0;
}

/** Detect long auto-imported YouTube description dumps. */
export function isImportedYouTubeDescription(description: string): boolean {
  const text = description.trim();
  if (!text) return false;

  if (text.length > 700) return true;

  let signals = 0;
  if ((text.match(/https?:\/\//gi) ?? []).length >= 2) signals += 1;
  if (countHashtags(text) >= 3) signals += 1;
  if (countTimestampLines(text) >= 3) signals += 1;
  if (SOCIAL_LINK_PATTERNS.some((pattern) => pattern.test(text))) signals += 1;
  if (/watch till the end/i.test(text)) signals += 1;
  if (/subscribe/i.test(text) && text.length > 280) signals += 1;

  return signals >= 2;
}

/** Whether to show lesson description under the title on the player page. */
export function shouldShowLessonDescription(item: LessonDescriptionInput): boolean {
  const description = item.description?.trim();
  if (!description) return false;

  if (item.video_source === 'youtube') return false;

  const externalSource = item.external_metadata?.source;
  if (externalSource === 'youtube_playlist_import') return false;

  const metaSource = item.metadata?.source;
  if (metaSource === 'youtube_playlist_import') return false;

  if (isImportedYouTubeDescription(description)) return false;

  return true;
}
