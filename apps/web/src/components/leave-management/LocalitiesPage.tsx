import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
	ChevronRight,
	Loader2,
	MapPin,
	Plus,
	Search,
	Trash2,
	Upload
} from 'lucide-react'
import { toast } from 'sonner'
import {
	CreateLeaveLocality,
	DeleteLeaveLocality,
	ListLeaveLocalities,
	type LeaveLocality,
	type LeaveLocalityLevel
} from '@/api/leave'
import ImportLocalitiesDialog from './ImportLocalitiesDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle
} from '@/components/ui/dialog'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { ScrollArea } from '@/components/ui/scroll-area'

const LEVEL_LABEL: Record<LeaveLocalityLevel, string> = {
	province: 'Tỉnh / TP',
	ward: 'Xã / Phường',
	village: 'Thôn'
}

export default function LocalitiesPage() {
	const qc = useQueryClient()
	const [open, setOpen] = useState(false)
	const [importOpen, setImportOpen] = useState(false)
	const [name, setName] = useState('')
	const [level, setLevel] = useState<LeaveLocalityLevel>('province')
	const [parentId, setParentId] = useState<string>('')
	const [selectedProvinceId, setSelectedProvinceId] = useState<number | null>(
		null
	)
	const [provinceSearch, setProvinceSearch] = useState('')
	const [wardSearch, setWardSearch] = useState('')

	const { data: tree = [], isLoading } = useQuery({
		queryKey: ['leave-localities-tree'],
		queryFn: () => ListLeaveLocalities({ tree: true })
	})

	const provinces = useMemo(() => {
		const list = tree.filter((n) => n.level === 'province')
		const q = provinceSearch.trim().toLowerCase()
		if (!q) return list
		return list.filter(
			(p) =>
				p.name.toLowerCase().includes(q) ||
				(p.code || '').toLowerCase().includes(q)
		)
	}, [tree, provinceSearch])

	const selectedProvince = useMemo(
		() => tree.find((p) => p.id === selectedProvinceId) || null,
		[tree, selectedProvinceId]
	)

	const wards = useMemo(() => {
		const kids = selectedProvince?.children || []
		const q = wardSearch.trim().toLowerCase()
		if (!q) return kids
		return kids.filter(
			(w) =>
				w.name.toLowerCase().includes(q) ||
				(w.code || '').toLowerCase().includes(q)
		)
	}, [selectedProvince, wardSearch])

	const totalWards = useMemo(
		() =>
			tree.reduce(
				(acc, p) =>
					acc +
					(p.children?.filter((c) => c.level === 'ward').length || 0),
				0
			),
		[tree]
	)

	const parentOptions = useMemo(() => {
		if (level === 'ward') return tree.filter((n) => n.level === 'province')
		if (level === 'village') {
			const out: LeaveLocality[] = []
			for (const p of tree) {
				for (const w of p.children || []) {
					if (w.level === 'ward') out.push(w)
				}
			}
			return out
		}
		return []
	}, [tree, level])

	const createMut = useMutation({
		mutationFn: () =>
			CreateLeaveLocality({
				name: name.trim(),
				level,
				parentId:
					level === 'province'
						? null
						: parentId
							? Number(parentId)
							: null
			}),
		onSuccess: () => {
			toast.success('Đã thêm địa phương')
			qc.invalidateQueries({ queryKey: ['leave-localities-tree'] })
			setOpen(false)
			setName('')
			setParentId('')
		},
		onError: (e: Error) => toast.error(e.message)
	})

	const delMut = useMutation({
		mutationFn: (id: number) => DeleteLeaveLocality(id),
		onSuccess: () => {
			toast.success('Đã xóa')
			qc.invalidateQueries({ queryKey: ['leave-localities-tree'] })
		},
		onError: (e: Error) => toast.error(e.message)
	})

	return (
		<div className='space-y-4'>
			<div className='flex flex-wrap items-end justify-between gap-3'>
				<div>
					<h2 className='text-2xl font-bold tracking-tight'>
						Danh sách địa phương
					</h2>
					<p className='text-sm text-muted-foreground'>
						Cây Tỉnh/Thành phố → Xã/Phường
						{!isLoading && (
							<>
								{' '}
								· {tree.length} tỉnh/TP · {totalWards} xã/phường
							</>
						)}
					</p>
				</div>
				<div className='flex gap-2'>
					<Button
						variant='outline'
						onClick={() => setImportOpen(true)}
					>
						<Upload className='mr-1 h-4 w-4' />
						Import xã/phường
					</Button>
					<Button onClick={() => setOpen(true)}>
						<Plus className='mr-1 h-4 w-4' />
						Thêm
					</Button>
				</div>
			</div>

			<div className='grid min-h-[480px] gap-4 md:grid-cols-[320px_1fr]'>
				{/* Province list */}
				<div className='flex flex-col rounded-md border'>
					<div className='border-b p-3'>
						<div className='relative'>
							<Search className='absolute top-2.5 left-2.5 h-4 w-4 text-muted-foreground' />
							<Input
								className='pl-8'
								placeholder='Tìm tỉnh / thành phố…'
								value={provinceSearch}
								onChange={(e) =>
									setProvinceSearch(e.target.value)
								}
							/>
						</div>
					</div>
					<ScrollArea className='h-[440px]'>
						{isLoading && (
							<div className='flex justify-center p-8'>
								<Loader2 className='h-5 w-5 animate-spin' />
							</div>
						)}
						{!isLoading && provinces.length === 0 && (
							<p className='p-4 text-center text-sm text-muted-foreground'>
								Chưa có tỉnh/TP — import file 3321 xã/phường
							</p>
						)}
						<ul className='p-1'>
							{provinces.map((p) => {
								const count = p.children?.length || 0
								const active = selectedProvinceId === p.id
								return (
									<li key={p.id}>
										<button
											type='button'
											onClick={() => {
												setSelectedProvinceId(p.id)
												setWardSearch('')
											}}
											className={cn(
												'flex w-full items-center gap-2 rounded-md px-3 py-2.5 text-left text-sm transition-colors',
												active
													? 'bg-primary text-primary-foreground'
													: 'hover:bg-muted'
											)}
										>
											<MapPin className='h-4 w-4 shrink-0 opacity-70' />
											<span className='min-w-0 flex-1 truncate font-medium'>
												{p.name}
											</span>
											{p.code && (
												<span
													className={cn(
														'font-mono text-xs',
														active
															? 'opacity-80'
															: 'text-muted-foreground'
													)}
												>
													{p.code}
												</span>
											)}
											<Badge
												variant={
													active
														? 'secondary'
														: 'outline'
												}
												className='shrink-0'
											>
												{count}
											</Badge>
											<ChevronRight className='h-4 w-4 shrink-0 opacity-60' />
										</button>
									</li>
								)
							})}
						</ul>
					</ScrollArea>
				</div>

				{/* Detail: wards of selected province */}
				<div className='flex flex-col rounded-md border'>
					{!selectedProvince ? (
						<div className='flex flex-1 flex-col items-center justify-center gap-2 p-8 text-muted-foreground'>
							<MapPin className='h-10 w-10 opacity-40' />
							<p className='text-sm'>
								Chọn một tỉnh / thành phố bên trái để xem danh
								sách xã / phường
							</p>
						</div>
					) : (
						<>
							<div className='space-y-2 border-b p-4'>
								<div className='flex flex-wrap items-start justify-between gap-2'>
									<div>
										<h3 className='text-lg font-semibold'>
											{selectedProvince.name}
										</h3>
										<p className='text-sm text-muted-foreground'>
											Gồm{' '}
											<strong>
												{selectedProvince.children
													?.length || 0}
											</strong>{' '}
											xã / phường / đặc khu
											{selectedProvince.code
												? ` · Mã TP: ${selectedProvince.code}`
												: ''}
										</p>
									</div>
									<Button
										size='sm'
										variant='ghost'
										className='text-destructive'
										onClick={() => {
											if (
												confirm(
													`Xóa ${selectedProvince.name}? (cần xóa hết xã con trước)`
												)
											) {
												delMut.mutate(
													selectedProvince.id,
													{
														onSuccess: () =>
															setSelectedProvinceId(
																null
															)
													}
												)
											}
										}}
									>
										<Trash2 className='mr-1 h-4 w-4' />
										Xóa tỉnh
									</Button>
								</div>
								<div className='relative'>
									<Search className='absolute top-2.5 left-2.5 h-4 w-4 text-muted-foreground' />
									<Input
										className='pl-8'
										placeholder='Lọc xã / phường…'
										value={wardSearch}
										onChange={(e) =>
											setWardSearch(e.target.value)
										}
									/>
								</div>
							</div>
							<ScrollArea className='h-[380px]'>
								{wards.length === 0 ? (
									<p className='p-6 text-center text-sm text-muted-foreground'>
										Không có xã/phường
										{wardSearch ? ' khớp tìm kiếm' : ''}
									</p>
								) : (
									<table className='w-full text-sm'>
										<thead className='sticky top-0 bg-background'>
											<tr className='border-b text-left text-muted-foreground'>
												<th className='px-4 py-2 font-medium'>
													Mã
												</th>
												<th className='px-4 py-2 font-medium'>
													Tên
												</th>
												<th className='px-4 py-2 font-medium'>
													Cấp
												</th>
												<th className='w-12 px-2' />
											</tr>
										</thead>
										<tbody>
											{wards.map((w) => (
												<tr
													key={w.id}
													className='border-b last:border-0 hover:bg-muted/40'
												>
													<td className='px-4 py-2 font-mono text-xs'>
														{w.code || '—'}
													</td>
													<td className='px-4 py-2'>
														{w.name}
														{(w.children?.length ||
															0) > 0 && (
															<span className='ml-2 text-xs text-muted-foreground'>
																(
																{
																	w.children!
																		.length
																}{' '}
																thôn)
															</span>
														)}
													</td>
													<td className='px-4 py-2'>
														<Badge variant='outline'>
															{LEVEL_LABEL[
																w.level
															] || w.level}
														</Badge>
													</td>
													<td className='px-2 py-1'>
														<Button
															size='icon'
															variant='ghost'
															onClick={() => {
																if (
																	confirm(
																		`Xóa ${w.name}?`
																	)
																)
																	delMut.mutate(
																		w.id
																	)
															}}
														>
															<Trash2 className='h-4 w-4 text-destructive' />
														</Button>
													</td>
												</tr>
											))}
										</tbody>
									</table>
								)}
							</ScrollArea>
						</>
					)}
				</div>
			</div>

			<Dialog open={open} onOpenChange={setOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Thêm địa phương</DialogTitle>
					</DialogHeader>
					<div className='grid gap-3 py-2'>
						<div>
							<Label>Cấp</Label>
							<Select
								value={level}
								onValueChange={(v) => {
									setLevel(v as LeaveLocalityLevel)
									setParentId('')
								}}
							>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value='province'>
										Tỉnh / Thành phố
									</SelectItem>
									<SelectItem value='ward'>
										Xã / Phường
									</SelectItem>
									<SelectItem value='village'>
										Thôn
									</SelectItem>
								</SelectContent>
							</Select>
						</div>
						{level !== 'province' && (
							<div>
								<Label>
									{level === 'ward'
										? 'Thuộc tỉnh / TP'
										: 'Thuộc xã/phường'}
								</Label>
								<Select
									value={parentId}
									onValueChange={setParentId}
								>
									<SelectTrigger>
										<SelectValue placeholder='Chọn…' />
									</SelectTrigger>
									<SelectContent>
										{parentOptions.map((p) => (
											<SelectItem
												key={p.id}
												value={String(p.id)}
											>
												{p.name}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
						)}
						<div>
							<Label>Tên</Label>
							<Input
								value={name}
								onChange={(e) => setName(e.target.value)}
							/>
						</div>
					</div>
					<DialogFooter>
						<Button
							variant='outline'
							onClick={() => setOpen(false)}
						>
							Hủy
						</Button>
						<Button
							disabled={
								createMut.isPending ||
								!name.trim() ||
								(level !== 'province' && !parentId)
							}
							onClick={() => createMut.mutate()}
						>
							{createMut.isPending && (
								<Loader2 className='mr-1 h-4 w-4 animate-spin' />
							)}
							Lưu
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<ImportLocalitiesDialog
				open={importOpen}
				onOpenChange={setImportOpen}
			/>
		</div>
	)
}
