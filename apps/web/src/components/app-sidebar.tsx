import { SidebarFooter, useSidebar } from '@/components/ui/sidebar'
import * as React from 'react'
import {
	UserPlus,
	Calendar,
	ChevronDown,
	PieChart,
	Star,
	HeartHandshake,
	Church,
	UserCheck,
	Building2,
	UsersRound,
	Building,
	Home,
	Proportions,
	List
} from 'lucide-react'
import {
	Sidebar,
	SidebarContent,
	SidebarGroup,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarMenuSub,
	SidebarMenuSubButton,
	SidebarMenuSubItem,
	SidebarRail
} from '@/components/ui/sidebar'
import { Link } from '@tanstack/react-router'
import StudentForm from '@/components/student-form'
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger
} from '@/components/ui/collapsible'
import useUnitsData from '@/hooks/useUnitsData'
import Cdhc2Logo from '@/assets/cdhc2.png'
import { AppSidebarSkeleton } from './app-sidebar-skeleton'
import { ThemeToggle } from './theme-toggle'
import useAuth from '@/hooks/useAuth'
import type { GetUnitQuery } from '@/types'

// Updated data structure to support unlimited nesting and icons
const data = {
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
					// icon: HeartHandshake
				}
			]
		},
		// Chức năng khác -> import học viên
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
		},
		{
			title: 'Quản lý người dùng',
			url: '#',
			icon: Calendar,
			items: [
				{
					title: 'Danh sách người dùng',
					url: '/list-user',
					icon: List
				}
			]
		}
	]
}

// Type definition for navigation items
interface NavItem {
	title: string
	url: string
	isActive?: boolean
	items?: NavItem[]
	search?: { [k: string]: string }
	icon?: React.ElementType
}

// Recursive component to render nested menu items
function NavMenuItems({
	items,
	level = 0
}: {
	items: NavItem[]
	level?: number
}) {
	if (level === 0) {
		// Top level items
		return (
			<SidebarMenu>
				{items.map((item) => (
					<NavMenuItem key={item.title} item={item} level={level} />
				))}
			</SidebarMenu>
		)
	} else {
		// Nested items use SidebarMenuSub
		return (
			<SidebarMenuSub>
				{items.map((item) => (
					<NavMenuItem key={item.title} item={item} level={level} />
				))}
			</SidebarMenuSub>
		)
	}
}

