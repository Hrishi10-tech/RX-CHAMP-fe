import { act, renderHook, waitFor } from "@testing-library/react";

import { useLiveStatus } from "./useLiveStatus";
import { getUserCurrent } from "@/features/activity/api/getUserCurrent";
import { getMemberPresence } from "@/features/presence/api/getMemberPresence";

type Handler = (payload: unknown) => void;

function mockSocket() {
  const handlers = new Map<string, Set<Handler>>();
  return {
    connected: true,
    on: jest.fn((event: string, fn: Handler) => {
      if (!handlers.has(event)) handlers.set(event, new Set());
      handlers.get(event)!.add(fn);
    }),
    off: jest.fn((event: string, fn: Handler) => handlers.get(event)?.delete(fn)),
    emit(event: string, payload: unknown) {
      for (const fn of handlers.get(event) ?? []) fn(payload);
    },
  };
}

const mockActivitySocket = mockSocket();
const mockPresenceSocket = mockSocket();

jest.mock("@/features/activity/lib/socket", () => ({
  acquireActivitySocket: () => mockActivitySocket,
  releaseActivitySocket: jest.fn(),
}));
jest.mock("@/features/presence/lib/socket", () => ({
  acquirePresenceSocket: () => mockPresenceSocket,
  releasePresenceSocket: jest.fn(),
}));
jest.mock("@/features/activity/api/getUserCurrent", () => ({ getUserCurrent: jest.fn() }));
jest.mock("@/features/presence/api/getMemberPresence", () => ({ getMemberPresence: jest.fn() }));
jest.mock("@/store/hooks", () => ({ useAppSelector: () => "viewer" }));

const current = getUserCurrent as jest.Mock;
const presence = getMemberPresence as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  current.mockResolvedValue({ status: "ACTIVE", app: "Code.exe", title: null, url: null });
  presence.mockResolvedValue({ status: "WORKING" });
});

describe("useLiveStatus with part of the grants (4.0)", () => {
  it("seeds the app in use only with the timeline grant", async () => {
    renderHook(() => useLiveStatus("u1", { activity: true, current: true }));
    await waitFor(() => expect(current).toHaveBeenCalledWith("u1"));
  });

  it("never asks for the current app with the activity grant alone (it would be a 403)", async () => {
    const { result } = renderHook(() => useLiveStatus("u1", { activity: true, current: false }));
    await waitFor(() => expect(result.current.presence).toBe("WORKING"));
    expect(current).not.toHaveBeenCalled();
    // The live socket still brings the status, with the app left out.
    act(() =>
      mockActivitySocket.emit("activity:update", {
        userId: "u1",
        status: "IDLE",
        app: null,
        activeSec: 600,
      }),
    );
    expect(result.current.status).toBe("IDLE");
    expect(result.current.current?.app).toBeNull();
    expect(result.current.live.activeSec).toBe(600);
    act(() => mockActivitySocket.emit("connect", undefined));
    expect(current).not.toHaveBeenCalled();
  });

  it("reads presence only without a timeline or activity grant", async () => {
    const { result } = renderHook(() => useLiveStatus("u1", { activity: false }));
    await waitFor(() => expect(result.current.presence).toBe("WORKING"));
    expect(current).not.toHaveBeenCalled();
  });
});
