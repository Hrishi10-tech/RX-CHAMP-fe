/**
 * Runs `fn` at most once per `intervalMs`. A call inside the interval is not
 * lost: one trailing run happens when the interval ends, so the last change is
 * always picked up, however many arrived meanwhile.
 */
export interface Throttled {
  (): void;
  cancel(): void;
}

export function throttle(
  fn: () => void,
  intervalMs: number,
  clock: { now(): number } = Date,
): Throttled {
  let last = Number.NEGATIVE_INFINITY;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const run = () => {
    timer = null;
    last = clock.now();
    fn();
  };

  const throttled = (() => {
    const wait = last + intervalMs - clock.now();
    if (wait <= 0 && !timer) {
      run();
      return;
    }
    if (!timer) timer = setTimeout(run, Math.max(0, wait));
  }) as Throttled;

  throttled.cancel = () => {
    if (timer) clearTimeout(timer);
    timer = null;
  };

  return throttled;
}
