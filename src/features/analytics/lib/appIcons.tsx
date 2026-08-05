import { type IconType } from "react-icons";
import {
  SiDocker,
  SiFigma,
  SiFirefoxbrowser,
  SiGithub,
  SiGitlab,
  SiGooglechrome,
  SiIntellijidea,
  SiJira,
  SiNotion,
  SiPostman,
  SiSlack,
  SiSpotify,
  SiYoutube,
  SiZoom,
} from "react-icons/si";
import { TbBrandVscode, TbBrandWindows } from "react-icons/tb";

import type { AppIconDef } from "@/features/analytics/types";

const APP_ICONS: AppIconDef[] = [ 
  {
    keywords: ["visual studio code", "vs code", "vscode", "code.exe"],
    Icon: TbBrandVscode,
    color: "#0098FF",
  },
  { keywords: ["postman"], Icon: SiPostman, color: "#FF6C37" },
  { keywords: ["chrome"], Icon: SiGooglechrome, color: "#4285F4" },
  { keywords: ["firefox"], Icon: SiFirefoxbrowser, color: "#FF7139" },
  { keywords: ["slack"], Icon: SiSlack, color: "#4A154B" },
  { keywords: ["figma"], Icon: SiFigma, color: "#F24E1E" },
  { keywords: ["notion"], Icon: SiNotion, color: "#111827" },
  { keywords: ["github"], Icon: SiGithub, color: "#181717" },
  { keywords: ["gitlab"], Icon: SiGitlab, color: "#FC6D26" },
  { keywords: ["intellij"], Icon: SiIntellijidea, color: "#087CFA" },
  { keywords: ["docker"], Icon: SiDocker, color: "#2496ED" },
  { keywords: ["zoom"], Icon: SiZoom, color: "#2D8CFF" },
  { keywords: ["spotify"], Icon: SiSpotify, color: "#1DB954" },
  { keywords: ["youtube"], Icon: SiYoutube, color: "#FF0000" },
  { keywords: ["jira"], Icon: SiJira, color: "#0052CC" },
  {
    keywords: ["windows explorer", "file explorer", "explorer", "windows"],
    Icon: TbBrandWindows,
    color: "#0078D4",
  },
];

export function getAppIcon(name: string): { Icon: IconType; color: string } | null {
  const n = name.toLowerCase();
  for (const def of APP_ICONS) {
    if (def.keywords.some((k) => n.includes(k))) {
      return { Icon: def.Icon, color: def.color };
    }
  }
  return null;
}
