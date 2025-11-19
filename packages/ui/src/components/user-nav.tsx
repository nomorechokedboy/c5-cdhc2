import { Avatar, AvatarFallback, AvatarImage } from '..//components/ui/avatar'
import { Button } from '../components/ui/button'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuShortcut,
	DropdownMenuTrigger
} from '../components/ui/dropdown-menu'
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger
} from '../components/ui/tooltip'

export interface MenuItem {
	type: 'item' | 'separator' | 'group'
	label?: React.ReactNode
	shortcut?: string
	disabled?: boolean
	tooltip?: string
	onClick?: () => void
	icon?: React.ReactNode
}

interface UserNavProps {
	displayName?: string
	username?: string
	avatarUrl?: string
	fallbackDisplayName: string
	menuItems?: MenuItem[]
	onLogout: () => void
}

export function UserNav({
	displayName,
	username,
	avatarUrl = '/avatars/03.png',
	fallbackDisplayName,
	menuItems = [], // Default to empty array
	onLogout
}: UserNavProps) {
	const renderMenuItem = (item: MenuItem, index: number) => {
		if (item.type === 'separator') {
			return <DropdownMenuSeparator key={index} />
		}

		if (item.type === 'group') {
			return <DropdownMenuGroup key={index} />
		}

		const menuItem = (
			<DropdownMenuItem
				key={index}
				disabled={item.disabled}
				onClick={item.onClick}
			>
				<div className='flex items-center gap-2'>
					{item.icon}
					{item.label}
				</div>
				{item.shortcut && (
					<DropdownMenuShortcut>{item.shortcut}</DropdownMenuShortcut>
				)}
			</DropdownMenuItem>
		)

		if (item.tooltip) {
			return (
				<Tooltip key={index}>
					<TooltipTrigger asChild>{menuItem}</TooltipTrigger>
					<TooltipContent>
						<p>{item.tooltip}</p>
					</TooltipContent>
				</Tooltip>
			)
		}

		return menuItem
	}

	return (
		<TooltipProvider>
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button
						variant='ghost'
						className='relative h-8 w-8 rounded-full'
					>
						<Avatar className='h-9 w-9'>
							<AvatarImage
								src={avatarUrl || '/placeholder.svg'}
								alt={displayName}
							/>
							<AvatarFallback>
								{fallbackDisplayName}
							</AvatarFallback>
						</Avatar>
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent className='w-56' align='end' forceMount>
					<DropdownMenuLabel className='font-normal'>
						<div className='flex flex-col space-y-1'>
							<p className='text-sm font-medium leading-none'>
								{displayName}
							</p>
							<p className='text-xs leading-none text-muted-foreground'>
								{username}
							</p>
						</div>
					</DropdownMenuLabel>
					<DropdownMenuSeparator />

					{menuItems.map((item, index) =>
						renderMenuItem(item, index)
					)}

					{menuItems.length > 0 && <DropdownMenuSeparator />}

					<DropdownMenuItem onClick={onLogout}>
						Đăng xuất
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
		</TooltipProvider>
	)
}
