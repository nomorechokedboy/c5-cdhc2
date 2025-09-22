import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarMenuSkeleton
} from './ui/sidebar'
import { Skeleton } from './ui/skeleton'

export function AppSidebarSkeleton() {
	return (
		<Sidebar collapsible='icon'>
			<SidebarHeader>
				<div className='flex items-center gap-2 px-2 py-2'>
					<Skeleton className='h-8 w-8 rounded' />
					<div className='flex flex-col gap-1 group-data-[collapsible=icon]:hidden'>
						<Skeleton className='h-4 w-24' />
						<Skeleton className='h-3 w-16' />
					</div>
				</div>
			</SidebarHeader>

			<SidebarContent>
				<SidebarGroup>
					<SidebarGroupLabel>
						<Skeleton className='h-4 w-20' />
					</SidebarGroupLabel>
					<SidebarGroupContent>
						<SidebarMenu>
							{Array.from({ length: 4 }).map((_, index) => (
								<SidebarMenuItem key={index}>
									<SidebarMenuSkeleton showIcon />
								</SidebarMenuItem>
							))}
						</SidebarMenu>
					</SidebarGroupContent>
				</SidebarGroup>

				<SidebarGroup>
					<SidebarGroupLabel>
						<Skeleton className='h-4 w-16' />
					</SidebarGroupLabel>
					<SidebarGroupContent>
						<SidebarMenu>
							{Array.from({ length: 3 }).map((_, index) => (
								<SidebarMenuItem key={index}>
									<SidebarMenuSkeleton showIcon />
								</SidebarMenuItem>
							))}
						</SidebarMenu>
					</SidebarGroupContent>
				</SidebarGroup>
			</SidebarContent>

			<SidebarFooter>
				<SidebarMenu>
					<SidebarMenuItem>
						<SidebarMenuButton className='px-2 py-2'>
							<Skeleton className='h-8 w-8 rounded-full' />
							<div className='flex flex-col gap-1 group-data-[collapsible=icon]:hidden'>
								<Skeleton className='h-4 w-20' />
								<Skeleton className='h-3 w-24' />
							</div>
						</SidebarMenuButton>
					</SidebarMenuItem>
				</SidebarMenu>
			</SidebarFooter>
		</Sidebar>
	)
}
