import { useState, useEffect } from "preact/hooks";
import { getLanguage } from "./i18n";

export function useLanguage(): string {
  const [lang, setLang] = useState(getLanguage());
  useEffect(() => {
    const handler = () => setLang(getLanguage());
    window.addEventListener('languagechange', handler);
    return () => window.removeEventListener('languagechange', handler);
  }, []);
  return lang;
}
