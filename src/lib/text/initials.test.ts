import { initialsOf } from "./initials";

describe("initialsOf", () => {
  it.each([
    ["Maya Reddy", "MR"],
    ["Praveen (Super Admin)", "PS"],
    ["asha@example.com", "AE"],
    ["Zoë", "Z"],
    ["  ", "U"],
    ["()", "U"],
  ])("%p -> %p", (input, expected) => {
    expect(initialsOf(input)).toBe(expected);
  });
});
