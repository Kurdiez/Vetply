import * as fs from 'node:fs';
import * as os from 'node:os';

export type ProcessDiagnostics = {
  timestamp: string;
  pid: number;
  processRssMb: number;
  processHeapUsedMb: number;
  containerFreeMemMb: number;
  containerTotalMemMb: number;
  tmpFreeMb: number | null;
  maxMapCount: number | null;
  processMapCount: number | null;
  uptimeSec: number;
};

function readTmpFreeSpaceMb(): number | null {
  try {
    const stat = fs.statfsSync(os.tmpdir());
    return Math.round((stat.bfree * stat.bsize) / 1024 / 1024);
  } catch {
    return null;
  }
}

function readMaxMapCount(): number | null {
  try {
    const raw = fs.readFileSync('/proc/sys/vm/max_map_count', 'utf8').trim();
    const value = Number.parseInt(raw, 10);
    return Number.isFinite(value) ? value : null;
  } catch {
    return null;
  }
}

function readProcessMapCount(): number | null {
  try {
    return fs.readFileSync('/proc/self/maps', 'utf8').split('\n').length;
  } catch {
    return null;
  }
}

export function collectProcessDiagnostics(): ProcessDiagnostics {
  const mem = process.memoryUsage();
  return {
    timestamp: new Date().toISOString(),
    pid: process.pid,
    processRssMb: Math.round(mem.rss / 1024 / 1024),
    processHeapUsedMb: Math.round(mem.heapUsed / 1024 / 1024),
    containerFreeMemMb: Math.round(os.freemem() / 1024 / 1024),
    containerTotalMemMb: Math.round(os.totalmem() / 1024 / 1024),
    tmpFreeMb: readTmpFreeSpaceMb(),
    maxMapCount: readMaxMapCount(),
    processMapCount: readProcessMapCount(),
    uptimeSec: Math.round(process.uptime()),
  };
}

export function formatProcessDiagnostics(
  diagnostics: ProcessDiagnostics,
): string {
  return JSON.stringify(diagnostics);
}
