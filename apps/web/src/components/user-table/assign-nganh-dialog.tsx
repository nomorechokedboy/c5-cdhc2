/**
 * Admin gán ngành danh mục (HC2A…) cho user — chỉ 1 ngành.
 */
import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { AssignUserNganh, GetAssetCatalog, GetUserNganh } from '@/api/asset'
import { nganhLabel } from '@/lib/nganh'
import { Button } from '@/components/ui/button'
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { SearchableSelect } from '@/components/ui/searchable-select'
import type { User } from '@/types'

type Props = {
	open: boolean
	onOpenChange: (open: boolean) => void
	user: User | null
}

export default function AssignNganhDialog({ open, onOpenChange, user }: Props) {
	const qc = useQueryClient()
	const [nganhCode, setNganhCode] = useState('')

	const catalogQ = useQuery({
		queryKey: ['asset-catalog', 'nganh-only'],
		queryFn: () => GetAssetCatalog(),
		enabled: open
	})

	const userNganhQ = useQuery({
		queryKey: ['user-nganh', user?.id],
		queryFn: () => GetUserNganh(user!.id),
		enabled: open && !!user?.id
	})

	useEffect(() => {
		const codes = userNganhQ.data?.nganhCodes || []
		// Chỉ lấy 1 ngành (nếu user cũ có nhiều — giữ cái đầu)
		setNganhCode(codes[0] ? codes[0].toUpperCase() : '')
	}, [userNganhQ.data])

	const nganhOptions = useMemo(() => {
		const list = catalogQ.data?.nganh ?? []
		return list.map((n) => ({
			value: n.code.toUpperCase(),
			label: `${n.code} — ${nganhLabel(n)}`,
			keywords: `${n.code} ${n.name}`
		}))
	}, [catalogQ.data])

	const mut = useMutation({
		mutationFn: AssignUserNganh,
		onSuccess: async (data) => {
			toast.success(
				`Đã gán ngành ${data.nganhCodes[0] || '—'} cho ${user?.displayName || user?.username}`
			)
			await qc.invalidateQueries({ queryKey: ['user-nganh'] })
			await qc.invalidateQueries({ queryKey: ['my-nganh'] })
			await qc.invalidateQueries({ queryKey: ['users'] })
			onOpenChange(false)
		},
		onError: (e: Error) => toast.error(e.message || 'Gán ngành thất bại')
	})

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className='max-w-md'>
				<DialogHeader>
					<DialogTitle>
						Gán ngành — {user?.displayName || user?.username}
					</DialogTitle>
				</DialogHeader>
				<p className='text-sm text-muted-foreground'>
					Mỗi tài khoản ngành chỉ gán <strong>một</strong> ngành.
				</p>
				{catalogQ.isLoading || userNganhQ.isLoading ? (
					<div className='space-y-2 py-4'>
						<Skeleton className='h-8 w-full' />
						<Skeleton className='h-8 w-full' />
					</div>
				) : (
					<div className='space-y-1.5 py-2'>
						<Label>
							Ngành <span className='text-destructive'>*</span>
						</Label>
						<SearchableSelect
							value={nganhCode}
							onValueChange={setNganhCode}
							options={nganhOptions}
							placeholder='Chọn 1 ngành…'
							searchPlaceholder='Gõ HC2A…'
							emptyText='Không có ngành'
						/>
					</div>
				)}
				<DialogFooter>
					<Button
						variant='outline'
						onClick={() => onOpenChange(false)}
					>
						Hủy
					</Button>
					<Button
						disabled={!user || mut.isPending || !nganhCode}
						onClick={() => {
							if (!user || !nganhCode) return
							mut.mutate({
								userId: user.id,
								nganhCodes: [nganhCode.toUpperCase()]
							})
						}}
					>
						{mut.isPending ? 'Đang lưu…' : 'Lưu ngành'}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