// Individual menu item component
function NavMenuItem({ item, level }: { item: NavItem; level: number }) {
	const { state } = useSidebar()
	const isCollapsed = state === 'collapsed'

	const hasChildren = item.items && item.items.length > 0
	const Icon = item.icon

	if (level === 0) {
		// Top level menu item
		if (hasChildren) {
			return (
				<SidebarMenuItem>
					<Collapsible
						className='group/collapsible'
						defaultOpen={false}
					>
						<CollapsibleTrigger asChild>
							<SidebarMenuButton className='flex items-center gap-3 rounded-xl px-4 py-2 font-medium text-gray-700 transition-colors hover:bg-gray-200 focus:bg-blue-100 cursor-pointer'>
								{Icon && <Icon className='w-5 h-5' />}
								{!isCollapsed && <span>{item.title}</span>}
								{!isCollapsed && (
									<ChevronDown className='ml-auto transition-transform group-data-[state=open]/collapsible:rotate-180' />
								)}
							</SidebarMenuButton>
						</CollapsibleTrigger>
						{!isCollapsed && (
							<CollapsibleContent>
								<NavMenuItems
									items={item.items!}
									level={level + 1}
								/>
							</CollapsibleContent>
						)}
					</Collapsible>
				</SidebarMenuItem>
			)
		} else {
			return (
				<SidebarMenuItem>
					<SidebarMenuButton
						asChild
						isActive={item.isActive}
						className='flex items-center gap-3 rounded-xl px-4 py-2 font-medium text-gray-700 transition-colors hover:bg-gray-200 focus:bg-blue-100 cursor-pointer'
					>
						<Link
							to={item.url}
							className='flex items-center gap-3 w-full'
						>
							{Icon && <Icon className='w-5 h-5' />}
							{!isCollapsed && <span>{item.title}</span>}
						</Link>
					</SidebarMenuButton>
				</SidebarMenuItem>
			)
		}
	}

	return (
		<SidebarMenuSubItem>
			{hasChildren ? (
				<Collapsible className='group/collapsible'>
					<CollapsibleTrigger asChild>
						<SidebarMenuSubButton className='flex items-center gap-3 rounded-xl px-4 py-2 font-medium text-gray-700 transition-colors hover:bg-gray-200 focus:bg-blue-100 cursor-pointer'>
							{Icon && <Icon className='w-5 h-5  ' />}
							{!isCollapsed && <span>{item.title}</span>}
							{!isCollapsed && (
								<ChevronDown className='ml-auto transition-transform group-data-[state=open]/collapsible:rotate-180' />
							)}
						</SidebarMenuSubButton>
					</CollapsibleTrigger>
					{!isCollapsed && (
						<CollapsibleContent>
							<NavMenuItems
								items={item.items!}
								level={level + 1}
							/>
						</CollapsibleContent>
					)}
				</Collapsible>
			) : (
				<SidebarMenuSubButton
					asChild
					isActive={item.isActive}
					className='flex items-center gap-3 rounded-xl px-4 py-2 font-medium text-gray-700 transition-colors  hover:bg-gray-200  focus:bg-blue-100 '
				>
					<Link
						to={item.url}
						className='flex items-center gap-3 w-full'
					>
						{Icon && <Icon className='w-5 h-5  ' />}
						{!isCollapsed && <span>{item.title}</span>}
					</Link>
				</SidebarMenuSubButton>
			)}
		</SidebarMenuSubItem>
	)
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
	const { state } = useSidebar()
	const isCollapsed = state === 'collapsed'
	const { user } = useAuth()

	const getUnitsQuery: GetUnitQuery | undefined =
		user?.isSuperUser === true
			? {
					level: 'battalion'
				}
			: undefined
	const { data: units, isLoading: isLoadingUnits } =
		useUnitsData(getUnitsQuery)
	if (isLoadingUnits) {
		return <AppSidebarSkeleton />
	}

	const unitsNavbar = units?.map(
		(unit) =>
			({
				title: unit.name,
				url: '#',
				items: [
					{
						title: `Học viên ${unit.name}`,
						url: `/${unit.level === 'battalion' ? 'tieu-doan/' : 'dai-doi/'}${unit.alias}`,
						search: { name: unit.name, level: unit.level },
						icon: UsersRound
					},
					...unit.children.map((child) => ({
						title: child.name,
						url: `/dai-doi/${child.alias}`,
						icon: Building2
					}))
				],
				icon: Building
			}) as NavItem
	)

	const [firstNavItem, ...navMain] = data.navMain
	const newData = {
		version: data.versions,
		navMain: [
			firstNavItem,
			{ title: 'Đơn vị', url: '#', items: unitsNavbar },
			...navMain
		]
	}

	return (
		<Sidebar {...props}>
			<SidebarHeader>
				<div className='flex items-center gap-2 px-4 py-2'>
					<div className='flex h-8 w-8 items-center justify-center rounded-lg bg-secondary text-primary-foreground'>
						<img
							src={Cdhc2Logo}
							alt='Logo Trường Cao đẳng hậu cần 2'
							className='h-6 w-6'
						/>
					</div>
					{!isCollapsed && (
						<div className='flex flex-col'>
							<span className='text-sm font-semibold'>
								Hệ thống quản lý học viên
							</span>
							<span className='text-xs text-muted-foreground'>
								Trường Cao đẳng hậu cần 2
							</span>
						</div>
					)}
				</div>
			</SidebarHeader>

			<SidebarContent>
				{!isCollapsed && (
					<div className='p-4 w-full'>
						<StudentForm
							buttonProps={{ className: 'w-full' }}
							onSuccess={() => {}}
						/>
					</div>
				)}

				{newData.navMain.map((item) => (
					<Collapsible
						key={item.title}
						className='group/collapsible'
						defaultOpen={false}
					>
						<SidebarGroup>
							{!isCollapsed && (
								<SidebarGroupLabel asChild>
									<CollapsibleTrigger>
										{item.title}
										<ChevronDown className='ml-auto transition-transform group-data-[state=open]/collapsible:rotate-180' />
									</CollapsibleTrigger>
								</SidebarGroupLabel>
							)}
							{isCollapsed ? (
								<SidebarGroupContent>
									<NavMenuItems items={item.items || []} />
								</SidebarGroupContent>
							) : (
								<CollapsibleContent>
									<SidebarGroupContent>
										<NavMenuItems
											items={item.items || []}
										/>
									</SidebarGroupContent>
								</CollapsibleContent>
							)}
						</SidebarGroup>
					</Collapsible>
				))}
			</SidebarContent>
			<SidebarRail />
			<SidebarFooter>
				<div className='w-full flex items-center justify-between'>
					<div></div>
					<div className=''>
						<ThemeToggle />
					</div>
				</div>
			</SidebarFooter>
		</Sidebar>
	)
}
