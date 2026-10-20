import { throttle } from "./throttle";

/** SPEC 7.5: a presence change refetches the dashboard at most every 15 seconds. */
describe("throttle", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it("runs at once, then at most once per interval with one trailing run", () => {
    const fn = jest.fn();
    const run = throttle(fn, 15_000);
    run();
    expect(fn).toHaveBeenCalledTimes(1);
    run();
    run();
    run();
    expect(fn).toHaveBeenCalledTimes(1);
    jest.advanceTimersByTime(14_999);
    expect(fn).toHaveBeenCalledTimes(1);
    jest.advanceTimersByTime(1);
    expect(fn).toHaveBeenCalledTimes(2);
    jest.advanceTimersByTime(60_000);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("runs straight away again once the interval has passed", () => {
    const fn = jest.fn();
    const run = throttle(fn, 15_000);
    run();
    jest.advanceTimersByTime(20_000);
    run();
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("can be cancelled when the page goes away", () => {
    const fn = jest.fn();
    const run = throttle(fn, 15_000);
    run();
    run();
    run.cancel();
    jest.advanceTimersByTime(30_000);
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
