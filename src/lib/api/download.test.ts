import { BLOB_URL_LIFETIME_MS, filenameFromDisposition, saveBlob } from "./download";

jest.mock("./client", () => ({ apiClient: { get: jest.fn() } }));

describe("saveBlob", () => {
  const created = "blob:http://localhost/1234";
  let createObjectURL: jest.Mock;
  let revokeObjectURL: jest.Mock;
  let click: jest.SpyInstance;

  beforeEach(() => {
    jest.useFakeTimers();
    createObjectURL = jest.fn(() => created);
    revokeObjectURL = jest.fn();
    Object.assign(URL, { createObjectURL, revokeObjectURL });
    click = jest.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);
  });

  afterEach(() => {
    click.mockRestore();
    jest.useRealTimers();
  });

  it("keeps the file's URL alive long enough for a slow browser to read it", () => {
    saveBlob(new Blob(["x"]), "september.xlsx");
    expect(click).toHaveBeenCalledTimes(1);
    expect(document.querySelector("a[download]")).toBeNull();

    jest.advanceTimersByTime(30_000);
    expect(revokeObjectURL).not.toHaveBeenCalled();

    jest.advanceTimersByTime(BLOB_URL_LIFETIME_MS - 30_000);
    expect(revokeObjectURL).toHaveBeenCalledWith(created);
  });
});

describe("filenameFromDisposition", () => {
  it("reads a quoted file name", () => {
    expect(
      filenameFromDisposition('attachment; filename="rx-vision-2026-09-team.xlsx"', "report.xlsx"),
    ).toBe("rx-vision-2026-09-team.xlsx");
  });

  it("reads an unquoted file name", () => {
    expect(filenameFromDisposition("attachment; filename=payroll.xlsx", "report.xlsx")).toBe(
      "payroll.xlsx",
    );
  });

  it("prefers the encoded filename*", () => {
    expect(
      filenameFromDisposition(
        "attachment; filename=\"plain.xlsx\"; filename*=UTF-8''rx%20vision%20Sept.xlsx",
        "report.xlsx",
      ),
    ).toBe("rx vision Sept.xlsx");
  });

  it("strips any path from the name", () => {
    expect(filenameFromDisposition('attachment; filename="../../etc/x.xlsx"', "r.xlsx")).toBe(
      "x.xlsx",
    );
    expect(filenameFromDisposition('attachment; filename="C:\\temp\\y.xlsx"', "r.xlsx")).toBe(
      "y.xlsx",
    );
  });

  it("falls back when there is no usable name", () => {
    expect(filenameFromDisposition(undefined, "r.xlsx")).toBe("r.xlsx");
    expect(filenameFromDisposition("attachment", "r.xlsx")).toBe("r.xlsx");
    expect(filenameFromDisposition('attachment; filename=".."', "r.xlsx")).toBe("r.xlsx");
    expect(filenameFromDisposition("attachment; filename*=UTF-8''%E0%A4%A", "r.xlsx")).toBe(
      "r.xlsx",
    );
  });
});
