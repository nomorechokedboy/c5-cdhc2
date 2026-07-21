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
import type { Floor } from '@/types/asset'
import { useFloorMutations } from '@/hooks/useFloors'
import { toast } from 'sonner'

type Props = {
	open: boolean
	onOpenChange: (open: boolean) => void
	buildingId: number
	/** Mã tòa — dùng gợi ý mã tầng (vd. H + 1 → H1) */
	buildingCode?: string
	floor?: Floor | null
}

export default function FloorDialog({
	open,
	onOpenChange,
	buildingId,
	buildingCode,
	floor
}: Props) {
	const isEdit = !!floor
	const { create, update } = useFloorMutations()
	const [floorNumber, setFloorNumber] = useState(1)
	const [code, setCode] = useState('')
	const [name, setName] = useState('')
	const [description, setDescription] = useState('')

	useEffect(() => {
		if (floor) {
			setFloorNumber(floor.floorNumber)
			setCode(floor.code ?? '')
			setName(floor.name)
			setDescription(floor.description ?? '')
		} else {
			setFloorNumber(1)
			setCode(buildingCode ? `${buildingCode}1` : '')
			setName('')
			setDescription('')
		}
	}, [floor, open, buildingCode])

	// Gợi ý mã tầng khi đổi số tầng
	useEffect(() => {
		if (!isEdit && buildingCode) {
			setCode(`${buildingCode}${floorNumber}`)
		}
	}, [floorNumber, buildingCode, isEdit])

	const pending = create.isPending || update.isPending

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault()
		if (!name.trim()) {
			toast.error('Tên tầng là bắt buộc')
			return
		}
		try {
			const payload = {
				floorNumber,
				name,
				code: code.trim() || undefined,
				description
			}
			if (isEdit && floor) {
				await update.mutateAsync({ id: floor.id, body: payload })
				toast.success('Cập nhật tầng thành công')
			} else {
				await create.mutateAsync({ buildingId, ...payload })
				toast.success('Thêm tầng thành công')
			}
			onOpenChange(false)
		} catch (err) {
			toast.error(
				isEdit ? 'Cập nhật tầng thất bại' : 'Thêm tầng thất bại',
				{
					description: (err as Error).message
				}
			)
		}
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className='sm:max-w-md'>
				<DialogHeader>
					<DialogTitle>
						{isEdit ? 'Sửa tầng' : 'Thêm tầng'}
					</DialogTitle>
				</DialogHeader>
				<form className='space-y-4' onSubmit={handleSubmit}>
					<div className='grid grid-cols-2 gap-3'>
						<div className='space-y-2'>
							<Label htmlFor='floorNumber'>Số tầng *</Label>
							<Input
								id='floorNumber'
								type='number'
								value={floorNumber}
								onChange={(e) =>
									setFloorNumber(Number(e.target.value))
								}
								required
							/>
						</div>
						<div className='space-y-2'>
							<Label htmlFor='floorCode'>Mã tầng</Label>
							<Input
								id='floorCode'
								value={code}
								onChange={(e) => setCode(e.target.value)}
								placeholder='VD: H1'
							/>
						</div>
					</div>
					<div className='space-y-2'>
						<Label htmlFor='floorName'>Tên tầng *</Label>
						<Input
							id='floorName'
							value={name}
							onChange={(e) => setName(e.target.value)}
							placeholder='VD: Tầng 1'
							required
						/>
					</div>
					<div className='space-y-2'>
						<Label htmlFor='floorDesc'>Mô tả</Label>
						<Textarea
							id='floorDesc'
							value={description}
							onChange={(e) => setDescription(e.target.value)}
							rows={2}
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
