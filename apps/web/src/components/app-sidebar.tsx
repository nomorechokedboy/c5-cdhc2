import * as React from 'react'
import { SearchForm } from '@/components/search-form'
import { VersionSwitcher } from '@/components/version-switcher'
import {
	Sidebar,
	SidebarContent,
	SidebarGroup,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarRail
} from '@/components/ui/sidebar'
import { Link } from '@tanstack/react-router'
import StudentForm from './student-form'

// This is sample data.
const data = {
	versions: ['1.0.1', '1.1.0-alpha', '2.0.0-beta1'],
	navMain: [
		// {
		//         title: 'Quản lý chung',
		//         url: '#',
		//         items: [
		//                 {
		//                         title: 'Tổng quan',
		//                         url: '#',
		//                 },
		//                 ,
		//         ],
		// },
		{
			title: 'Quản lý đơn vị',
			url: '#',
			items: [
				{
					title: 'Lớp',
					url: '/classes'
				},
				{
					title: 'Học viên',
					url: '/students'
				}
			]
		},
		{
			title: 'Thống kê học viên',
			url: '#',
			items: [
				{
					title: 'Đảng viên',
					url: '/cpv'
				},
				{
					title: 'Đoàn viên',
					url: '/hcyu'
				}
			]
		},
		{
			title: 'Sinh nhật học viên',
			url: '#',
			items: [
				{
					title: 'Sinh nhật',
					url: '/birthday'
				}
			]
		}
	]
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
	return (
		<Sidebar {...props}>
			{/* <SidebarHeader>
                                <VersionSwitcher
                                        versions={data.versions}
                                        defaultVersion={data.versions[0]}
                                />
                                <SearchForm />
                        </SidebarHeader> */}
			<SidebarContent>
				{/* We create a SidebarGroup for each parent. */}
				<div className='p-4 w-full'>
					<StudentForm onSuccess={() => {}} />
				</div>
				{data.navMain.map((item) => (
					<SidebarGroup key={item.title}>
						<SidebarGroupLabel>{item.title}</SidebarGroupLabel>
						<SidebarGroupContent>
							<SidebarMenu>
								{item.items.map((item) => (
									<SidebarMenuItem key={item.title}>
										<SidebarMenuButton
											asChild
											isActive={item.isActive}
										>
											<Link to={item?.url}>
												{item?.title}
											</Link>
										</SidebarMenuButton>
									</SidebarMenuItem>
								))}
							</SidebarMenu>
						</SidebarGroupContent>
					</SidebarGroup>
				))}
			</SidebarContent>
			<SidebarRail />
		</Sidebar>
	)
}
