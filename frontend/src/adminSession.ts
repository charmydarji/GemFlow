// Prototype-only: tab-scoped access token; no cross-site cookies or third-party cookie setup.
const storageKey = 'gemflow.admin.session';

export function getAdminToken(): string | null {
  try { return window.sessionStorage.getItem(storageKey); } catch { return null; }
}
export function setAdminToken(value: string): void {
  window.sessionStorage.setItem(storageKey, value);
}
export function clearAdminToken(): void {
  try { window.sessionStorage.removeItem(storageKey); } catch { /* no-op */ }
}
export function adminHeaders(mutation = false): Record<string, string> {
  const token = getAdminToken();
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(mutation ? { 'X-GemFlow-Admin': '1' } : {}),
  };
}
