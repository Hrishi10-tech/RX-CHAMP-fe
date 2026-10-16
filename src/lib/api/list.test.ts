import { cleanParams, readItems, readPage, unwrap } from "./list";

describe("unwrap", () => {
  it("returns the payload of a successful call", () => {
    expect(unwrap({ success: true, data: { a: 1 } }, "x")).toEqual({ a: 1 });
  });

  it("throws the server's message, or the fallback", () => {
    expect(() => unwrap({ success: false, message: "Nope" }, "x")).toThrow("Nope");
    expect(() => unwrap({ success: true }, "Fallback")).toThrow("Fallback");
    expect(() => unwrap(undefined, "Fallback")).toThrow("Fallback");
  });
});

describe("readItems and readPage", () => {
  it("reads the 3.1 shape, data.items with data.meta", () => {
    const page = readPage(
      {
        success: true,
        data: { items: [1, 2], meta: { total: 9, page: 2, limit: 2, totalPages: 5 } },
      },
      "x",
    );
    expect(page).toEqual({ items: [1, 2], meta: { total: 9, page: 2, limit: 2, totalPages: 5 } });
  });

  it("reads the 3.0 shape, the array in data with meta beside it", () => {
    const page = readPage(
      { success: true, data: ["a"], meta: { total: 1, page: 1, limit: 50, totalPages: 1 } },
      "x",
    );
    expect(page.items).toEqual(["a"]);
    expect(page.meta?.total).toBe(1);
  });

  it("treats anything else as an empty list", () => {
    expect(readItems(null)).toEqual([]);
    expect(readItems({ rows: [] })).toEqual([]);
    expect(readPage({ success: true, data: { items: "no" } }, "x")).toEqual({
      items: [],
      meta: undefined,
    });
  });

  it("throws on a failed answer", () => {
    expect(() => readPage({ success: false, message: "Down" }, "x")).toThrow("Down");
  });
});

describe("cleanParams", () => {
  it("drops empty values and joins lists", () => {
    expect(
      cleanParams({
        status: "PENDING",
        overdue: false,
        date: "",
        userId: undefined,
        managerId: null,
        userIds: ["a", "b", ""],
        none: [],
        page: 1,
        flag: true,
      }),
    ).toEqual({ status: "PENDING", userIds: "a,b", page: 1, flag: true });
  });
});
