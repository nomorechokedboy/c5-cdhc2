import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator
} from '@repo/ui/components/ui/breadcrumb'
import { Separator } from '@repo/ui/components/ui/separator'
import { SidebarTrigger } from '@repo/ui/components/ui/sidebar'
import { Link, useLocation } from '@tanstack/react-router'
import { Fragment } from 'react/jsx-runtime'
import { UserNav } from '@repo/ui/components/user-nav'
import useAuth from '@/hooks/useAuth'

export default function Header() {
	const { logout } = useAuth()
	const location = useLocation()
	const path = location.pathname
	const segments = path.split('/').filter(Boolean)

	const breadcrumbItems = [
		{ label: 'Trang chủ', href: '/' },
		...segments.map((seg, idx) => ({
			label: decodeURIComponent(seg),
			href: '/' + segments.slice(0, idx + 1).join('/')
		}))
	]

	return (
		<header className='flex flex-row items-center justify-between h-16 shrink-0 gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 sticky top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-20 border-b'>
			<div className='flex items-center gap-2 px-4'>
				<SidebarTrigger className='-ml-1' />
				<Separator
					orientation='vertical'
					className='mr-2 data-[orientation=vertical]:h-4'
				/>
				<Breadcrumb>
					<BreadcrumbList>
						{breadcrumbItems.map((item, idx) => (
							<Fragment key={item.href}>
								<BreadcrumbItem>
									{idx < breadcrumbItems.length - 1 ? (
										<BreadcrumbLink>
											<Link to={item.href}>
												{item.label}
											</Link>
										</BreadcrumbLink>
									) : (
										<BreadcrumbPage>
											{item.label}
										</BreadcrumbPage>
									)}
								</BreadcrumbItem>
								{idx < breadcrumbItems.length - 1 && (
									<BreadcrumbSeparator />
								)}
							</Fragment>
						))}
					</BreadcrumbList>
				</Breadcrumb>
			</div>
			<div className='px-4 flex items-center gap-5'>
				{/* <NotificationBell />
				 */}
				<UserNav
					username=''
					fallbackDisplayName='T'
					onLogout={logout}
				/>
			</div>
		</header>
	)
}
