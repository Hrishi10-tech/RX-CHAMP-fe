/** "About 2 min left", "Under a minute left", "About 1 h 5 min left". */
export function etaText(etaSec: number | null | undefined): string {
  if (etaSec === null || etaSec === undefined) return "Working out the time left…";
  if (etaSec < 60) return "Under a minute left";
  const min = Math.round(etaSec / 60);
  if (min < 60) return `About ${min} min left`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `About ${h} h${m ? ` ${m} min` : ""} left`;
}

/** "12.4 MB", "830 KB". */
export function sizeText(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 KB";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

/** "about 3 min" for an estimate before starting. */
export function durationText(sec: number): string {
  if (sec < 60) return "under a minute";
  const min = Math.round(sec / 60);
  if (min < 60) return `about ${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `about ${h} h${m ? ` ${m} min` : ""}`;
}
