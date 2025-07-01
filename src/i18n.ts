import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import ja from './assets/locales/ja/translation.json';
import en from './assets/locales/en/translation.json';

const resources = {
  ja: { translation: ja },
  en: { translation: en },
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: navigator.language.startsWith('ja') ? 'ja' : 'en',
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n; 