import {
	Card,
	CardHeader,
	CardTitle,
	CardFooter,
	CardDescription
} from '@/components/ui/card'
import type { Class } from '@/types'
import { Badge } from '@/components/ui/badge'
import { EllipsisText } from '@/components/data-table/ellipsis-text'
import { useNavigate } from '@tanstack/react-router'
import { toVNTz } from '@/lib/utils'
import { Pencil, Trash } from 'lucide-react'
import { useState } from 'react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import ClassEditForm from '@/components/ClassEditForm'
import { useDeleteClasses } from '@/hooks/useDeleteClasses'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'

interface ClassCardProps {
	data: Class
	onEdit?: (data: Class) => void
	onDelete?: (data: Class) => void
}

export default function ClassCard({ data, onEdit, onDelete }: ClassCardProps) {
	const [openEdit, setOpenEdit] = useState(false)
	const [openDelete, setOpenDelete] = useState(false)
	const deleteClassMutation = useDeleteClasses()
	const navigate = useNavigate()

	const handleDelete = async () => {
		try {
			await deleteClassMutation.mutateAsync([data.id])
			toast.success(`Đã xoá lớp "${data.name}" thành công!`)
			onDelete?.(data)
		} catch (error) {
			toast.error('Có lỗi xảy ra khi xoá lớp học')
		} finally {
			setOpenDelete(false)
		}
	}

	const handleCardClick = (e: React.MouseEvent) => {
		if ((e.target as HTMLElement).closest('button')) return
		navigate({ to: `/classes/${data.id}` })
	}

	const status = data.status
	const statusLabel =
		status === 'ongoing'
			? 'Đang diễn ra'
			: status === 'graduated'
				? 'Đã tốt nghiệp'
				: ''
	const statusVariant = status === 'ongoing' ? 'secondary' : 'destructive'

	return (
		<>
			<Card
				className='@container/card cursor-pointer relative group'
				onClick={handleCardClick}
			>
				<CardHeader className='flex items-center justify-between'>
					<div>
						<CardTitle className='text-2xl font-semibold tabular-nums @[250px]/card:text-3xl'>
							{data.name}{' '}
							{status && (
								<Badge
									variant={statusVariant}
									className='text-xs'
								>
									{statusLabel}
								</Badge>
							)}
						</CardTitle>
						<CardDescription>
							<EllipsisText>{data.description}</EllipsisText>
						</CardDescription>
					</div>
					<div
						className={`hidden gap-2 transition-all group-hover:flex self-start`}
					>
						<Button
							type='button'
							aria-label='Edit'
							title='Chỉnh sửa'
							variant='ghost'
							className='text-sky-600'
							size='icon'
							onClick={(e) => {
								e.stopPropagation()
								setOpenEdit(true)
							}}
						>
							<Pencil size={18} />
						</Button>
						<Button
							type='button'
							variant='ghost'
							aria-label='Delete'
							title='Xoá'
							className='text-destructive'
							size='icon'
							onClick={(e) => {
								e.stopPropagation()
								setOpenDelete(true)
							}}
						>
							<Trash size={18} />
						</Button>
					</div>
				</CardHeader>
				<CardFooter className='flex-col items-start gap-1.5 text-sm'>
					<div className='line-clamp-1 flex gap-2 font-medium'>
						Tổng số học viên: {data.studentCount}
					</div>
					<div className='text-muted-foreground'>
						Tạo ngày: {toVNTz(data.createdAt)}
					</div>
				</CardFooter>
			</Card>

			<Dialog open={openEdit} onOpenChange={setOpenEdit}>
				<DialogContent className='backdrop-blur-sm flex items-center justify-center'>
					<DialogTitle className='sr-only'>
						Chỉnh sửa lớp học
					</DialogTitle>
					<ClassEditForm
						classData={data}
						onUpdate={(updated) => {
							onEdit?.({ ...data, ...updated }) // truyền nguyên data kiểu Class
							setOpenEdit(false)
						}}
						onClose={() => setOpenEdit(false)}
					/>
				</DialogContent>
			</Dialog>

			<Dialog open={openDelete} onOpenChange={setOpenDelete}>
				<DialogContent className='max-w-md max-h-1/3'>
					<DialogTitle className='sr-only'>
						Xác nhận xoá lớp học
					</DialogTitle>
					<div className='flex flex-col gap-4'>
						<div className='font-semibold text-lg text-center'>
							Xác nhận xoá lớp học?
						</div>
						<div className='text-center text-muted-foreground'>
							Bạn có chắc muốn xoá lớp{' '}
							<b className='text-red-600'>{data.name}</b> không?
							<p>
								Hành động này <b>không thể hoàn tác.</b>
							</p>
						</div>
						<div className='flex justify-end gap-2 mt-4'>
							<button
								type='button'
								className='px-4 py-2 rounded-lg border'
								onClick={() => setOpenDelete(false)}
								disabled={deleteClassMutation.isPending}
							>
								Huỷ
							</button>
							<button
								type='button'
								className='px-4 py-2 rounded-lg bg-destructive text-white font-semibold hover:bg-destructive/90 disabled:opacity-50'
								onClick={handleDelete}
								disabled={deleteClassMutation.isPending}
							>
								{deleteClassMutation.isPending
									? 'Đang xoá...'
									: 'Xoá'}
							</button>
						</div>
					</div>
				</DialogContent>
			</Dialog>
		</>
	)
}
