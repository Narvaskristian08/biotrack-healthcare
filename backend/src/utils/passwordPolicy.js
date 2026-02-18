import { env } from '../config/env.js';

const UPPERCASE_REGEX = /[A-Z]/;
const LOWERCASE_REGEX = /[a-z]/;
const NUMBER_REGEX = /\d/;
const SYMBOL_REGEX = /[^A-Za-z0-9]/;

export function validatePasswordPolicy(rawPassword) {
  const password = String(rawPassword ?? '');
  const minLength = Math.max(8, Number(env.PASSWORD_MIN_LENGTH ?? 12) || 12);

  const failures = [];
  if (password.length < minLength) failures.push(`at least ${minLength} characters`);
  if (!UPPERCASE_REGEX.test(password)) failures.push('an uppercase letter');
  if (!LOWERCASE_REGEX.test(password)) failures.push('a lowercase letter');
  if (!NUMBER_REGEX.test(password)) failures.push('a number');
  if (!SYMBOL_REGEX.test(password)) failures.push('a symbol');

  if (!failures.length) return { ok: true, message: '' };
  return {
    ok: false,
    message: `Password must include ${failures.join(', ')}`,
  };
}

