export function pathWithoutQueryAndTrailingSlash(asPath: string): string {
  let path = asPath.split("?")[0] ?? "";
  if (path.length > 1 && path.endsWith("/")) {
    path = path.slice(0, -1);
  }
  return path;
}
