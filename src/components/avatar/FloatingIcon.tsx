"use client";

import { useId } from "react";

import {
  AVATAR_DIAMETER,
  BADGE_DIAMETER,
  BADGE_EDGE,
  BADGE_GLYPH_CAP_HEIGHT,
  BADGE_GLYPH_SIZE,
  BADGE_PILL_WIDTH,
  BEZEL_RADIUS,
  DOT_DIAMETER,
  DOT_EDGE,
  ICON_CENTER,
  ICON_COLORS,
  ICON_SIZE,
  RING_CIRCUMFERENCE,
  RING_RADIUS,
  RING_START_DEG,
  RING_STROKE,
  TRACK_OPACITY,
  iconAppearance,
  pointOnRing,
  type FloatingIconStatus,
} from "./floatingIconGeometry";
import { useImageFallback } from "./useImageFallback";

export type FloatingIconBadge = "!" | "i" | number | null;

export interface FloatingIconProps {
  /** The avatar image; without one the initials sit in the same bezel. */
  imageUrl?: string | null;
  initials?: string;
  status: FloatingIconStatus;
  /** Today's share of the target, 0 to 1. */
  progress: number;
  badge?: FloatingIconBadge;
  /** Rendered size in pixels; the drawing scales from its real size of 56. */
  size?: number;
  /** What a screen reader hears, for example "Working · 5h 12m of 8h". */
  label?: string;
  className?: string;
}

const AVATAR_RADIUS = AVATAR_DIAMETER / 2;
const HOLLOW_DOT_STROKE = 1;

function badgeText(badge: Exclude<FloatingIconBadge, null>): string {
  if (typeof badge === "number") return badge > 9 ? "9+" : String(badge);
  return badge;
}

/**
 * The desktop agent's floating icon as an SVG: the avatar in a graphite bezel with a soft
 * shadow and no glow, a 2 px ring over a faint track, a status dot on the ring where it
 * starts, and an optional badge. Used wherever the portal previews the icon.
 */
