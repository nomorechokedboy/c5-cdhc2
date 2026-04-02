import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import defaultStrings from './vi.json'

// Initialise with built-in Vietnamese defaults only.
// The remote app-level pack is fetched by useLangPack() at runtime and
// applied via applyAppLangPack() below — no localStorage involved.
i18n.use(initReactI18next).init({
	lng: 'vi',
	fallbackLng: 'vi',
	resources: {
		vi: { translation: defaultStrings }
	},
	interpolation: {
		escapeValue: false
	}
})

/**
 * Apply a server-side language pack to i18next.
 * Called by useLangPack() once the API response arrives.
 * Keys missing from the pack automatically fall back to 'vi' defaults.
 */
export function applyAppLangPack(pack: Record<string, unknown>): void {
	const hasKeys = Object.keys(pack).length > 0
	if (!hasKeys) {
		// No custom pack — stay on (or return to) built-in defaults.
		i18n.changeLanguage('vi')
		return
	}
	// Deep-merge into a 'app' namespace that overrides 'vi'.
	i18n.addResourceBundle('app', 'translation', pack, true, true)
	i18n.changeLanguage('app')
}

/**
 * Clear the app-level pack and revert to built-in defaults.
 * Called after a successful DELETE /config/langpack.
 */
export function clearAppLangPack(): void {
	i18n.removeResourceBundle('app', 'translation')
	i18n.changeLanguage('vi')
}

export default i18n
