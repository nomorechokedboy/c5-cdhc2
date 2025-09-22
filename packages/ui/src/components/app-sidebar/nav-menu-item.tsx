import {
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarMenuSubButton,
	SidebarMenuSubItem,
	useSidebar
} from '../ui/sidebar'
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger
} from '../ui/collapsible'
import { ChevronDown } from 'lucide-react'
import { NavItem, SidebarRenderProps } from './types'
import { NavMenuItems } from './nav-menu-items'

interface NavMenuItemProps
	extends Pick<SidebarRenderProps, 'renderLink' | 'renderIcon'> {
	item: NavItem
	level: number
}

export function NavMenuItem({
	item,
	level,
	renderLink,
	renderIcon
}: NavMenuItemProps) {
	const { state } = useSidebar()
	const isCollapsed = state === 'collapsed'
	const hasChildren = item.items && item.items.length > 0
	const Icon = item.icon

	const iconElement =
		Icon && renderIcon ? (
			renderIcon(Icon, 'w-5 h-5')
		) : Icon ? (
			<Icon className='w-5 h-5' />
		) : null

	if (level === 0) {
		if (hasChildren) {
			return (
				<SidebarMenuItem>
					<Collapsible
						className='group/collapsible'
						defaultOpen={false}
					>
						<CollapsibleTrigger asChild>
							<SidebarMenuButton className='flex items-center gap-3 rounded-xl px-4 py-2 font-medium text-gray-700 transition-colors hover:bg-gray-200 focus:bg-blue-100 cursor-pointer'>
								{iconElement}
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
									renderLink={renderLink}
									renderIcon={renderIcon}
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
						{renderLink(item)}
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
							{iconElement}
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
								renderLink={renderLink}
								renderIcon={renderIcon}
							/>
						</CollapsibleContent>
					)}
				</Collapsible>
			) : (
				<SidebarMenuSubButton
					asChild
					isActive={item.isActive}
					className='flex items-center gap-3 rounded-xl px-4 py-2 font-medium text-gray-700 transition-colors hover:bg-gray-200 focus:bg-blue-100'
				>
					{renderLink(item)}
				</SidebarMenuSubButton>
			)}
		</SidebarMenuSubItem>
	)
}
