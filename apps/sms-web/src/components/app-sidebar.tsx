import {
	UserPlus,
	Calendar,
	PieChart,
	Star,
	Church,
	UserCheck,
	Home,
	Proportions
} from 'lucide-react'
import { Link } from '@tanstack/react-router'
import Cdhc2Logo from '@/assets/cdhc2.png'
import { AppSidebarSkeleton } from '@repo/ui/components/app-sidebar-skeleton'
import type {
	NavItem,
	SidebarConfig,
	SidebarData,
	SidebarRenderProps
} from '@repo/ui/components/app-sidebar/index'
import {
	useSidebarLogic,
	AppSidebar as GenericSidebar
} from '@repo/ui/components/app-sidebar/index'
import { useSidebar, Sidebar } from '@repo/ui/components/ui/sidebar'

const APP_BASE_NAVIGATION: SidebarData = {
	versions: ['1.0.1', '1.1.0-alpha', '2.0.0-beta1'],
	navMain: [
		{
			title: 'Chung',
			url: '#',
			items: [
				{ title: 'Trang chủ', url: '/', icon: Home },
				{
					title: 'Chất lượng chính trị',
					url: '/thong-ke-chinh-tri',
					icon: Proportions
				}
			]
		},
		{
			title: 'Thống kê học viên',
			url: '#',
			icon: PieChart,
			items: [
				{
					title: 'Đảng viên',
					url: '/cpv',
					icon: UserCheck
				},
				{
					title: 'Đoàn viên',
					url: '/hcyu',
					icon: UserPlus
				},
				{
					title: 'Dân tộc thiểu số',
					url: '/ethnic-minority',
					icon: Star
				},
				{
					title: 'Tôn giáo',
					url: '/religion',
					icon: Church
				}
			]
		},
		{
			title: 'Sự kiện học viên',
			url: '#',
			icon: Calendar,
			items: [
				{
					title: 'Sinh nhật đồng đội',
					url: '/birthday',
					icon: Calendar
				},
				{
					title: '☭ Chuyển Đảng chính thức ',
					url: '/chuyen-dang-chinh-thuc'
				}
			]
		},
		{
			title: 'Chức năng khác',
			url: '#',
			icon: Star,
			items: [
				{
					title: 'Import học viên',
					url: '/import-students',
					icon: UserPlus
				}
			]
		}
	]
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
	const { navigationData } = useSidebarLogic({
		baseNavigation: APP_BASE_NAVIGATION,
		insertPosition: 1,
		groupTitle: 'Đơn vị'
	})

	const config: SidebarConfig = {
		logoSrc: Cdhc2Logo,
		title: 'Hệ thống quản lý học viên',
		subtitle: 'Trường Cao đẳng hậu cần 2',
		showCustomContent: true,
		defaultOpenGroups: false
	}

	const renderProps: SidebarRenderProps = {
		renderLink: (item: NavItem) => {
			const Icon = item.icon
			const { state } = useSidebar()
			const isCollapsed = state === 'collapsed'

			return (
				<Link to={item.url} className='flex items-center gap-3 w-full'>
					{Icon && <Icon className='w-5 h-5' />}
					{!isCollapsed && <span>{item.title}</span>}
				</Link>
			)
		}
	}

	return (
		<GenericSidebar
			data={navigationData}
			config={config}
			renderProps={renderProps}
			// isLoading={isLoadingUnits}
			loadingComponent={<AppSidebarSkeleton />}
			{...props}
		/>
	)
}
