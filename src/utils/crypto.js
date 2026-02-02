import crypto from 'crypto';

export function sha256Hex(input) {
  return crypto.createHash('sha256').update(input).digest('hex');
}

export function canonicalJsonStringify(obj) {
  if (obj === null || obj === undefined) return JSON.stringify(obj);
  if (Array.isArray(obj)) return `[${obj.map(canonicalJsonStringify).join(',')}]`;
  if (typeof obj === 'object') {
    const keys = Object.keys(obj).sort();
    return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalJsonStringify(obj[k])}`).join(',')}}`;
  }
  return JSON.stringify(obj);
}

