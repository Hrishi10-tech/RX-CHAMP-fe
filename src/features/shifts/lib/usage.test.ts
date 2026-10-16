import { assignedToday } from "./usage";

describe("assignedToday", () => {
  it("is null when nothing points at the shift", () => {
    expect(assignedToday({ people: 0, departments: [], overrides: 0 })).toBeNull();
  });

  it("names a single department", () => {
    expect(assignedToday({ people: 4, departments: ["Support"], overrides: 0 })).toBe(
      "the Support department",
    );
  });

  it("counts several departments and overrides", () => {
    expect(assignedToday({ people: 9, departments: ["Support", "Sales"], overrides: 1 })).toBe(
      "2 departments and 1 person by override",
    );
    expect(assignedToday({ people: 2, departments: [], overrides: 2 })).toBe(
      "2 people by override",
    );
  });
});
