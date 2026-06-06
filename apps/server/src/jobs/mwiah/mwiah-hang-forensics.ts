import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { monitorEventLoopDelay } from 'node:perf_hooks';
import type { IntervalHistogram } from 'node:perf_hooks';

import type { Logger } from '@nestjs/common';
import type { Page } from 'playwright';

const CDP_PROBE_TIMEOUT_MS = 5_000;
const SCREENSHOT_TIMEOUT_MS = 8_000;
const HTML_CAPTURE_TIMEOUT_MS = 5_000;

// No new tracer step for this long → watchdog fires forensics.
// Max legitimate single-step duration is ~90s API wait × 3 retries ≈ 4.5 min.
const WATCHDOG_STALL_THRESHOLD_MS = 5 * 60_000;
const WATCHDOG_CHECK_INTERVAL_MS = 15_000;

export type MwiahHangForensics = {
  timestamp: string;
  jobId: string | null;
  categoryUrl: string | null;
  lastStep: string;
  msSinceLastStep: number;
  processPid: number;
  processRssMb: number;
  processHeapUsedMb: number;
  // null when event loop was blocked long enough that the monitor itself failed
  eventLoopDelayMeanMs: number | null;
  eventLoopDelayMaxMs: number | null;
  // null when no page was registered with setPage() yet
  browserConnected: boolean | null;
  cdpProbeResult: 'ok' | 'timeout' | 'error' | 'no_page';
  cdpProbeMs: number | null;
  cdpProbeError: string | null;
  pageUrl: string | null;
  screenshotPath: string | null;
  htmlPath: string | null;
};

export type MwiahJobWatchdog = {
  /** Call on every tracer step so the watchdog knows progress is happening. */
  notifyStep: (name: string) => void;
  /** Register the live Playwright page so forensics can probe it. */
  setPage: (page: Page) => void;
  /** Stop the watchdog interval. Must be called in a finally block. */
  dispose: () => void;
};

async function withTimeout<T>(
  fn: () => Promise<T>,
  ms: number,
): Promise<
  | { value: T; elapsedMs: number; error: null }
  | { value: null; elapsedMs: number; error: string }
> {
  const start = Date.now();
  try {
    const value = await Promise.race([
      fn(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('probe_timeout')), ms),
      ),
    ]);
    return { value, elapsedMs: Date.now() - start, error: null };
  } catch (err) {
    return { value: null, elapsedMs: Date.now() - start, error: String(err) };
  }
}

async function collectForensics(params: {
  jobId: string | null;
  categoryUrl: string | null;
  lastStep: string;
  msSinceLastStep: number;
  page: Page | null;
  monitor: IntervalHistogram;
}): Promise<MwiahHangForensics> {
  const { jobId, categoryUrl, lastStep, msSinceLastStep, page, monitor } =
    params;

  const mem = process.memoryUsage();
  monitor.disable();

  const eventLoopDelayMeanMs =
    monitor.mean > 0 ? Math.round((monitor.mean / 1e6) * 100) / 100 : 0;
  const eventLoopDelayMaxMs =
    monitor.max > 0 ? Math.round((monitor.max / 1e6) * 100) / 100 : 0;

  let browserConnected: boolean | null = null;
  let cdpProbeResult: MwiahHangForensics['cdpProbeResult'] = 'no_page';
  let cdpProbeMs: number | null = null;
  let cdpProbeError: string | null = null;
  let pageUrl: string | null = null;
  let screenshotPath: string | null = null;
  let htmlPath: string | null = null;

  if (page) {
    try {
      browserConnected = page.context().browser()?.isConnected() ?? null;
    } catch {
      browserConnected = null;
    }

    try {
      pageUrl = page.url();
    } catch {
      // ignore
    }

    const cdpProbe = await withTimeout(
      () => page.evaluate(() => 1 as const),
      CDP_PROBE_TIMEOUT_MS,
    );
    cdpProbeMs = cdpProbe.elapsedMs;
    if (cdpProbe.error === null) {
      cdpProbeResult = 'ok';
    } else if (cdpProbe.error.includes('probe_timeout')) {
      cdpProbeResult = 'timeout';
      cdpProbeError = cdpProbe.error;
    } else {
      cdpProbeResult = 'error';
      cdpProbeError = cdpProbe.error;
    }

    try {
      const dir = await fs.mkdtemp(
        path.join(os.tmpdir(), 'vetply-mwiah-hang-'),
      );
      const label = `${jobId ?? 'unknown'}-${lastStep}`
        .replace(/[^a-zA-Z0-9._-]+/g, '_')
        .slice(0, 80);

      const ssPath = path.join(dir, `${label}.png`);
      const ssResult = await withTimeout(
        () => page.screenshot({ path: ssPath, fullPage: false }),
        SCREENSHOT_TIMEOUT_MS,
      );
      if (ssResult.error === null) {
        screenshotPath = ssPath;
      }

      const hPath = path.join(dir, `${label}.html`);
      const htmlResult = await withTimeout(
        () => page.content(),
        HTML_CAPTURE_TIMEOUT_MS,
      );
      if (htmlResult.error === null && htmlResult.value) {
        await fs.writeFile(hPath, htmlResult.value.slice(0, 12_000), 'utf8');
        htmlPath = hPath;
      }
    } catch {
      // ignore artifact failures
    }
  }

  return {
    timestamp: new Date().toISOString(),
    jobId,
    categoryUrl,
    lastStep,
    msSinceLastStep,
    processPid: process.pid,
    processRssMb: Math.round(mem.rss / 1024 / 1024),
    processHeapUsedMb: Math.round(mem.heapUsed / 1024 / 1024),
    eventLoopDelayMeanMs,
    eventLoopDelayMaxMs,
    browserConnected,
    cdpProbeResult,
    cdpProbeMs,
    cdpProbeError,
    pageUrl,
    screenshotPath,
    htmlPath,
  };
}

export function createMwiahJobWatchdog(params: {
  jobId: string | null;
  categoryUrl: string | null;
  logger: Logger;
}): MwiahJobWatchdog {
  const { jobId, categoryUrl, logger } = params;

  const monitor = monitorEventLoopDelay({ resolution: 20 });
  monitor.enable();

  let lastStep = 'job_start';
  let lastStepAt = Date.now();
  let page: Page | null = null;
  let fired = false;
  let disposed = false;

  const interval = setInterval(() => {
    if (disposed || fired) return;
    const msSinceLastStep = Date.now() - lastStepAt;
    if (msSinceLastStep < WATCHDOG_STALL_THRESHOLD_MS) return;

    fired = true;
    logger.warn(
      `MWIAH hang watchdog fired jobId=${jobId} lastStep=${lastStep} msSinceLastStep=${msSinceLastStep}`,
    );

    void collectForensics({
      jobId,
      categoryUrl,
      lastStep,
      msSinceLastStep,
      page,
      monitor,
    }).then((forensics) => {
      logger.error(
        `MWIAH hang forensics jobId=${jobId} ${JSON.stringify(forensics)}`,
      );
    });
  }, WATCHDOG_CHECK_INTERVAL_MS);

  return {
    notifyStep(name) {
      lastStep = name;
      lastStepAt = Date.now();
    },
    setPage(p) {
      page = p;
    },
    dispose() {
      disposed = true;
      clearInterval(interval);
      if (!fired) {
        monitor.disable();
      }
    },
  };
}
