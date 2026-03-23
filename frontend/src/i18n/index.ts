import { registerTranslations, t, setLanguage, getLanguage, getAvailableLanguages } from './i18n';
import de from './de.json';
import en from './en.json';
import es from './es.json';
import fr from './fr.json';
import ru from './ru.json';

registerTranslations('de', de);
registerTranslations('en', en);
registerTranslations('es', es);
registerTranslations('fr', fr);
registerTranslations('ru', ru);

export { t, setLanguage, getLanguage, getAvailableLanguages };
export { useLanguage } from './useLanguage';
