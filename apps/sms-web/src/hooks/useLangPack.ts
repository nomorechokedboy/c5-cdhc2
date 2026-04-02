import { useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { LangPackApi } from '@/api'
import { applyAppLangPack, clearAppLangPack } from '@/i18n'

export const LANG_PACK_QUERY_KEY = ['config', 'langpack'] as const

/**
 * Fetches the app-level language pack from the server and applies it to i18n.
 * Call this once in __root.tsx so every user (including unauthenticated ones
 * on the login page) sees the admin-customised strings.
 *
 * The endpoint is public so no auth token is needed for GET.
 * Pack changes are reflected within the staleTime window (5 min).
 */
export function useLangPack() {
	const { data: pack } = useQuery({
		queryKey: LANG_PACK_QUERY_KEY,
		queryFn: LangPackApi.Get,
		staleTime: 5 * 60 * 1000, // re-fetch at most every 5 min
		gcTime: 10 * 60 * 1000,
		retry: false // don't retry on failure — fall back to defaults silently
	})

	useEffect(() => {
		if (pack === undefined) return
		applyAppLangPack(pack)
	}, [pack])
}

/**
 * Returns helpers for the admin lang pack manager.
 * Invalidates the lang pack query after set/delete so the UI updates.
 */
export function useLangPackAdmin() {
	const queryClient = useQueryClient()

	const invalidate = () =>
		queryClient.invalidateQueries({ queryKey: LANG_PACK_QUERY_KEY })

	const setPack = async (pack: Record<string, unknown>) => {
		await LangPackApi.Set(pack)
		await invalidate()
	}

	const deletePack = async () => {
		await LangPackApi.Delete()
		clearAppLangPack()
		await invalidate()
	}

	return { setPack, deletePack }
}
