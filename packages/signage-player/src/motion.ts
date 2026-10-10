// Every phase is derived from the shared clock, including delayed text reveals.
export function reveal(progress: number, start = 0, end = 1) {
  const t = Math.max(0, Math.min(1, (progress - start) / (end - start)));
  return 1 - (1 - t) ** 3;
}

export function transitionAt(progress: number) {
  const t = Math.max(0, Math.min(1, progress));
  return {
    focus: t * t * t * (t * (t * 6 - 15) + 10),
    outgoing: 1 - reveal(t, 0, 0.28),
    heading: reveal(t, 0.28, 0.78),
    image: reveal(t, 0.1, 1),
    footer: reveal(t, 0.56, 1),
    page: reveal(t, 0.28, 1),
  };
}

export function selectorAt(previous: number, current: number, progress: number, wrap: boolean) {
  const motion = transitionAt(progress);
  if (!wrap) return { position: previous + (current - previous) * motion.focus, opacity: 1 };
  return progress < 0.5
    ? { position: previous, opacity: motion.outgoing }
    : { position: current, opacity: reveal(progress, 0.5, 1) };
}

export function arrowOffsetAt(elapsedMilliseconds: number) {
  return 5 * Math.sin((elapsedMilliseconds % 3200) / 3200 * Math.PI * 2);
}
