export function getMigrationPaths(): string[] {
  return [__dirname + '/migrations/*{.ts,.js}'];
}
