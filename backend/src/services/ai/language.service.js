const SUPPORTED_AI_LANGUAGES = new Set(['en', 'fil']);

export function normalizeAiLanguage(value, fallback = 'en') {
  const normalized = String(value ?? '')
    .trim()
    .toLowerCase();
  if (SUPPORTED_AI_LANGUAGES.has(normalized)) return normalized;
  return fallback;
}

export function aiLanguageLabel(language) {
  return normalizeAiLanguage(language) === 'fil' ? 'Filipino' : 'English';
}

