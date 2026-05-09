export const VETPLY_ACCESS_TOKEN_KEY = 'vetply_access_token';

export function clearStoredAccessToken(): void {
  if (typeof window === 'undefined') {
    return;
  }
  localStorage.removeItem(VETPLY_ACCESS_TOKEN_KEY);
}
