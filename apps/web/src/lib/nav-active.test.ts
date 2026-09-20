import { describe, expect, it } from 'vitest'
import {
	findActiveNavItem,
	navContainsKey,
	navItemKey,
	type NavLike
} from './nav-active'

const tree: NavLike[] = [
	{ url: '/', items: undefined },
	{
		url: '#',
		items: [
			{ url: '/vat-tu' },
			{ url: '/vat-tu/danh-muc-nganh', search: { view: 'nganh' } },
			{ url: '/vat-tu/danh-muc-nganh', search: { view: 'loai' } }
		]
	},
	{ url: '/dai-doi', items: [{ url: '/dai-doi/c5' }] }
]

describe('findActiveNavItem', () => {
	it('matches the home item only on exactly /', () => {
		expect(findActiveNavItem(tree, { pathname: '/' })?.url).toBe('/')
		expect(findActiveNavItem(tree, { pathname: '/khac' })).toBeUndefined()
	})

	it('picks the longest matching url so parent routes do not also light up', () => {
		const active = findActiveNavItem(tree, {
			pathname: '/vat-tu/danh-muc-nganh',
			search: { view: 'nganh' }
		})
		expect(active?.search).toEqual({ view: 'nganh' })
	})

	it('needs the search params to match', () => {
		const active = findActiveNavItem(tree, {
			pathname: '/vat-tu/danh-muc-nganh',
			search: { view: 'loai' }
		})
		expect(active?.search).toEqual({ view: 'loai' })
		expect(
			findActiveNavItem(tree, {
				pathname: '/vat-tu/danh-muc-nganh',
				search: { view: 'khac' }
			})?.url
		).toBe('/vat-tu')
	})

	it('matches nested paths under an item', () => {
		expect(
			findActiveNavItem(tree, { pathname: '/dai-doi/c5/hoc-vien' })?.url
		).toBe('/dai-doi/c5')
	})
})

describe('navContainsKey', () => {
	it('is true for a group that holds the active item and false for others', () => {
		const active = findActiveNavItem(tree, { pathname: '/vat-tu' })!
		const key = navItemKey(active)
		expect(navContainsKey(tree[1], key)).toBe(true)
		expect(navContainsKey(tree[2], key)).toBe(false)
		expect(navContainsKey(tree[1], undefined)).toBe(false)
	})
})
