/**
 * Runs batch tasks in waves of `concurrency` parallel calls (stable batch index order).
 */
export async function runPoolMapBatches<TItem, TResult>(
  batches: TItem[][],
  concurrency: number,
  mapper: (batch: TItem[], batchIndex: number) => Promise<TResult>,
): Promise<TResult[]> {
  const results: TResult[] = new Array(batches.length);
  const limit = Math.max(1, concurrency);
  for (let i = 0; i < batches.length; i += limit) {
    const wave = batches.slice(i, i + limit);
    const waveResults = await Promise.all(
      wave.map((batch, j) => mapper(batch, i + j)),
    );
    for (let j = 0; j < waveResults.length; j += 1) {
      results[i + j] = waveResults[j];
    }
  }
  return results;
}

export function chunkArray<T>(items: T[], size: number): T[][] {
  if (size <= 0) {
    throw new Error('chunk size must be positive');
  }
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
}
