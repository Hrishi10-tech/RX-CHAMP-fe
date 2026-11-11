import { pageList } from "./Pager";

describe("pageList", () => {
  it("lists every page when there are few", () => {
    expect(pageList(1, 1)).toEqual([1]);
    expect(pageList(2, 4)).toEqual([1, 2, 3, 4]);
  });

  it("keeps the first, last and neighbours, with gaps between", () => {
    expect(pageList(1, 12)).toEqual([1, 2, "…", 12]);
    expect(pageList(6, 12)).toEqual([1, "…", 5, 6, 7, "…", 12]);
    expect(pageList(12, 12)).toEqual([1, "…", 11, 12]);
  });

  it("fills a gap of one page with the page instead of an ellipsis", () => {
    expect(pageList(4, 12)).toEqual([1, 2, 3, 4, 5, "…", 12]);
  });
});
