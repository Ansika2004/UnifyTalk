import { useEffect } from 'react'
import i18n from '../i18n'
import { useGlobalStore, selectLanguage } from '../store/globalStore'

/**
 * Side-effect component that keeps i18next in sync with the Zustand language
 * slice. Renders nothing.
 *
 * When `language` changes in the store, `i18n.changeLanguage` is called
 * synchronously, applying the new locale to all visible UI within 1 second
 * without a full page reload (Requirement 7.5).
 */
export default function I18nSync(): null {
  const language = useGlobalStore(selectLanguage)

  useEffect(() => {
    if (i18n.language !== language) {
      i18n.changeLanguage(language)
    }
  }, [language])

  return null
}
