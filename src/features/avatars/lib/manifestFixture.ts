import type { AvatarLibrary, AvatarManifest, AvatarManifestItem } from "@/features/avatars/types";

/** The library's shape for tests: 75 of each, three sets of 25, hashed URLs. */
export function manifestFixture(): AvatarManifest {
  const items = (prefix: string, gender: AvatarLibrary): AvatarManifestItem[] =>
    Array.from({ length: 75 }, (_, i) => {
      const id = `${prefix}${String(i + 1).padStart(2, "0")}`;
      return {
        id,
        gender,
        set: Math.floor(i / 25) + 1,
        files: Object.fromEntries(
          [48, 96, 144, 192].map((size) => [
            String(size),
            `/api/v1/avatars/files/${size}/${id}.webp?v=hash${id}`,
          ]),
        ),
      };
    });
  return {
    version: 1,
    defaults: { male: "M01", female: "F01" },
    avatars: [...items("M", "male"), ...items("F", "female")],
  };
}
