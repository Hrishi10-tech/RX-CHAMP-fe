import { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from "axios";

import { errorCode, errorDetails, errorMessage, errorStatus } from "./errorMessage";
import { shouldRetry } from "@/lib/query/QueryProvider";

function httpError(status: number, data: unknown): AxiosError {
  const config = { headers: {} } as InternalAxiosRequestConfig;
  const response = { status, data, statusText: "", headers: {}, config } as AxiosResponse;
  return new AxiosError("Request failed", "ERR_BAD_RESPONSE", config, null, response);
}

const conflict = httpError(409, {
  success: false,
  message: "This shift is still assigned (1 department or staff assignment). Move them first.",
  error: { code: "SHIFT_IN_USE", message: "…", details: { problems: ["a"] } },
});

describe("API error helpers", () => {
  it("reads the server's message, code and details", () => {
    expect(errorMessage(conflict)).toMatch(/still assigned/);
    expect(errorCode(conflict)).toBe("SHIFT_IN_USE");
    expect(errorDetails(conflict)).toEqual({ problems: ["a"] });
    expect(errorStatus(conflict)).toBe(409);
  });

  it("copes with bodies that are not the API's shape", () => {
    const html = httpError(502, "<html>Bad gateway</html>");
    expect(errorMessage(html)).toBeUndefined();
    expect(errorCode(html)).toBeUndefined();
    expect(errorDetails(html)).toBeUndefined();
  });

  it("uses a plain Error's message", () => {
    expect(errorMessage(new Error("Failed to create member"))).toBe("Failed to create member");
    expect(errorCode(new Error("x"))).toBeUndefined();
    expect(errorStatus(new Error("x"))).toBeUndefined();
  });
});

describe("shouldRetry", () => {
  it("retries network and server failures, twice at most", () => {
    expect(shouldRetry(0, new Error("Network Error"))).toBe(true);
    expect(shouldRetry(0, httpError(503, {}))).toBe(true);
    expect(shouldRetry(2, httpError(503, {}))).toBe(false);
  });

  it("never retries a request the server refused", () => {
    expect(shouldRetry(0, httpError(400, {}))).toBe(false);
    expect(shouldRetry(0, httpError(403, {}))).toBe(false);
    expect(shouldRetry(0, conflict)).toBe(false);
  });
});
