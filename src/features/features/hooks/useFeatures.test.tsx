import type { ReactNode } from "react";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { getFeatures } from "@/features/features/api/features";

import { useFeature, useFeatures } from "./useFeatures";

jest.mock("@/features/features/api/features", () => ({ getFeatures: jest.fn() }));

const read = getFeatures as jest.Mock;

function wrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  }
  return Wrapper;
}

describe("useFeature (3.6)", () => {
  beforeEach(() => read.mockReset());

  it("is off until the flags have loaded, then says what the API says", async () => {
    let answer: (flags: unknown) => void = () => undefined;
    read.mockReturnValue(new Promise((resolve) => (answer = resolve)));
    const { result } = renderHook(() => [useFeature("messaging"), useFeature("aiChat")], {
      wrapper: wrapper(),
    });
    expect(result.current).toEqual([false, false]);
    answer({ messaging: true, aiChat: false });
    await waitFor(() => expect(result.current).toEqual([true, false]));
  });

  it("stays off when the flags cannot be read", async () => {
    read.mockRejectedValue(new Error("down"));
    const { result } = renderHook(() => useFeature("messaging"), { wrapper: wrapper() });
    await waitFor(() => expect(read).toHaveBeenCalled());
    expect(result.current).toBe(false);
  });

  it("reads the flags once for every screen that asks", async () => {
    read.mockResolvedValue({ messaging: true });
    const { result } = renderHook(
      () => {
        useFeatures();
        useFeature("messaging");
        return useFeature("mobilePush");
      },
      { wrapper: wrapper() },
    );
    await waitFor(() => expect(read).toHaveBeenCalledTimes(1));
    expect(result.current).toBe(false);
  });
});
