import i18n, {Resource} from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import en from './lang/en.json';
import zhCN from './lang/zhCN.json';

export const resources: Resource = {
  en: {
    translation: en,
  },
  zh: {
    translation: zhCN,
  },
};

i18n
  .use(initReactI18next)
  .use(LanguageDetector)
  .init({
    fallbackLng: 'en',
    lng: 'zh',
    interpolation: {
      escapeValue: false,
    },
    resources,
  }).then();

console.log('i18n:', i18n);

export default i18n;
