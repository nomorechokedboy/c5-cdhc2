/**
 * Hiển thị danh sách câu hỏi + đáp án (admin rà soát)
 */
import type { ExamQuestion } from '@/api/exam'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export default function ExamQuestionsPanel({
	questions,
	locked,
	emptyHint
}: {
	questions?: ExamQuestion[] | null
	locked?: boolean
	emptyHint?: string
}) {
	const list = questions || []

	return (
		<Card className='border-primary/20'>
			<CardHeader>
				<CardTitle className='flex flex-wrap items-center gap-2 text-base'>
					Nội dung đề thi
					<Badge variant='secondary'>{list.length} câu hỏi</Badge>
					{locked && (
						<Badge variant='outline' className='text-amber-700'>
							Đã khóa — chỉ xem, không sửa
						</Badge>
					)}
				</CardTitle>
				<CardDescription>
					Admin / quản lý có thể xem lại toàn bộ câu hỏi và đáp án sau
					khi phê duyệt
				</CardDescription>
			</CardHeader>
			<CardContent className='space-y-4'>
				{list.length === 0 ? (
					<p className='text-muted-foreground text-sm'>
						{emptyHint ||
							'Không có câu hỏi dạng form (có thể chỉ đính kèm file).'}
					</p>
				) : (
					list.map((q, idx) => (
						<div
							key={q.id ?? idx}
							className='rounded-lg border bg-card p-4 shadow-sm'
						>
							<div className='mb-2 flex flex-wrap items-center justify-between gap-2'>
								<span className='text-sm font-semibold'>
									Câu {q.questionNumber ?? idx + 1}
								</span>
								<Badge variant='outline'>
									{q.points ?? 0} điểm
								</Badge>
							</div>
							<div className='mb-3'>
								<div className='text-muted-foreground mb-1 text-xs font-medium uppercase tracking-wide'>
									Nội dung câu hỏi
								</div>
								<p className='whitespace-pre-wrap text-sm leading-relaxed'>
									{q.content}
								</p>
							</div>
							{q.answer != null &&
							String(q.answer).trim() !== '' ? (
								<div className='rounded-md border border-emerald-500/30 bg-emerald-500/5 p-3'>
									<div className='mb-1 text-xs font-medium text-emerald-700 dark:text-emerald-400'>
										Đáp án
									</div>
									<p className='whitespace-pre-wrap text-sm leading-relaxed'>
										{q.answer}
									</p>
								</div>
							) : (
								<p className='text-muted-foreground text-xs italic'>
									(Chưa có đáp án hoặc bạn không có quyền xem
									đáp án)
								</p>
							)}
						</div>
					))
				)}
			</CardContent>
		</Card>
	)
}
