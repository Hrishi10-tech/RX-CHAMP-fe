import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

// U-5: the portal's buttons, fields and tables come from src/components/ui. What is still written
// by hand elsewhere (icon toggles inside composite widgets, the sign-in fields, report tables with
// their own layout) is counted here, and the count may only go down: a new screen uses the shared
// controls. Lower a number when you move one over; never raise one.
const SRC = join(__dirname, "..", "..");
// 4.0 (3.6 port): the counts after moving the 4.0 screens over as well (from 164 buttons, 41 inputs).
const HAND_WRITTEN_AT_MOST = { button: 67, input: 12, select: 1, textarea: 0, table: 19 } as const;

const files = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory())
      return path.includes(join("components", "ui")) ? [] : files(path);
    return name.endsWith(".tsx") && !name.includes(".test.") ? [path] : [];
  });

describe("shared controls", () => {
  const text = files(SRC)
    .map((path) => readFileSync(path, "utf8"))
    .join("\n");
  it.each(Object.entries(HAND_WRITTEN_AT_MOST))(
    "no more hand-written <%s> than before (%i)",
    (tag, most) => {
      const found = text.match(new RegExp(`<${tag}\\b`, "g"))?.length ?? 0;
      expect(found).toBeLessThanOrEqual(most);
    },
  );
});
