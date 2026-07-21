import { createFileRoute } from '@tanstack/react-router'
import { SidebarInset } from '@/components/ui/sidebar'
import UserTable from '@/components/user-table'
import ProtectedRoute from '@/components/ProtectedRoute'
import usePendingPermissions from '@/hooks/usePendingPermissions'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ShieldAlert } from 'lucide-react'

export const Route = createFileRoute('/list-user')({
	component: RouteComponent
})

function RouteComponent() {
	const pendingPermQ = usePendingPermissions()
	const count = pendingPermQ.data?.count ?? 0
	const items = pendingPermQ.data?.items ?? []

	return (
		<ProtectedRoute>
			<SidebarInset>
				<div className='hidden h-full flex-1 flex-col space-y-4 p-4 md:p-6 lg:p-8 md:flex min-w-0 w-full max-w-none'>
					<div className='flex flex-wrap items-start justify-between gap-3'>
						<div className='min-w-0 flex-1'>
							<h2 className='text-3xl font-bold tracking-tight'>
								Danh sách người dùng
							</h2>
							<p className='text-base text-muted-foreground mt-1.5 max-w-3xl leading-relaxed'>
								Khi <strong>Thêm người dùng</strong> chọn loại:{' '}
								<strong>Ban Giám Hiệu</strong> (phê duyệt đề
								xuất), <strong>Tài khoản ngành</strong>, hoặc{' '}
								<strong>Tài khoản đơn vị sử dụng</strong>. User
								mới chưa gán vai trò → «Chờ cấp quyền» +1.
							</p>
						</div>
						{/* Ô chờ cấp quyền — gọn, không chiếm cột bảng */}
						<Card
							className={
								count > 0
									? 'border-red-600/60 bg-red-600/10 shadow-md shrink-0 w-full sm:w-72'
									: 'border-muted shrink-0 w-full sm:w-72'
							}
						>
							<CardHeader className='pb-2 py-3 px-4'>
								<div className='flex items-center justify-between gap-2'>
									<CardTitle className='text-base flex items-center gap-2'>
										<ShieldAlert className='w-5 h-5 text-red-600' />
										Chờ cấp quyền
									</CardTitle>
									{count > 0 ? (
										<Badge className='bg-red-600 hover:bg-red-600 text-white px-2.5 py-0.5 font-bold'>
											+{count}
										</Badge>
									) : (
										<Badge variant='secondary'>0</Badge>
									)}
								</div>
								<CardDescription className='text-sm'>
									{count > 0
										? 'Gán quyền (⋮ → Phân quyền).'
										: 'Không có user chờ cấp quyền.'}
								</CardDescription>
							</CardHeader>
							{count > 0 && items.length > 0 ? (
								<CardContent className='px-4 pb-3 pt-0'>
									<ul className='max-h-32 overflow-y-auto space-y-1.5 text-sm'>
										{items.slice(0, 12).map((it) => (
											<li
												key={it.userId}
												className='rounded border border-red-600/20 px-2 py-1'
											>
												<span className='font-medium'>
													{it.displayName ||
														it.username}
												</span>
												<span className='text-muted-foreground font-mono ml-1'>
													@{it.username}
												</span>
											</li>
										))}
									</ul>
								</CardContent>
							) : null}
						</Card>
					</div>

					{/* Bảng full width + cuộn chuột */}
					<div className='min-w-0 w-full flex-1'>
						<UserTable filename='danh-sach-nguoi-dung' />
					</div>
				</div>
			</SidebarInset>
		</ProtectedRoute>
	)
}
