import {
	Home,
	UsersRound,
	Languages,
	FileSpreadsheet,
	ShieldAlert
} from 'lucide-react'
import { Link } from '@tanstack/react-router'
import Cdhc2Logo from '@/assets/cdhc2.png'
import { AppSidebarSkeleton } from '@repo/ui/components/app-sidebar-skeleton'
import { EllipsisText } from '@repo/ui/components/ellipsis-text'
import type {
	NavItem,
	SidebarConfig,
	SidebarData,
	SidebarRenderProps,
	DataTransformer
} from '@repo/ui/components/app-sidebar/index'
import {
	useSidebarLogic,
	AppSidebar as GenericSidebar
} from '@repo/ui/components/app-sidebar/index'
import {
	useSidebar,
	Sidebar,
	SidebarMenuSub,
	SidebarMenuSubItem,
	SidebarMenuSubButton
} from '@repo/ui/components/ui/sidebar'
import { useQuery } from '@tanstack/react-query'
import { CategoryApi } from '@/api'
import useAuth from '@/hooks/useAuth'
import type { CourseCategory } from '@/types'
import { useTranslation } from 'react-i18next'

// ─── Tree types & builder ────────────────────────────────────────────────────

type CategoryNode = CourseCategory & { children: CategoryNode[] }

/**
 * Converts a flat category list (each item has `parent: number`) into a tree.
 * Items whose parent is 0 or whose parent isn't in the list become roots.
 */
function buildCategoryTree(categories: CourseCategory[]): CategoryNode[] {
	const map = new Map<number, CategoryNode>()
	const roots: CategoryNode[] = []

	categories.forEach((c) => map.set(c.id, { ...c, children: [] }))

	categories.forEach((c) => {
		const node = map.get(c.id)!
		if (c.parent === 0 || !map.has(c.parent)) {
			roots.push(node)
		} else {
			map.get(c.parent)!.children.push(node)
		}
	})

	return roots
}

/** URL-safe identifier for a category: prefer idnumber, fall back to id. */
function catUrl(cat: CourseCategory): string {
	return cat.idnumber?.trim() ? cat.idnumber : String(cat.id)
}

// ─── Recursive sub-category list ────────────────────────────────────────────

function SubCategoryList({ nodes }: { nodes: CategoryNode[] }) {
	return (
		<SidebarMenuSub>
			{nodes.map((cat) => (
				<SidebarMenuSubItem key={cat.id}>
					<SidebarMenuSubButton asChild>
						<Link
							to='/khoa-hoc/$categoryIdnumber'
							params={{ categoryIdnumber: catUrl(cat) }}
							state={{ category: { id: cat.id } }}
							className='flex items-center gap-2 min-w-0'
						>
							<EllipsisText maxWidth='140px'>
								{cat.name}
							</EllipsisText>
						</Link>
					</SidebarMenuSubButton>
					{/* Recurse for grandchildren */}
					{cat.children.length > 0 && (
						<SubCategoryList nodes={cat.children} />
					)}
				</SidebarMenuSubItem>
			))}
		</SidebarMenuSub>
	)
}

// ─── DataTransformer ─────────────────────────────────────────────────────────

class CourseCategoryToNavTransformer
	implements DataTransformer<CourseCategory, NavItem[]>
{
	transform(data: CourseCategory[]): NavItem[] {
		const roots = buildCategoryTree(data)

		return roots.map((cat) => ({
			title: cat.name,
			url: `/khoa-hoc/${catUrl(cat)}`,
			icon: UsersRound,
			metadata: { category: { id: cat.id } },
			// Only attach renderChildren when there are sub-categories;
			// the GenericSidebar uses this to decide whether to show a toggle.
			renderChildren:
				cat.children.length > 0
					? () => <SubCategoryList nodes={cat.children} />
					: undefined
		}))
	}
}

// ─── Sidebar ─────────────────────────────────────────────────────────────────

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
	const { t } = useTranslation()
	const { hasElevatedAccess, isAdmin, isManager, role } = useAuth()
	const showAdmin = isAdmin || isManager

	// The Go /categories endpoint returns role-appropriate data:
	//   admin/manager → all visible categories (flat with parent info)
	//   teacher       → only categories where they are assigned
	const { data: categories = [], isLoading } = useQuery({
		queryKey: ['categories', role],
		queryFn: CategoryApi.GetCategories,
		enabled: hasElevatedAccess
	})

	// ── base navigation ────────────────────────────────────────────────────
	const baseNav: SidebarData = {
		navMain: [
			{
				title: t('nav.general'),
				url: '#',
				items: [{ title: t('nav.home'), url: '/', icon: Home }]
			}
		]
	}

	// ── admin / manager tools ──────────────────────────────────────────────
	const adminGroup = showAdmin
		? {
				title: t('nav.adminSection'),
				url: '#',
				items: [
					{
						title: t('nav.langpack'),
						url: '/admin/langpack',
						icon: Languages
					},
					{
						title: t('nav.exportTemplates'),
						url: '/admin/export-templates',
						icon: FileSpreadsheet
					},
					{
						title: t('nav.auditLog'),
						url: '/audit',
						icon: ShieldAlert
					}
				]
			}
		: null

	const sidebarData: SidebarData = adminGroup
		? { navMain: [...baseNav.navMain, adminGroup] }
		: baseNav

	const transformer = new CourseCategoryToNavTransformer()

	const { navigationData } = useSidebarLogic({
		baseNavigation: sidebarData,
		insertPosition: 1,
		groupTitle: t('nav.classList'),
		dataTransformer: hasElevatedAccess ? transformer : undefined,
		dynamicData: hasElevatedAccess ? categories : undefined
	})

	const config: SidebarConfig = {
		logoSrc: Cdhc2Logo,
		title: t('nav.appTitle'),
		subtitle: t('nav.appSubtitle'),
		showCustomContent: true,
		defaultOpenGroups: true
	}

	const renderProps: SidebarRenderProps = {
		renderLink: (item: NavItem) => {
			const Icon = item.icon
			const { state } = useSidebar()
			const isCollapsed = state === 'collapsed'

			return (
				<Link
					to={item.url}
					state={item.metadata}
					className='flex items-center gap-3 w-full min-w-0'
				>
					{Icon && <Icon className='w-5 h-5 shrink-0' />}
					{!isCollapsed && (
						<EllipsisText className='text-sm' maxWidth='160px'>
							{item.title}
						</EllipsisText>
					)}
				</Link>
			)
		}
	}

	return (
		<GenericSidebar
			{...props}
			data={navigationData}
			config={config}
			renderProps={renderProps}
			isLoading={isLoading && hasElevatedAccess}
			loadingComponent={<AppSidebarSkeleton />}
		/>
	)
}
