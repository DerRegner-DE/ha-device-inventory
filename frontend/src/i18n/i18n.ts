type Translations = Record<string, string>;
const translations: Record<string, Translations> = {};
let currentLang = localStorage.getItem('gv_language') || 'de';

export function setLanguage(lang: string) {
  currentLang = lang;
  localStorage.setItem('gv_language', lang);
  window.dispatchEvent(new CustomEvent('languagechange'));
}

export function getLanguage(): string {
  return currentLang;
}

export function getAvailableLanguages() {
  return [
    { code: 'de', name: 'Deutsch', flag: '\u{1F1E9}\u{1F1EA}' },
    { code: 'en', name: 'English', flag: '\u{1F1EC}\u{1F1E7}' },
    { code: 'es', name: 'Espa\u00f1ol', flag: '\u{1F1EA}\u{1F1F8}' },
    { code: 'fr', name: 'Fran\u00e7ais', flag: '\u{1F1EB}\u{1F1F7}' },
    { code: 'ru', name: '\u0420\u0443\u0441\u0441\u043a\u0438\u0439', flag: '\u{1F1F7}\u{1F1FA}' },
  ];
}

export function registerTranslations(lang: string, t: Translations) {
  translations[lang] = { ...translations[lang], ...t };
}

export function t(key: string, params?: Record<string, string | number>): string {
  const value = translations[currentLang]?.[key] || translations['en']?.[key] || translations['de']?.[key] || key;
  if (!params) return value;
  return Object.entries(params).reduce((s, [k, v]) => s.replace(`{${k}}`, String(v)), value);
}
