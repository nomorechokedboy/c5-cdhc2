/**
 * Import lớp từ khóa Moodle (học chung khóa) — bảng hàng ngang, chọn nhiều.
 */
import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Download, Loader2, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { ImportMoodleClasses, ListMoodleCourses, MoodleDbStatus } from '@/api'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger
} from '@/components/ui/dialog'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'

type Props = {
	unitId: number | undefined
	onSuccess?: () => void
}

export default function ImportMoodleClassesDialog({
	unitId,
	onSuccess
}: Props) {
	const [open, setOpen] = useState(false)
	const [selected, setSelected] = useState<Set<number>>(new Set())

	const statusQ = useQuery({
		queryKey: ['moodle-status'],
		queryFn: () => MoodleDbStatus(),
		enabled: open,
		staleTime: 15_000
	})

	const listQ = useQuery({
		queryKey: ['moodle-courses', unitId],
		queryFn: () => ListMoodleCourses(unitId),
		enabled: open && unitId != null,
		staleTime: 30_000
	})

	const importMut = useMutation({
		mutationFn: (courseIds: number[]) =>
			ImportMoodleClasses(unitId!, courseIds),
		onSuccess: (resp) => {
			const n = resp.imported
			const sk = resp.skipped
			if (n > 0) {
				toast.success(
					`Đã thêm ${n} lớp từ Moodle` +
						(sk > 0 ? ` (bỏ qua ${sk} đã có / không hợp lệ)` : '')
				)
			} else {
				toast.message(
					sk > 0
						? `Không thêm mới (bỏ qua ${sk} khóa đã import hoặc trùng)`
						: 'Không có lớp nào được thêm'
				)
			}
			setSelected(new Set())
			listQ.refetch()
			onSuccess?.()
			if (n > 0) setOpen(false)
		},
		onError: (e: Error) => {
			toast.error(e?.message || 'Import lớp từ Moodle thất bại')
		}
	})

	const rows = listQ.data?.data ?? []
	const selectable = rows.filter((r) => !r.alreadyImported)

	const toggle = (id: number, disabled: boolean) => {
		if (disabled) return
		setSelected((prev) => {
			const next = new Set(prev)
			if (next.has(id)) next.delete(id)
			else next.add(id)
			return next
		})
	}

	const toggleAll = (on: boolean) => {
		if (!on) {
			setSelected(new Set())
			return
		}
		setSelected(new Set(selectable.map((r) => r.id)))
	}

	const allSelected =
		selectable.length > 0 && selectable.every((r) => selected.has(r.id))

	return (
		<Dialog
			open={open}
			onOpenChange={(v) => {
				setOpen(v)
				if (!v) setSelected(new Set())
			}}
		>
			<DialogTrigger asChild>
				<Button variant='outline' disabled={unitId == null}>
					<Download className='w-4 h-4 mr-2' />
					Thêm từ Moodle
				</Button>
			</DialogTrigger>
			<DialogContent className='sm:max-w-3xl max-h-[85vh] flex flex-col'>
				<DialogHeader>
					<DialogTitle>
						Thêm lớp từ khóa Moodle (học chung khóa)
					</DialogTitle>
					<p className='text-sm text-muted-foreground'>
						Chọn khóa trên Moodle — import thành lớp của đại đội
						hiện tại (bảng ngang). Khóa đã thêm sẽ bị bỏ qua.
					</p>
				</DialogHeader>

				<div className='rounded-md border bg-muted/40 px-3 py-2 text-xs space-y-1'>
					{statusQ.isLoading ? (
						<p className='text-muted-foreground'>
							Đang kiểm tra kết nối…
						</p>
					) : statusQ.data?.ok ? (
						<p className='text-green-700 dark:text-green-400'>
							Đã kết nối MariaDB {statusQ.data.version} ·{' '}
							{statusQ.data.user}@{statusQ.data.host}:
							{statusQ.data.port}/{statusQ.data.database} ·{' '}
							{statusQ.data.courseCount ?? 0} khóa Moodle
						</p>
					) : (
						<p className='text-destructive'>
							Chưa kết nối: {statusQ.data?.error || 'unknown'} ·{' '}
							{statusQ.data
								? `${statusQ.data.user}@${statusQ.data.host}:${statusQ.data.port}/${statusQ.data.database} (passwordSet=${statusQ.data.passwordSet})`
								: '—'}
						</p>
					)}
					<p className='text-muted-foreground'>
						{listQ.data?.message ||
							(rows.length
								? `${rows.length} khóa · đã chọn ${selected.size}`
								: '')}
					</p>
				</div>

				<div className='flex items-center justify-end gap-2'>
					<Button
						type='button'
						variant='ghost'
						size='sm'
						onClick={() => {
							statusQ.refetch()
							listQ.refetch()
						}}
						disabled={listQ.isFetching || statusQ.isFetching}
					>
						<RefreshCw
							className={`w-4 h-4 ${listQ.isFetching || statusQ.isFetching ? 'animate-spin' : ''}`}
						/>
					</Button>
				</div>

				<div className='flex-1 overflow-auto border rounded-md min-h-[200px]'>
					{listQ.isLoading ? (
						<div className='flex items-center justify-center py-12 text-muted-foreground gap-2'>
							<Loader2 className='w-5 h-5 animate-spin' />
							Đang tải khóa Moodle…
						</div>
					) : rows.length === 0 ? (
						<div className='py-12 text-center text-sm text-muted-foreground px-4'>
							{listQ.data?.message ||
								'Không có khóa Moodle. Kiểm tra MARIADB_* hoặc dữ liệu mdl_course.'}
						</div>
					) : (
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead className='w-10'>
										<Checkbox
											checked={allSelected}
											onCheckedChange={(v) =>
												toggleAll(!!v)
											}
											aria-label='Chọn tất cả'
										/>
									</TableHead>
									<TableHead className='w-20'>ID</TableHead>
									<TableHead>Tên khóa (lớp)</TableHead>
									<TableHead className='w-32'>Mã</TableHead>
									<TableHead className='w-28'>
										Trạng thái
									</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{rows.map((r) => (
									<TableRow
										key={r.id}
										data-state={
											selected.has(r.id)
												? 'selected'
												: undefined
										}
										className={
											r.alreadyImported
												? 'opacity-60'
												: 'cursor-pointer'
										}
										onClick={() =>
											toggle(r.id, r.alreadyImported)
										}
									>
										<TableCell
											onClick={(e) => e.stopPropagation()}
										>
											<Checkbox
												checked={selected.has(r.id)}
												disabled={r.alreadyImported}
												onCheckedChange={() =>
													toggle(
														r.id,
														r.alreadyImported
													)
												}
											/>
										</TableCell>
										<TableCell className='font-mono text-xs'>
											{r.id}
										</TableCell>
										<TableCell className='font-medium'>
											{r.fullname}
										</TableCell>
										<TableCell className='text-muted-foreground text-sm'>
											{r.shortname || '—'}
										</TableCell>
										<TableCell>
											{r.alreadyImported ? (
												<Badge variant='secondary'>
													Đã thêm
												</Badge>
											) : (
												<Badge variant='outline'>
													Chưa thêm
												</Badge>
											)}
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					)}
				</div>

				<DialogFooter>
					<Button variant='outline' onClick={() => setOpen(false)}>
						Đóng
					</Button>
					<Button
						disabled={
							selected.size === 0 ||
							importMut.isPending ||
							unitId == null
						}
						onClick={() => importMut.mutate([...selected])}
					>
						{importMut.isPending && (
							<Loader2 className='w-4 h-4 mr-2 animate-spin' />
						)}
						Thêm{' '}
						{selected.size > 0 ? `${selected.size} lớp` : 'lớp'}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
