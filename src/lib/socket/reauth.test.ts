import type { Socket } from "socket.io-client";

import { attachSocketReauth } from "@/lib/socket/reauth";
import { clearSocketTicket } from "@/lib/socket/ticket";

jest.mock("@/lib/socket/ticket", () => ({ clearSocketTicket: jest.fn() }));

type Handler = (...args: unknown[]) => void;

interface FakeSocket {
  connected: boolean;
  on(event: string, handler: Handler): FakeSocket;
  connect: jest.Mock;
}

/** The few parts of a socket.io client socket the helper touches. */
function fakeSocket() {
  const handlers = new Map<string, Handler[]>();
  const raw: FakeSocket = {
    connected: false,
    on(event, handler) {
      handlers.set(event, [...(handlers.get(event) ?? []), handler]);
      return raw;
    },
    connect: jest.fn(),
  };
  const fire = (event: string, ...args: unknown[]) =>
    (handlers.get(event) ?? []).forEach((handler) => handler(...args));
  return { socket: raw as unknown as Socket, raw, fire };
}

/** What the server does to a socket it refuses: answer, say why, close. */
function refuse(s: ReturnType<typeof fakeSocket>) {
  s.raw.connected = true;
  s.fire("connect");
  s.fire("unauthorized", { message: "Sign in again." });
  s.raw.connected = false;
  s.fire("disconnect", "io server disconnect");
}

describe("attachSocketReauth", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.mocked(clearSocketTicket).mockClear();
  });
  afterEach(() => jest.useRealTimers());

  it("comes back with a fresh ticket after the server refuses the handshake", () => {
    const s = fakeSocket();
    attachSocketReauth(s.socket);

    refuse(s);
    expect(s.raw.connect).not.toHaveBeenCalled();

    jest.advanceTimersByTime(1_000);
    expect(clearSocketTicket).toHaveBeenCalledTimes(1);
    expect(s.raw.connect).toHaveBeenCalledTimes(1);
  });

  it("comes back after the server ends an open socket without saying why", () => {
    const s = fakeSocket();
    attachSocketReauth(s.socket);

    s.raw.connected = true;
    s.fire("connect");
    jest.advanceTimersByTime(60_000);
    s.raw.connected = false;
    s.fire("disconnect", "io server disconnect");

    jest.advanceTimersByTime(1_000);
    expect(clearSocketTicket).toHaveBeenCalledTimes(1);
    expect(s.raw.connect).toHaveBeenCalledTimes(1);
  });

  it("gives up after three refusals in a row, each one slower than the last", () => {
    const s = fakeSocket();
    attachSocketReauth(s.socket);

    refuse(s);
    jest.advanceTimersByTime(1_000);
    expect(s.raw.connect).toHaveBeenCalledTimes(1);

    refuse(s);
    jest.advanceTimersByTime(4_999);
    expect(s.raw.connect).toHaveBeenCalledTimes(1);
    jest.advanceTimersByTime(1);
    expect(s.raw.connect).toHaveBeenCalledTimes(2);

    refuse(s);
    jest.advanceTimersByTime(15_000);
    expect(s.raw.connect).toHaveBeenCalledTimes(3);

    refuse(s);
    jest.advanceTimersByTime(600_000);
    expect(s.raw.connect).toHaveBeenCalledTimes(3);
  });

  it("starts counting again once a socket has stayed connected", () => {
    const s = fakeSocket();
    attachSocketReauth(s.socket);

    refuse(s);
    jest.advanceTimersByTime(1_000);
    refuse(s);
    jest.advanceTimersByTime(5_000);
    expect(s.raw.connect).toHaveBeenCalledTimes(2);

    // This time the ticket is good and the socket stays up.
    s.raw.connected = true;
    s.fire("connect");
    jest.advanceTimersByTime(10_000);

    // A later end by the server gets the short first wait again.
    s.raw.connected = false;
    s.fire("disconnect", "io server disconnect");
    jest.advanceTimersByTime(1_000);
    expect(s.raw.connect).toHaveBeenCalledTimes(3);
  });

  it("does not count a connect that is refused straight away as success", () => {
    const s = fakeSocket();
    attachSocketReauth(s.socket);

    for (let round = 0; round < 6; round += 1) {
      refuse(s);
      jest.advanceTimersByTime(20_000);
    }
    expect(s.raw.connect).toHaveBeenCalledTimes(3);
  });

  it("leaves a network drop to socket.io", () => {
    const s = fakeSocket();
    attachSocketReauth(s.socket);

    s.raw.connected = true;
    s.fire("connect");
    s.raw.connected = false;
    s.fire("disconnect", "transport close");

    jest.advanceTimersByTime(60_000);
    expect(s.raw.connect).not.toHaveBeenCalled();
    expect(clearSocketTicket).not.toHaveBeenCalled();
  });

  it("drops a pending retry when the page itself closes the socket", () => {
    const s = fakeSocket();
    attachSocketReauth(s.socket);

    refuse(s);
    s.fire("disconnect", "io client disconnect");

    jest.advanceTimersByTime(60_000);
    expect(s.raw.connect).not.toHaveBeenCalled();
  });

  it("does not connect twice when the socket is already back", () => {
    const s = fakeSocket();
    attachSocketReauth(s.socket);

    refuse(s);
    s.raw.connected = true;
    jest.advanceTimersByTime(1_000);

    expect(clearSocketTicket).toHaveBeenCalledTimes(1);
    expect(s.raw.connect).not.toHaveBeenCalled();
  });
});
