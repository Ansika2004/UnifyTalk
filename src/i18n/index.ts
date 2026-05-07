import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

// Baseline English strings — additional translations are applied dynamically
// via translateContent (Google Translate / ML Kit) per Requirement 7.3
const resources = {
  en: {
    translation: {
      app_name: 'UnifyTalk Medical',
    },
  },
}

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'en',
    fallbackLng: 'en',
    interpolation: {
      // React already escapes values
      escapeValue: false,
    },
  })

export default i18n
