import { Home, UsersRound, BookOpen, Loader2 } from 'lucide-react'
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
import {
	SidebarMenuSub,
	SidebarMenuSubItem,
	SidebarMenuSubButton
} from '@repo/ui/components/ui/sidebar'
import { useQuery } from '@tanstack/react-query'
import { CategoryApi } from '@/api'
import useAuth from '@/hooks/useAuth'
import type { CourseCategory } from '@/types'

// ─── Lazy course list rendered inside a category's CollapsibleContent ────────

function LazyCourseList({ category }: { category: CourseCategory }) {
	const { data: courses = [], isLoading } = useQuery({
		queryKey: ['categoryCourses', category.id],
		queryFn: () => CategoryApi.GetCourses({ CategoryId: category.id })
	})

	if (isLoading) {
		return (
			<SidebarMenuSub>
				<SidebarMenuSubItem>
					<span className='flex items-center gap-2 px-3 py-1.5 text-xs text-muted-foreground'>
						<Loader2 className='w-3 h-3 animate-spin' />
						Đang tải môn học...
					</span>
				</SidebarMenuSubItem>
			</SidebarMenuSub>
		)
	}

	if (courses.length === 0) {
		return (
			<SidebarMenuSub>
				<SidebarMenuSubItem>
					<span className='px-3 py-1.5 text-xs text-muted-foreground'>
						Không có môn học
					</span>
				</SidebarMenuSubItem>
			</SidebarMenuSub>
		)
	}

	return (
		<SidebarMenuSub>
			{courses.map((course) => (
				<SidebarMenuSubItem key={course.id}>
					<SidebarMenuSubButton asChild>
						<Link
							to='/khoa-hoc/$categoryIdnumber/mon-hoc/$courseShortname'
							params={{
								categoryIdnumber: category.idnumber,
								courseShortname: course.shortname
							}}
							state={{ course: { id: course.id } }}
							className='flex items-center gap-2'
						>
							<BookOpen className='w-3 h-3 shrink-0' />
							<span className='truncate'>{course.fullname}</span>
						</Link>
					</SidebarMenuSubButton>
				</SidebarMenuSubItem>
			))}
		</SidebarMenuSub>
	)
}

// ─── DataTransformer: categories → NavItems with lazy renderChildren ─────────

class CourseCategoryToNavTransformer
	implements DataTransformer<CourseCategory, NavItem[]>
{
	transform(data: CourseCategory[]): NavItem[] {
		return data.map((category) => ({
			title: category.name,
			url: `/khoa-hoc/${category.idnumber}`,
			icon: UsersRound,
			metadata: { category: { id: category.id } },
			// renderChildren triggers lazy fetch only when the collapsible is opened
			renderChildren: () => <LazyCourseList category={category} />
		}))
	}
}

// ─── Static base navigation ──────────────────────────────────────────────────

const APP_BASE_NAVIGATION: SidebarData = {
	navMain: [
		{
			title: 'Chung',
			url: '#',
			items: [{ title: 'Trang chủ', url: '/', icon: Home }]
		}
	]
}

// ─── Sidebar ─────────────────────────────────────────────────────────────────

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
	const { hasElevatedAccess } = useAuth()

	const { data: courseCategories = [], isLoading: isCourseCategoryLoading } =
		useQuery({
			queryKey: ['categories'],
			queryFn: CategoryApi.GetCategories,
			enabled: hasElevatedAccess
		})

	const courseCategoryTransformer = new CourseCategoryToNavTransformer()
	const { navigationData } = useSidebarLogic({
		baseNavigation: APP_BASE_NAVIGATION,
		insertPosition: 1,
		groupTitle: 'Danh sách lớp',
		dataTransformer: hasElevatedAccess
			? courseCategoryTransformer
			: undefined,
		dynamicData: hasElevatedAccess ? courseCategories : undefined
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
			isLoading={isCourseCategoryLoading && hasElevatedAccess}
			loadingComponent={<AppSidebarSkeleton />}
		/>
	)
}
