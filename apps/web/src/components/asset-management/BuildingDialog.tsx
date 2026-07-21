import { useEffect, useState } from 'react'
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { Building, CreateBuildingBody } from '@/types/asset'
import { useBuildingMutations } from '@/hooks/useBuildings'
import { toast } from 'sonner'

type Props = {
	open: boolean
	onOpenChange: (open: boolean) => void
	building?: Building | null
}

export default function BuildingDialog({
	open,
	onOpenChange,
	building
}: Props) {
	const isEdit = !!building
	const { create, update } = useBuildingMutations()
	const [form, setForm] = useState<CreateBuildingBody>({
		code: '',
		name: '',
		managerCode: '',
		area: '',
		address: '',
		description: ''
	})

	useEffect(() => {
		if (building) {
			setForm({
				code: building.code,
				name: building.name,
				managerCode: building.managerCode ?? '',
				area: building.area ?? '',
				address: building.address ?? '',
				description: building.description ?? ''
			})
		} else {
			setForm({
				code: '',
				name: '',
				managerCode: '',
				area: '',
				address: '',
				description: ''
			})
		}
	}, [building, open])

	const pending = create.isPending || update.isPending

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault()
		if (!form.code.trim() || !form.name.trim()) {
			toast.error('Mã và tên tòa nhà là bắt buộc')
			return
		}
		const body = {
			...form,
			managerCode: form.managerCode || undefined,
			area: form.area || undefined
		}
		try {
			if (isEdit && building) {
				await update.mutateAsync({ id: building.id, body })
				toast.success('Cập nhật tòa nhà thành công')
			} else {
				await create.mutateAsync(body)
				toast.success('Thêm tòa nhà thành công')
			}
			onOpenChange(false)
		} catch (err) {
			toast.error(
				isEdit ? 'Cập nhật tòa nhà thất bại' : 'Thêm tòa nhà thất bại',
				{ description: (err as Error).message }
			)
		}
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className='sm:max-w-md'>
				<DialogHeader>
					<DialogTitle>
						{isEdit ? 'Sửa tòa nhà' : 'Thêm tòa nhà'}
					</DialogTitle>
				</DialogHeader>
				<form className='space-y-4' onSubmit={handleSubmit}>
					<div className='grid grid-cols-2 gap-3'>
						<div className='space-y-2'>
							<Label htmlFor='code'>Mã tòa *</Label>
							<Input
								id='code'
								value={form.code}
								onChange={(e) =>
									setForm((f) => ({
										...f,
										code: e.target.value
									}))
								}
								placeholder='VD: H'
								required
							/>
						</div>
						<div className='space-y-2'>
							<Label htmlFor='managerCode'>
								Mã người quản lý
							</Label>
							<Input
								id='managerCode'
								value={form.managerCode}
								onChange={(e) =>
									setForm((f) => ({
										...f,
										managerCode: e.target.value
									}))
								}
								placeholder='VD: QL001'
							/>
						</div>
					</div>
					<div className='space-y-2'>
						<Label htmlFor='name'>Tên tòa *</Label>
						<Input
							id='name'
							value={form.name}
							onChange={(e) =>
								setForm((f) => ({ ...f, name: e.target.value }))
							}
							placeholder='VD: Tòa H'
							required
						/>
					</div>
					<div className='space-y-2'>
						<Label htmlFor='area'>Khu vực</Label>
						<Input
							id='area'
							value={form.area}
							onChange={(e) =>
								setForm((f) => ({ ...f, area: e.target.value }))
							}
							placeholder='VD: Khu A'
						/>
					</div>
					<div className='space-y-2'>
						<Label htmlFor='address'>Địa chỉ</Label>
						<Input
							id='address'
							value={form.address}
							onChange={(e) =>
								setForm((f) => ({
									...f,
									address: e.target.value
								}))
							}
						/>
					</div>
					<div className='space-y-2'>
						<Label htmlFor='description'>Mô tả</Label>
						<Textarea
							id='description'
							value={form.description}
							onChange={(e) =>
								setForm((f) => ({
									...f,
									description: e.target.value
								}))
							}
							rows={3}
						/>
					</div>
					<DialogFooter>
						<Button
							type='button'
							variant='outline'
							onClick={() => onOpenChange(false)}
						>
							Hủy
						</Button>
						<Button type='submit' disabled={pending}>
							{pending
								? 'Đang lưu…'
								: isEdit
									? 'Cập nhật'
									: 'Thêm'}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	)
}
