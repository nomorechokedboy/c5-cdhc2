import { createFileRoute, Link } from '@tanstack/react-router'
import ProtectedRoute from '@/components/ProtectedRoute'
import { examNavAllowed } from '@/lib/exam-roles'
import {
	Card,
	CardDescription,
	CardHeader,
	CardTitle
} from '@/components/ui/card'
import {
	BookOpen,
	ClipboardCheck,
	FileStack,
	GraduationCap,
	Layers,
	Shuffle
} from 'lucide-react'

export const Route = createFileRoute('/de-thi/')({
	component: RouteComponent
})

function RouteComponent() {
	const items = [
		{
			title: 'Danh mục đào tạo',
			desc: 'Hệ · Ngành · Khoa · Môn',
			to: '/de-thi/danh-muc' as const,
			icon: Layers,
			show: examNavAllowed('catalog')
		},
		{
			title: 'Danh mục lớp',
			desc: 'Lớp thuộc hệ + ngành đào tạo',
			to: '/de-thi/lop' as const,
			icon: GraduationCap,
			show: examNavAllowed('classes')
		},
		{
			title: 'Đề của tôi',
			desc: 'Soạn đề, import CH+ĐA, gửi CNK',
			to: '/de-thi/cua-toi' as const,
			icon: BookOpen,
			show: examNavAllowed('mine')
		},
		{
			title: 'Duyệt đề',
			desc: 'CNK → Khảo thí → BGH',
			to: '/de-thi/duyet' as const,
			icon: ClipboardCheck,
			show: examNavAllowed('approve')
		},
		{
			title: 'Ngân hàng đề',
			desc: 'Đề đã phê duyệt + QR',
			to: '/de-thi/ngan-hang' as const,
			icon: FileStack,
			show: examNavAllowed('bank')
		},
		{
			title: 'Rút đề',
			desc: 'Bốc đề chẵn/lẻ (chỉ Ban KT)',
			to: '/de-thi/rut-de' as const,
			icon: Shuffle,
			show: examNavAllowed('draw')
		}
	].filter((i) => i.show)

	return (
		<ProtectedRoute>
			<div className='space-y-6 p-4 md:p-6'>
				<div>
					<h1 className='text-2xl font-semibold tracking-tight'>
						Quản lý đề thi tự luận
					</h1>
					<p className='text-muted-foreground text-sm'>
						Quyền theo vai trò: GV soạn đề · CNK/KT/BGH duyệt · Ban
						KT rút đề
					</p>
				</div>
				<div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
					{items.map((item) => {
						const Icon = item.icon
						return (
							<Link key={item.to} to={item.to}>
								<Card className='hover:bg-muted/40 h-full transition-colors'>
									<CardHeader>
										<CardTitle className='flex items-center gap-2 text-base'>
											<Icon className='h-5 w-5' />
											{item.title}
										</CardTitle>
										<CardDescription>
											{item.desc}
										</CardDescription>
									</CardHeader>
								</Card>
							</Link>
						)
					})}
				</div>
			</div>
		</ProtectedRoute>
	)
}
