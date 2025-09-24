import { Home } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import Cdhc2Logo from '@/assets/cdhc2.png'
import { AppSidebarSkeleton } from '@repo/ui/components/app-sidebar-skeleton'
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
import { useSidebar, Sidebar } from '@repo/ui/components/ui/sidebar'
import { useQuery } from '@tanstack/react-query'
import { CategoryApi } from '@/api'
import { UsersRound } from 'lucide-react'
import type { CourseCategory } from '@/types'

class CourseCategoryToNavTransformer
	implements DataTransformer<CourseCategory, NavItem[]>
{
	transform(data: CourseCategory[]): NavItem[] {
		return data.map((category) => ({
			title: category.name,
			url: `/khoa-hoc/${category.idnumber}`,
			icon: UsersRound,
			metadata: { category: { id: category.id } }
		}))
	}
}

const APP_BASE_NAVIGATION: SidebarData = {
	navMain: [
		{
			title: 'Chung',
			url: '#',
			items: [{ title: 'Trang chủ', url: '/', icon: Home }]
		}
	]
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
	const { data: courseCategories = [], isLoading: isCourseCategoryLoading } =
		useQuery({ queryKey: ['courses'], queryFn: CategoryApi.GetCategories })

	const courseCategoryTransformer = new CourseCategoryToNavTransformer()
	const { navigationData } = useSidebarLogic({
		baseNavigation: APP_BASE_NAVIGATION,
		insertPosition: 1,
		groupTitle: 'Danh sách lớp',
		dataTransformer: courseCategoryTransformer,
		dynamicData: courseCategories
	})

	const config: SidebarConfig = {
		logoSrc: Cdhc2Logo,
		title: 'Hệ thống quản lý học viên',
		subtitle: 'Trường Cao đẳng hậu cần 2',
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
					className='flex items-center gap-3 w-full'
				>
					{Icon && <Icon className='w-5 h-5' />}
					{!isCollapsed && <span>{item.title}</span>}
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
			isLoading={isCourseCategoryLoading}
			loadingComponent={<AppSidebarSkeleton />}
		/>
	)
}
