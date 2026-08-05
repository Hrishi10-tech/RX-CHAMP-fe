import type { ReactNode } from "react";

export type ScreenshotKind = "AUTO" | "MANUAL";

export type KindFilter = "ALL" | ScreenshotKind;

export type RangeFilter = "ALL" | "LAST_HOUR" | "TODAY" | "DATE";

export interface Screenshot {
  id?: string;
  kind: ScreenshotKind;
  takenAt: string;
  url: string;
}

export interface ScreenshotList {
  userId: string;
  total: number;
  items: Screenshot[];
}

export interface GetScreenshotsParams {
  userId: string;
  limit?: number;
  offset?: number;
  from?: string;
  to?: string;
  kind?: ScreenshotKind;
  q?: string;
  includeArchived?: boolean;
}

export interface ScreenshotLightboxProps {
  src: string;
  alt: string;
  label: string;
  badge?: ReactNode;
  onClose: () => void;
}
