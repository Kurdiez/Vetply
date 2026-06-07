import { existsSync } from 'node:fs';
import { fork } from 'node:child_process';
import * as path from 'node:path';

import {
  collectProcessDiagnostics,
  formatProcessDiagnostics,
} from '~/commons/diagnostics/process-diagnostics';

export type ChildProcessResult<T> =
  | { type: 'success'; data: T }
  | {
      type: 'error';
      message: string;
      name: string;
      stack: string | undefined;
      context: Record<string, unknown> | undefined;
      lastStep?: string;
    };

export type RunInChildProcessOptions = {
  timeoutMs?: number;
  label?: string;
};

/**
 * Resolves the worker script for both dev (ts-node, .ts exists) and prod
 * (compiled, .ts absent → use .js) environments.
 */
export function resolveWorkerScriptPath(
  callerDirname: string,
  relativePathWithoutExt: string,
): string {
  const tsPath = path.resolve(callerDirname, relativePathWithoutExt + '.ts');
  if (existsSync(tsPath)) {
    return tsPath;
  }
  return path.resolve(callerDirname, relativePathWithoutExt + '.js');
}

export async function runInChildProcess<TInput, TOutput>(
  workerScriptPath: string,
  input: TInput,
  options: RunInChildProcessOptions = {},
): Promise<TOutput> {
  const { timeoutMs = 10 * 60_000, label = 'child-process' } = options;
  const startedAt = Date.now();

  // In dev mode the .ts file is present; add ts-node + tsconfig-paths so
  // the worker can resolve TypeScript source and path aliases.
  const isTs = workerScriptPath.endsWith('.ts');
  const extraExecArgv = isTs
    ? ['-r', 'tsconfig-paths/register', '-r', 'ts-node/register']
    : [];

  console.log(
    `${label} parent_spawn diagnostics=${formatProcessDiagnostics(collectProcessDiagnostics())}`,
  );

  return new Promise<TOutput>((resolve, reject) => {
    const child = fork(workerScriptPath, [], {
      execArgv: extraExecArgv,
      silent: false,
    });

    let settled = false;
    let timer: NodeJS.Timeout | null = null;
    const childPid: number | null = child.pid ?? null;

    const settle = (fn: () => void) => {
      if (settled) return;
      settled = true;
      if (timer !== null) clearTimeout(timer);
      fn();
    };

    console.log(
      `${label} spawned childPid=${childPid ?? 'unknown'} script=${workerScriptPath}`,
    );

    timer = setTimeout(() => {
      settle(() => {
        const elapsedMs = Date.now() - startedAt;
        console.error(
          `${label} timeout after ${timeoutMs}ms elapsedMs=${elapsedMs} childPid=${childPid ?? 'unknown'} parentDiagnostics=${formatProcessDiagnostics(collectProcessDiagnostics())}`,
        );
        child.kill('SIGKILL');
        reject(
          new Error(
            `Child process timed out after ${timeoutMs}ms and was killed (childPid=${childPid ?? 'unknown'})`,
          ),
        );
      });
    }, timeoutMs);

    child.on('message', (msg: unknown) => {
      const result = msg as ChildProcessResult<TOutput>;
      if (result.type === 'success') {
        settle(() => {
          console.log(
            `${label} success childPid=${childPid ?? 'unknown'} elapsedMs=${Date.now() - startedAt}`,
          );
          resolve(result.data);
        });
      } else if (result.type === 'error') {
        settle(() => {
          const err = new Error(result.message);
          err.name = result.name;
          if (result.stack) {
            err.stack = result.stack;
          }
          const childContext: Record<string, unknown> = {
            ...(result.context ?? {}),
            childPid,
            elapsedMs: Date.now() - startedAt,
          };
          if (result.lastStep) {
            childContext.lastStep = result.lastStep;
          }
          (
            err as Error & { childContext: Record<string, unknown> }
          ).childContext = childContext;
          console.error(
            `${label} child error childPid=${childPid ?? 'unknown'} lastStep=${result.lastStep ?? 'unknown'} context=${JSON.stringify(childContext)}`,
          );
          reject(err);
        });
      }
    });

    child.on('error', (err) => {
      settle(() => {
        console.error(
          `${label} spawn error childPid=${childPid ?? 'unknown'} error=${err.message} parentDiagnostics=${formatProcessDiagnostics(collectProcessDiagnostics())}`,
        );
        reject(new Error(`Child process spawn error: ${err.message}`));
      });
    });

    child.on('exit', (code, signal) => {
      if (settled) return;
      settle(() => {
        const elapsedMs = Date.now() - startedAt;
        console.error(
          `${label} unexpected exit childPid=${childPid ?? 'unknown'} code=${code ?? 'null'} signal=${signal ?? 'null'} elapsedMs=${elapsedMs} parentDiagnostics=${formatProcessDiagnostics(collectProcessDiagnostics())}`,
        );
        if (signal) {
          reject(
            new Error(
              `Child process killed by signal ${signal} (childPid=${childPid ?? 'unknown'})`,
            ),
          );
        } else {
          reject(
            new Error(
              `Child process exited with code ${code ?? 'null'} before sending result (childPid=${childPid ?? 'unknown'})`,
            ),
          );
        }
      });
    });

    child.send({ type: 'run', input });
  });
}
