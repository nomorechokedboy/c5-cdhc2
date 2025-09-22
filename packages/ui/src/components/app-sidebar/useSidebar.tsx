import { useMemo } from 'react'
import { DataTransformer, NavItem, SidebarData } from './types'

export interface UseSidebarLogicOptions<TData = any> {
	baseNavigation: SidebarData
	dynamicData?: TData[]
	dataTransformer?: DataTransformer<TData, NavItem[]>
	insertPosition?: number // Where to insert dynamic data in navMain
	groupTitle?: string // Title for dynamic data group
}

export function useSidebarLogic<TData = any>({
	baseNavigation,
	dynamicData,
	dataTransformer,
	insertPosition = 1,
	groupTitle = 'Dynamic Items'
}: UseSidebarLogicOptions<TData>) {
	const navigationData = useMemo(() => {
		if (!dynamicData || !dataTransformer) {
			return baseNavigation
		}

		const transformedItems = dataTransformer.transform(dynamicData)
		const navMainCopy = [...baseNavigation.navMain]

		// Insert transformed data at specified position
		navMainCopy.splice(insertPosition, 0, {
			title: groupTitle,
			url: '#',
			items: transformedItems
		})

		return {
			...baseNavigation,
			navMain: navMainCopy
		}
	}, [
		baseNavigation,
		dynamicData,
		dataTransformer,
		insertPosition,
		groupTitle
	])

	return {
		navigationData,
		baseNavigation
	}
}

export const navigationUtils = {
	findActiveItem: (items: NavItem[], currentPath: string): NavItem | null => {
		for (const item of items) {
			if (item.url === currentPath) return item
			if (item.items) {
				const found = navigationUtils.findActiveItem(
					item.items,
					currentPath
				)
				if (found) return found
			}
		}
		return null
	},

	flattenNavItems: (items: NavItem[]): NavItem[] => {
		return items.reduce<NavItem[]>((acc, item) => {
			acc.push(item)
			if (item.items) {
				acc.push(...navigationUtils.flattenNavItems(item.items))
			}
			return acc
		}, [])
	},

	filterNavItems: (
		items: NavItem[],
		predicate: (item: NavItem) => boolean
	): NavItem[] => {
		return items.filter(predicate).map((item) => ({
			...item,
			items: item.items
				? navigationUtils.filterNavItems(item.items, predicate)
				: undefined
		}))
	},

	setActiveItems: (items: NavItem[], activePath: string): NavItem[] => {
		return items.map((item) => ({
			...item,
			isActive: item.url === activePath,
			items: item.items
				? navigationUtils.setActiveItems(item.items, activePath)
				: undefined
		}))
	},

	searchNavItems: (items: NavItem[], searchTerm: string): NavItem[] => {
		const term = searchTerm.toLowerCase()
		return items
			.filter(
				(item) =>
					item.title.toLowerCase().includes(term) ||
					(item.items &&
						navigationUtils.searchNavItems(item.items, term)
							.length > 0)
			)
			.map((item) => ({
				...item,
				items: item.items
					? navigationUtils.searchNavItems(item.items, term)
					: undefined
			}))
	}
}
