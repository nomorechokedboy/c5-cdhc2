import { SidebarMenu, SidebarMenuSub } from '../ui/sidebar'
import { NavItem, SidebarRenderProps } from './types'
import { NavMenuItem } from './nav-menu-item'

interface NavMenuItemsProps
	extends Pick<SidebarRenderProps, 'renderLink' | 'renderIcon'> {
	items: NavItem[]
	level?: number
}

export function NavMenuItems({
	items,
	level = 0,
	renderLink,
	renderIcon
}: NavMenuItemsProps) {
	if (level === 0) {
		return (
			<SidebarMenu>
				{items.map((item) => (
					<NavMenuItem
						key={item.title}
						item={item}
						level={level}
						renderLink={renderLink}
						renderIcon={renderIcon}
					/>
				))}
			</SidebarMenu>
		)
	} else {
		return (
			<SidebarMenuSub>
				{items.map((item) => (
					<NavMenuItem
						key={item.title}
						item={item}
						level={level}
						renderLink={renderLink}
						renderIcon={renderIcon}
					/>
				))}
			</SidebarMenuSub>
		)
	}
}
