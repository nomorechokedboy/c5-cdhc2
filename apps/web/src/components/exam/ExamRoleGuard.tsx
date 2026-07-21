/**
 * Chặn route đề thi theo quyền đặc tả (GV không vào duyệt/bank/rút đề).
 */
import { Link } from '@tanstack/react-router'
import { examNavAllowed, type ExamNavKey } from '@/lib/exam-roles'
import { Button } from '@/components/ui/button'
import { isSuperAdmin } from '@/lib/utils'

export default function ExamRoleGuard({
	navKey,
	children
}: {
	navKey: ExamNavKey
	children: React.ReactNode
}) {
	const allowed = isSuperAdmin() || examNavAllowed(navKey)
	if (allowed) return <>{children}</>

	return (
		<div className='space-y-4 p-6'>
			<h1 className='text-xl font-semibold'>Không có quyền truy cập</h1>
			<p className='text-muted-foreground text-sm max-w-lg'>
				Tài khoản giảng viên chỉ được <strong>soạn đề của mình</strong>{' '}
				và gửi CNK. Duyệt / thẩm định / ngân hàng / rút đề thuộc CNK,
				Ban Khảo thí hoặc BGH.
			</p>
			<div className='flex flex-wrap gap-2'>
				<Button asChild>
					<Link to='/de-thi/cua-toi'>Về đề của tôi</Link>
				</Button>
				<Button asChild variant='outline'>
					<Link to='/de-thi'>Tổng quan đề thi</Link>
				</Button>
			</div>
		</div>
	)
}
