import { createFileRoute } from '@tanstack/react-router'
import { SidebarInset } from '@/components/ui/sidebar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import BirthdayByWeek from '@/components/birthday-by-week'
import BirthdayByMonth from '@/components/birthday-by-month'

export const Route = createFileRoute('/birthday')({
	component: RouteComponent
})

function RouteComponent() {
	return (
		<SidebarInset>
			<div className='hidden h-full flex-1 flex-col space-y-8 p-8 md:flex'>
				<Tabs defaultValue='week'>
					<TabsList>
						<TabsTrigger value='week'>Tuần</TabsTrigger>
						<TabsTrigger value='month'>Tháng</TabsTrigger>
					</TabsList>

					<TabsContent value='week'>
						<BirthdayByWeek />
					</TabsContent>

					<TabsContent value='month'>
						<BirthdayByMonth />
					</TabsContent>
				</Tabs>
			</div>
		</SidebarInset>
	)
}
