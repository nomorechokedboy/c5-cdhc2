import { ElementType, ReactNode } from 'react'

export interface NavItem {
	title: string
	url: string
	isActive?: boolean
	items?: NavItem[]
	search?: Record<string, string>
	icon?: ElementType
	metadata?: Record<string, any> // For custom data
}

export interface SidebarData {
	versions?: string[]
	navMain: NavItem[]
}

export interface SidebarConfig {
	logoSrc: string
	title: string
	subtitle: string
	showCustomContent?: boolean
	defaultOpenGroups?: boolean
}

// Generic data transformer interface
export interface DataTransformer<TInput, TOutput = NavItem[]> {
	transform(input: TInput[]): TOutput
}

export interface SidebarRenderProps {
	renderLink: (item: NavItem) => ReactNode
	renderCustomContent?: ReactNode
	renderFooter?: ReactNode
	renderIcon?: (icon: ElementType, className?: string) => ReactNode
}
