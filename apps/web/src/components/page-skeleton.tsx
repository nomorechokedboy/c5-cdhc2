import { AppSidebarSkeleton } from '@/components/app-sidebar-skeleton'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'

export function PageSkeleton() {
	return (
		<SidebarProvider>
			<AppSidebarSkeleton />
			<SidebarInset>
				<header className='flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12'>
					<div className='flex items-center gap-2 px-4'>
						<Skeleton className='h-6 w-6' />
						<Separator
							orientation='vertical'
							className='mr-2 h-4'
						/>
						<div className='flex items-center space-x-2'>
							<Skeleton className='h-4 w-32 hidden md:block' />
							<Skeleton className='h-4 w-1 hidden md:block' />
							<Skeleton className='h-4 w-24' />
						</div>
					</div>
				</header>

				<div className='flex flex-1 flex-col gap-4 p-4 pt-0'>
					<div className='grid auto-rows-min gap-4 md:grid-cols-3'>
						<Skeleton className='aspect-video rounded-xl' />
						<Skeleton className='aspect-video rounded-xl' />
						<Skeleton className='aspect-video rounded-xl' />
					</div>

					<div className='min-h-[100vh] flex-1 rounded-xl md:min-h-min'>
						<Skeleton className='h-full w-full rounded-xl' />
					</div>
				</div>
			</SidebarInset>
		</SidebarProvider>
	)
}
