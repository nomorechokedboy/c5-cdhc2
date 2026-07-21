import { Button } from '@/components/ui/button'
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import useUploadFiles from '@/hooks/useUploadFiles'
import type { CreateRoomImageBody } from '@/types/asset'
import { useState } from 'react'
import { toast } from 'sonner'

type Props = {
	open: boolean
	onOpenChange: (open: boolean) => void
	roomId: number
	onCreate: (body: CreateRoomImageBody) => Promise<void>
}

export default function RoomImageDialog({
	open,
	onOpenChange,
	roomId,
	onCreate
}: Props) {
	const upload = useUploadFiles()
	const [pending, setPending] = useState(false)
	const [title, setTitle] = useState('')
	const [description, setDescription] = useState('')
	const [imageUrl, setImageUrl] = useState('')
	const [file, setFile] = useState<File | null>(null)

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault()
		setPending(true)
		try {
			let url = imageUrl.trim()
			if (file) {
				const fd = new FormData()
				fd.append('file', file)
				// UploadFiles resolves to { uris: string[] }
				const resp = await upload.mutateAsync(fd)
				const uri = resp?.uris?.[0]
				if (!uri) throw new Error('Upload không trả về URI')
				url = uri
			}
			if (!url) {
				toast.error('Chọn file hoặc nhập URL ảnh')
				return
			}
			await onCreate({
				roomId,
				imageUrl: url,
				title: title || undefined,
				description: description || undefined
			})
			toast.success('Thêm ảnh thành công')
			setTitle('')
			setDescription('')
			setImageUrl('')
			setFile(null)
			onOpenChange(false)
		} catch (err) {
			toast.error('Thêm ảnh thất bại', {
				description: (err as Error).message
			})
		} finally {
			setPending(false)
		}
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className='sm:max-w-md'>
				<DialogHeader>
					<DialogTitle>Thêm hình ảnh phòng</DialogTitle>
				</DialogHeader>
				<form className='space-y-3' onSubmit={handleSubmit}>
					<div className='space-y-2'>
						<Label>Upload file</Label>
						<Input
							type='file'
							accept='image/*'
							onChange={(e) =>
								setFile(e.target.files?.[0] ?? null)
							}
						/>
					</div>
					<div className='space-y-2'>
						<Label>Hoặc URI / URL ảnh</Label>
						<Input
							value={imageUrl}
							onChange={(e) => setImageUrl(e.target.value)}
							placeholder='media key hoặc https://…'
						/>
					</div>
					<div className='space-y-2'>
						<Label>Tiêu đề</Label>
						<Input
							value={title}
							onChange={(e) => setTitle(e.target.value)}
						/>
					</div>
					<div className='space-y-2'>
						<Label>Mô tả</Label>
						<Textarea
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
						<Button
							type='submit'
							disabled={pending || upload.isPending}
						>
							{pending || upload.isPending
								? 'Đang lưu…'
								: 'Thêm ảnh'}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	)
}
