export function uniqueId(prefix = 'id'): string {
  const now = Date.now();
  const rand = Math.floor(Math.random() * 1_000_000);
  return `${prefix}-${now}-${rand}`;
}

export function buildEmail(prefix: string, domain = 'gmail.com'): string {
  const safePrefix = prefix.replace(/[^a-zA-Z0-9._+-]/g, '').toLowerCase();
  return `${safePrefix}@${domain}`;
}

export const STRONG_PASSWORD = 'StrongPass!12345';
