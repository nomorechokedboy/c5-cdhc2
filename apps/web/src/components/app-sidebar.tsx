import type * as React from 'react'
import {
	Sidebar,
	SidebarContent,
	SidebarGroup,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarMenuSub,
	SidebarMenuSubButton,
	SidebarMenuSubItem,
	SidebarRail
} from '@/components/ui/sidebar'
import { Link } from '@tanstack/react-router'
import StudentForm from './student-form'
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger
} from './ui/collapsible'
import { ChevronDown } from 'lucide-react'
import useUnitsData from '@/hooks/useUnitsData'

// Updated data structure to support unlimited nesting
const data = {
	versions: ['1.0.1', '1.1.0-alpha', '2.0.0-beta1'],
	navMain: [
		/* {
            title: 'Quản lý đơn vị',
            url: '#',
            items: [
                {
                    title: 'Lớp',
                    url: '/classes'
                },
                {
                    title: 'Học viên',
                    url: '/students'
                }
            ]
        }, */
		{
			title: 'Thống kê học viên',
			url: '#',
			items: [
				{
					title: 'Đảng viên',
					url: '/cpv'
				},
				{
					title: 'Đoàn viên',
					url: '/hcyu'
				},
				{
					title: 'Dân tộc thiểu số',
					url: '/ethnic-minority'
				},
				{
					title: 'Tôn giáo',
					url: '/religion'
				}
			]
		},
		{
			title: 'Sinh nhật học viên',
			url: '#',
			items: [
				{
					title: 'Sinh nhật',
					url: '/birthday'
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
	const hasChildren = item.items && item.items.length > 0

	if (level === 0) {
		// Top level menu item
		return (
			<SidebarMenuItem>
				{hasChildren ? (
					<Collapsible className='group/collapsible' defaultOpen>
						<CollapsibleTrigger asChild>
							<SidebarMenuButton>
								{item.title}
								<ChevronDown className='ml-auto transition-transform group-data-[state=open]/collapsible:rotate-180' />
							</SidebarMenuButton>
						</CollapsibleTrigger>
						<CollapsibleContent>
							<NavMenuItems
								items={item.items!}
								level={level + 1}
							/>
						</CollapsibleContent>
					</Collapsible>
				) : (
					<SidebarMenuButton asChild isActive={item.isActive}>
						<Link to={item.url} search={item.search}>
							{item.title}
						</Link>
					</SidebarMenuButton>
				)}
			</SidebarMenuItem>
		)
	}

	return (
		<SidebarMenuSubItem>
			{hasChildren ? (
				<Collapsible className='group/collapsible' defaultOpen>
					<CollapsibleTrigger asChild>
						<SidebarMenuSubButton>
							{item.title}
							<ChevronDown className='ml-auto transition-transform group-data-[state=open]/collapsible:rotate-180' />
						</SidebarMenuSubButton>
					</CollapsibleTrigger>
					<CollapsibleContent>
						<NavMenuItems items={item.items!} level={level + 1} />
					</CollapsibleContent>
				</Collapsible>
			) : (
				<SidebarMenuSubButton asChild isActive={item.isActive}>
					<Link to={item.url}>{item.title}</Link>
				</SidebarMenuSubButton>
			)}
		</SidebarMenuSubItem>
	)
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
	const { data: units } = useUnitsData({ level: 'battalion' })
	const unitsNavbar = units?.map(
		(unit) =>
			({
				title: unit.name,
				url: '#',
				items: [
					{
						title: `Học viên ${unit.name}`,
						url: `/tieu-doan/${unit.alias}`,
						search: { name: unit.name, level: unit.level }
					},
					...unit.children.map((child) => ({
						title: child.name,
						url: `/dai-doi/${child.alias}`
					}))
				]
			}) as NavItem
	)
	const newData = {
		version: data.versions,
		navMain: [
			{ title: 'Đơn vị', url: '#', items: unitsNavbar },
			...data.navMain
		]
	}

	return (
		<Sidebar {...props}>
			<SidebarContent>
				{/* <div className='p-4 w-full'>
					<StudentForm onSuccess={() => {}} />
				</div> */}
				{/* add logo add apps/web/public/android-chrome-192x192 */}
				<div className='flex items-center justify-center mb-4'>
					<img
					style={{ paddingTop: '10px' }}
						src='https://cdhc2.edu.vn/wp-content/uploads/2025/07/LOGO-MOI.png'
						alt='Logo'
						width='50%'
						
					/>
				</div>

				{newData.navMain.map((item) => (
					<Collapsible
						key={item.title}
						className='group/collapsible'
						defaultOpen
					>
						<SidebarGroup>
							<SidebarGroupLabel asChild>
								<CollapsibleTrigger>
									{item.title}
									<ChevronDown className='ml-auto transition-transform group-data-[state=open]/collapsible:rotate-180' />
								</CollapsibleTrigger>
							</SidebarGroupLabel>
							<CollapsibleContent>
								<SidebarGroupContent>
									<NavMenuItems items={item.items || []} />
								</SidebarGroupContent>
							</CollapsibleContent>
						</SidebarGroup>
					</Collapsible>
				))}
			</SidebarContent>
			<SidebarRail />
		</Sidebar>
	)
}