export function FloatingIcon({
  imageUrl,
  initials,
  status,
  progress,
  badge = null,
  size = ICON_SIZE,
  label,
  className,
}: FloatingIconProps) {
  // React's ids carry characters that do not survive inside url(#...).
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const metal = `${id}-metal`;
  const clip = `${id}-clip`;
  const shadow = `${id}-shadow`;

  const { broken, onError } = useImageFallback(imageUrl ?? null);
  const look = iconAppearance(status, progress);
  const dot = pointOnRing(RING_START_DEG);
  const badgeAt = pointOnRing(-RING_START_DEG);
  const avatarLeft = ICON_CENTER - AVATAR_RADIUS;
  const text = badge === null ? null : badgeText(badge);
  const badgeWidth = text !== null && text.length > 1 ? BADGE_PILL_WIDTH : BADGE_DIAMETER;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${ICON_SIZE} ${ICON_SIZE}`}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      data-status={status}
      className={className}
      // The shadow reaches past the 56 px box without moving the layout.
      style={{ overflow: "visible", flexShrink: 0 }}
      shapeRendering="geometricPrecision"
    >
      <defs>
        <linearGradient id={metal} x1="0.15" y1="0.05" x2="0.85" y2="0.95">
          <stop offset="0" stopColor="#6F7784" />
          <stop offset="0.5" stopColor="#474E5A" />
          <stop offset="1" stopColor="#2A2F38" />
        </linearGradient>
        <clipPath id={clip}>
          <circle cx={ICON_CENTER} cy={ICON_CENTER} r={AVATAR_RADIUS} />
        </clipPath>
        <filter id={shadow} x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow
            dx="0"
            dy="1.2"
            stdDeviation="1.6"
            floodColor="#000000"
            floodOpacity="0.32"
          />
        </filter>
      </defs>

      <circle
        data-part="bezel"
        cx={ICON_CENTER}
        cy={ICON_CENTER}
        r={BEZEL_RADIUS}
        fill={`url(#${metal})`}
        filter={`url(#${shadow})`}
      />
      <circle cx={ICON_CENTER} cy={ICON_CENTER} r={AVATAR_RADIUS + 2.5} fill="#1E222A" />

      <circle
        data-part="track"
        cx={ICON_CENTER}
        cy={ICON_CENTER}
        r={RING_RADIUS}
        fill="none"
        stroke={ICON_COLORS.track}
        strokeOpacity={TRACK_OPACITY}
        strokeWidth={RING_STROKE}
      />
      {look.arcLength > 0 && (
        <circle
          data-part="ring"
          cx={ICON_CENTER}
          cy={ICON_CENTER}
          r={RING_RADIUS}
          fill="none"
          stroke={look.ringColor}
          strokeOpacity={look.ringOpacity}
          strokeWidth={RING_STROKE}
          strokeLinecap="round"
          strokeDasharray={`${look.arcLength} ${RING_CIRCUMFERENCE}`}
          transform={`rotate(${RING_START_DEG} ${ICON_CENTER} ${ICON_CENTER})`}
          // The ring moves at most once a minute, with a slow ease (brief 1.1).
          style={{ transition: "stroke-dasharray 1200ms ease-in-out" }}
        />
      )}

      <circle cx={ICON_CENTER} cy={ICON_CENTER} r={AVATAR_RADIUS} fill="#2A303B" />
      {imageUrl && !broken ? (
        <image
          data-part="avatar"
          href={imageUrl}
          onError={onError}
          x={avatarLeft}
          y={avatarLeft}
          width={AVATAR_DIAMETER}
          height={AVATAR_DIAMETER}
          preserveAspectRatio="xMidYMid slice"
          clipPath={`url(#${clip})`}
        />
      ) : (
        <text
          data-part="initials"
          x={ICON_CENTER}
          y={ICON_CENTER}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={15}
          fontWeight={600}
          fill="#E7EAF0"
        >
          {initials}
        </text>
      )}

      <circle
        data-part="dot-edge"
        cx={dot.x}
        cy={dot.y}
        r={DOT_DIAMETER / 2 + DOT_EDGE}
        fill={ICON_COLORS.dotEdge}
      />
      {look.dotFill ? (
        <circle data-part="dot" cx={dot.x} cy={dot.y} r={DOT_DIAMETER / 2} fill={look.dotFill} />
      ) : (
        <circle
          data-part="dot"
          cx={dot.x}
          cy={dot.y}
          r={DOT_DIAMETER / 2 - HOLLOW_DOT_STROKE / 2}
          fill="none"
          stroke={ICON_COLORS.hollowDot}
          strokeWidth={HOLLOW_DOT_STROKE}
        />
      )}

      {text !== null && (
        <g data-part="badge">
          <rect
            data-part="badge-edge"
            x={badgeAt.x - badgeWidth / 2 - BADGE_EDGE}
            y={badgeAt.y - BADGE_DIAMETER / 2 - BADGE_EDGE}
            width={badgeWidth + BADGE_EDGE * 2}
            height={BADGE_DIAMETER + BADGE_EDGE * 2}
            rx={BADGE_DIAMETER / 2 + BADGE_EDGE}
            fill={ICON_COLORS.badgeEdge}
          />
          <rect
            data-part="badge-fill"
            x={badgeAt.x - badgeWidth / 2}
            y={badgeAt.y - BADGE_DIAMETER / 2}
            width={badgeWidth}
            height={BADGE_DIAMETER}
            rx={BADGE_DIAMETER / 2}
            fill={ICON_COLORS.badge}
          />
          {/* On its alphabetic baseline, half a capital below the middle, so it sits centred
              in any font: the "central" baseline follows each font's ascent and descent. */}
          <text
            data-part="badge-glyph"
            x={badgeAt.x}
            y={badgeAt.y + (BADGE_GLYPH_SIZE * BADGE_GLYPH_CAP_HEIGHT) / 2}
            textAnchor="middle"
            fontSize={BADGE_GLYPH_SIZE}
            fontWeight={800}
            fill={ICON_COLORS.badgeGlyph}
          >
            {text}
          </text>
        </g>
      )}
    </svg>
  );
}
