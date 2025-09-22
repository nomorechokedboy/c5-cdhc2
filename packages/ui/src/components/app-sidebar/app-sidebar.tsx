import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarHeader,
	SidebarRail,
	useSidebar
} from '../ui/sidebar'
import { SidebarConfig, SidebarData, SidebarRenderProps } from './types'
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger
} from '../ui/collapsible'
import { ChevronDown } from 'lucide-react'
import { NavMenuItems } from './nav-menu-items'
import { ComponentProps } from 'react'

interface AppSidebarProps extends ComponentProps<typeof Sidebar> {
	data: SidebarData
	config: SidebarConfig
	renderProps: SidebarRenderProps
	isLoading?: boolean
	loadingComponent?: React.ReactNode
}

export function AppSidebar({
	data,
	config,
	renderProps,
	isLoading = false,
	loadingComponent,
	...props
}: AppSidebarProps) {
	const { state } = useSidebar()
	const isCollapsed = state === 'collapsed'

	if (isLoading && loadingComponent) {
		return <>{loadingComponent}</>
	}

	return (
		<Sidebar {...props}>
			<SidebarHeader>
				<div className='flex items-center gap-2 px-4 py-2'>
					<div className='flex h-8 w-8 items-center justify-center rounded-lg bg-secondary text-primary-foreground'>
						<img
							src={config.logoSrc}
							alt={config.title}
							className='h-6 w-6'
						/>
					</div>
					{!isCollapsed && (
						<div className='flex flex-col'>
							<span className='text-sm font-semibold'>
								{config.title}
							</span>
							<span className='text-xs text-muted-foreground'>
								{config.subtitle}
							</span>
						</div>
					)}
				</div>
			</SidebarHeader>

			<SidebarContent>
				{!isCollapsed &&
					config.showCustomContent &&
					renderProps.renderCustomContent && (
						<div className='p-4 w-full'>
							{renderProps.renderCustomContent}
						</div>
					)}

				{data.navMain.map((item) => (
					<Collapsible
						key={item.title}
						className='group/collapsible'
						defaultOpen={config.defaultOpenGroups}
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
									<NavMenuItems
										items={item.items || []}
										renderLink={renderProps.renderLink}
										renderIcon={renderProps.renderIcon}
									/>
								</SidebarGroupContent>
							) : (
								<CollapsibleContent>
									<SidebarGroupContent>
										<NavMenuItems
											items={item.items || []}
											renderLink={renderProps.renderLink}
											renderIcon={renderProps.renderIcon}
										/>
									</SidebarGroupContent>
								</CollapsibleContent>
							)}
						</SidebarGroup>
					</Collapsible>
				))}
			</SidebarContent>

			<SidebarRail />

			{renderProps.renderFooter && (
				<SidebarFooter>{renderProps.renderFooter}</SidebarFooter>
			)}
		</Sidebar>
	)
}
