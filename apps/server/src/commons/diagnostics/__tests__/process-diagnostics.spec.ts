import {
  collectProcessDiagnostics,
  formatProcessDiagnostics,
} from '~/commons/diagnostics/process-diagnostics';

describe('process-diagnostics', () => {
  it('collectProcessDiagnostics returns expected shape', () => {
    const diagnostics = collectProcessDiagnostics();

    expect(diagnostics.timestamp).toEqual(expect.any(String));
    expect(diagnostics.pid).toEqual(process.pid);
    expect(diagnostics.processRssMb).toBeGreaterThan(0);
    expect(diagnostics.processHeapUsedMb).toBeGreaterThan(0);
    expect(diagnostics.containerTotalMemMb).toBeGreaterThan(0);
    expect(diagnostics.containerFreeMemMb).toBeGreaterThanOrEqual(0);
    expect(diagnostics.uptimeSec).toBeGreaterThanOrEqual(0);
    expect(
      diagnostics.tmpFreeMb === null ||
        typeof diagnostics.tmpFreeMb === 'number',
    ).toBe(true);
    expect(
      diagnostics.maxMapCount === null ||
        typeof diagnostics.maxMapCount === 'number',
    ).toBe(true);
    expect(
      diagnostics.processMapCount === null ||
        typeof diagnostics.processMapCount === 'number',
    ).toBe(true);
  });

  it('formatProcessDiagnostics returns JSON', () => {
    const formatted = formatProcessDiagnostics(collectProcessDiagnostics());
    expect(() => JSON.parse(formatted)).not.toThrow();
  });
});
