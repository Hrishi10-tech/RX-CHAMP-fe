import { formatWorkDays, toggleWorkDay } from "./workDays";

describe("formatWorkDays", () => {
  it.each([
    [[1, 2, 3, 4, 5], "Mon–Fri"],
    [[1, 2, 3, 4, 5, 6], "Mon–Sat"],
    [[1, 2, 3, 4, 5, 6, 7], "Every day"],
    [[1, 3, 5], "Mon, Wed, Fri"],
    [[1, 2], "Mon, Tue"],
    [[1, 2, 3, 4, 6], "Mon–Thu, Sat"],
    [[6, 7], "Sat, Sun"],
    [[5, 1, 3, 2, 4], "Mon–Fri"],
    [[], "No days"],
  ])("%p reads %p", (days, text) => {
    expect(formatWorkDays(days)).toBe(text);
  });

  it("ignores duplicates and out-of-range values", () => {
    expect(formatWorkDays([1, 1, 2, 3, 9, 0])).toBe("Mon–Wed");
  });
});

describe("toggleWorkDay", () => {
  it("adds in order and removes", () => {
    expect(toggleWorkDay([1, 5], 3)).toEqual([1, 3, 5]);
    expect(toggleWorkDay([1, 3, 5], 3)).toEqual([1, 5]);
  });
});
