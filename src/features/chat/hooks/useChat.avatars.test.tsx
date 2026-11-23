import { act, renderHook, waitFor } from "@testing-library/react";

import { getThreads } from "@/features/chat/api/getThreads";
import { acquireChatSocket } from "@/features/chat/socket";

import { useChat } from "./useChat";

jest.mock("sonner", () => ({ toast: { error: jest.fn() } }));
const mockDispatch = jest.fn();
jest.mock("@/store/hooks", () => ({ useAppDispatch: () => mockDispatch }));
jest.mock("@/features/chat/api/getThreads", () => ({ getThreads: jest.fn() }));
jest.mock("@/features/chat/api/getMessages", () => ({
  getMessages: jest.fn().mockResolvedValue([]),
}));
jest.mock("@/features/chat/api/sendMessage", () => ({ sendMessage: jest.fn() }));
jest.mock("@/features/chat/socket", () => ({
  acquireChatSocket: jest.fn(),
  releaseChatSocket: jest.fn(),
}));

const contact = (avatarId: string) => ({
  userId: "u-1",
  name: "Arjun Mehta",
  email: "arjun@x.test",
  role: "MANAGER",
  avatarId,
});

function fakeSocket() {
  const reconnects: (() => void)[] = [];
  return {
    on: jest.fn(),
    off: jest.fn(),
    io: {
      on: (_event: string, listener: () => void) => reconnects.push(listener),
      off: jest.fn(),
    },
    reconnect: () => reconnects.forEach((listener) => listener()),
  };
}

describe("Messages after a socket reconnect", () => {
  let socket: ReturnType<typeof fakeSocket>;

  beforeEach(() => {
    jest.clearAllMocks();
    socket = fakeSocket();
    (acquireChatSocket as jest.Mock).mockReturnValue(socket);
    (getThreads as jest.Mock).mockResolvedValue([contact("M12")]);
  });

  const open = async () => {
    const { result } = renderHook(() => useChat({ enabled: true }));
    await waitFor(() => expect(result.current.contacts).toHaveLength(1));
    return result;
  };

  it("reads the contacts again: an avatar may have changed meanwhile", async () => {
    const result = await open();
    expect(result.current.contacts[0].avatarId).toBe("M12");
    (getThreads as jest.Mock).mockResolvedValue([contact("M40")]);
    act(() => socket.reconnect());
    await waitFor(() => expect(result.current.contacts[0].avatarId).toBe("M40"));
  });

  it("keeps the list on screen when that read fails", async () => {
    const result = await open();
    (getThreads as jest.Mock).mockRejectedValue(new Error("Down"));
    await act(async () => {
      socket.reconnect();
    });
    expect(getThreads).toHaveBeenCalledTimes(2);
    expect(result.current.contacts[0].avatarId).toBe("M12");
  });

  it("a flapping socket does not read them over and over", async () => {
    await open();
    await act(async () => {
      socket.reconnect();
      socket.reconnect();
      socket.reconnect();
    });
    expect(getThreads).toHaveBeenCalledTimes(2);
  });
});
