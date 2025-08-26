import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuShortcut,
	DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import useAuth from '@/hooks/useAuth'
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip'

export function UserNav() {
	const { logout, user } = useAuth()
	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button
					variant='ghost'
					className='relative h-8 w-8 rounded-full'
				>
					<Avatar className='h-9 w-9'>
						<AvatarImage src='/avatars/03.png' alt='@shadcn' />
						<AvatarFallback>AD</AvatarFallback>
					</Avatar>
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent className='w-56' align='end' forceMount>
				<DropdownMenuLabel className='font-normal'>
					<div className='flex flex-col space-y-1'>
						<p className='text-sm font-medium leading-none'>
							{user?.displayName}
						</p>
						<p className='text-xs leading-none text-muted-foreground'>
							{user?.username}
						</p>
					</div>
				</DropdownMenuLabel>
				<DropdownMenuSeparator />
				<Tooltip>
					<TooltipTrigger>
						<DropdownMenuItem disabled>
							Trang cá nhân
							<DropdownMenuShortcut>⇧⌘P</DropdownMenuShortcut>
						</DropdownMenuItem>
					</TooltipTrigger>
					<TooltipContent>
						<p>Tính năng đang phát triển</p>
					</TooltipContent>
				</Tooltip>{' '}
				<DropdownMenuGroup></DropdownMenuGroup>
				<DropdownMenuSeparator />
				<DropdownMenuItem onClick={logout}>Đăng xuất</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	)
}
