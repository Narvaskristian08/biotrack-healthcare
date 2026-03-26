export function parseDurationMs(input) {
  if (!input) return 0;
  const s = String(input).trim().toLowerCase();
  const m = s.match(/^(\d+)\s*(ms|s|m|h|d)$/);
  if (!m) return 0;
  const n = Number(m[1]);
  const unit = m[2];
  if (!Number.isFinite(n)) return 0;
  switch (unit) {
    case 'ms':
      return n;
    case 's':
      return n * 1000;
    case 'm':
      return n * 60 * 1000;
    case 'h':
      return n * 60 * 60 * 1000;
    case 'd':
      return n * 24 * 60 * 60 * 1000;
    default:
      return 0;
  }
}

