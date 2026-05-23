const IDLE_SCROLLS_BEFORE_END = 12;

export function shouldStopOnIdleScrolls(
  expectedTotal: number | null,
  seenSkuCount: number,
  idleScrolls: number,
): boolean {
  if (expectedTotal != null && seenSkuCount < expectedTotal) {
    return false;
  }
  return idleScrolls >= IDLE_SCROLLS_BEFORE_END;
}
