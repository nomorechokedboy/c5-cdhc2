import InitializeAdminForm from '@/components/initialize-admin-form'
import useIsInitAdmin from '@/hooks/useIsInitAdmin'
import { createFileRoute, Navigate } from '@tanstack/react-router'

export const Route = createFileRoute('/khoi-tao-qtv')({
	component: RouteComponent
})

function RouteComponent() {
	const { data: isInitAdmin } = useIsInitAdmin()
	if (isInitAdmin !== false) {
		return <Navigate to='/' replace={true} />
	}

	return (
		<main className='min-h-screen flex flex-col items-center justify-center bg-background p-4'>
			<div className='w-full max-w-md space-y-6'>
				<div className='text-center space-y-2'>
					<p className='text-xs font-medium uppercase tracking-widest text-muted-foreground'>
						Khởi tạo lần đầu
					</p>
				</div>
				<InitializeAdminForm />
				<p className='text-center text-xs text-muted-foreground'>
					Tài khoản quản trị viên này sẽ có toàn bộ quyền truy cập hệ
					thống và dữ liệu.
				</p>
			</div>
		</main>
	)
}
