import { createFileRoute } from '@tanstack/react-router'
import { SidebarInset } from '@/components/ui/sidebar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import CpvOfficialThisWeek from '@/components/cpv-official-this-week'
import BirthdayByMonth from '@/components/birthday-by-month'
import BirthdayByQuarter from '@/components/birthday-by-quater'
import CpvOfficialInMonth from '@/components/cpv-official-in-month'
import CpvOfficialInQuarter from '@/components/cpv-official-in-quarter'

export const Route = createFileRoute('/chuyen-dang-chinh-thuc')({
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
						<TabsTrigger value='quarter'>Quý</TabsTrigger>
					</TabsList>

					<TabsContent value='week'>
						<CpvOfficialThisWeek />
					</TabsContent>

					<TabsContent value='month'>
						<CpvOfficialInMonth />
					</TabsContent>

					<TabsContent value='quarter'>
						<CpvOfficialInQuarter />
					</TabsContent>
				</Tabs>
			</div>
		</SidebarInset>
	)
}
