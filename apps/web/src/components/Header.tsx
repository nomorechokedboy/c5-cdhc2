import {
	Breadcrumb,
	BreadcrumbList,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbSeparator,
	BreadcrumbPage
} from '@/components/ui/breadcrumb'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import { NotificationBell } from './notification-bell'

export default function Header() {
	return (
		<header className='flex flex-row items-center justify-between h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 sticky top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-10 border-b'>
			<div className='flex items-center gap-2 px-4'>
				<SidebarTrigger className='-ml-1' />
				<Separator
					orientation='vertical'
					className='mr-2 data-[orientation=vertical]:h-4'
				/>
				{/* <Breadcrumb>
                                        <BreadcrumbList>
                                                <BreadcrumbItem className="hidden md:block">
                                                        <BreadcrumbLink href="#">
                                                                Building Your
                                                                Application
                                                        </BreadcrumbLink>
                                                </BreadcrumbItem>
                                                <BreadcrumbSeparator className="hidden md:block" />
                                                <BreadcrumbItem>
                                                        <BreadcrumbPage>
                                                                Data Fetching
                                                        </BreadcrumbPage>
                                                </BreadcrumbItem>
                                        </BreadcrumbList>
                                </Breadcrumb> */}
			</div>
			<div className='px-4'>
				<NotificationBell />
			</div>
		</header>
	)
}
