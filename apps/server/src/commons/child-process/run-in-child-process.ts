import { existsSync } from 'node:fs';
import { fork } from 'node:child_process';
import * as path from 'node:path';

export type ChildProcessResult<T> =
  | { type: 'success'; data: T }
  | {
      type: 'error';
      message: string;
      name: string;
      stack: string | undefined;
      context: Record<string, unknown> | undefined;
    };

export type RunInChildProcessOptions = {
  timeoutMs?: number;
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
  const { timeoutMs = 10 * 60_000 } = options;

  // In dev mode the .ts file is present; add ts-node + tsconfig-paths so
  // the worker can resolve TypeScript source and path aliases.
  const isTs = workerScriptPath.endsWith('.ts');
  const extraExecArgv = isTs
    ? ['-r', 'tsconfig-paths/register', '-r', 'ts-node/register']
    : [];

  return new Promise<TOutput>((resolve, reject) => {
    const child = fork(workerScriptPath, [], {
      execArgv: extraExecArgv,
      silent: false,
    });

    let settled = false;
    let timer: NodeJS.Timeout | null = null;

    const settle = (fn: () => void) => {
      if (settled) return;
      settled = true;
      if (timer !== null) clearTimeout(timer);
      fn();
    };

    timer = setTimeout(() => {
      settle(() => {
        child.kill('SIGKILL');
        reject(
          new Error(
            `Child process timed out after ${timeoutMs}ms and was killed`,
          ),
        );
      });
    }, timeoutMs);

    child.on('message', (msg: unknown) => {
      const result = msg as ChildProcessResult<TOutput>;
      if (result.type === 'success') {
        settle(() => resolve(result.data));
      } else if (result.type === 'error') {
        settle(() => {
          const err = new Error(result.message);
          err.name = result.name;
          if (result.stack) {
            err.stack = result.stack;
          }
          if (result.context) {
            (
              err as Error & { childContext: Record<string, unknown> }
            ).childContext = result.context;
          }
          reject(err);
        });
      }
    });

    child.on('error', (err) => {
      settle(() =>
        reject(new Error(`Child process spawn error: ${err.message}`)),
      );
    });

    child.on('exit', (code, signal) => {
      settle(() => {
        if (signal) {
          reject(new Error(`Child process killed by signal ${signal}`));
        } else {
          reject(
            new Error(
              `Child process exited with code ${code ?? 'null'} before sending result`,
            ),
          );
        }
      });
    });

    child.send({ type: 'run', input });
  });
}
