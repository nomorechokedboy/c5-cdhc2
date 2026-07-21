import useAuth from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { useRef, useState } from 'react'
import ProfileEditForm from './profile-edit-form'
import PasswordChangeForm from './password-change-form'
import dayjs from 'dayjs'
import {
	Edit,
	KeyRound,
	User,
	Award,
	Briefcase,
	Building2,
	UserCircle,
	Calendar,
	Clock,
	PenLine,
	Loader2,
	Upload
} from 'lucide-react'
import { UpdateMySignature } from '@/api'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
	extractSignatureFromImage,
	fileToDataUrl
} from '@/lib/signature-extract'

export default function ProfileView() {
	const { user } = useAuth()
	const qc = useQueryClient()
	const [editOpen, setEditOpen] = useState(false)
	const [passwordOpen, setPasswordOpen] = useState(false)
	const [sigBusy, setSigBusy] = useState(false)
	const [sigPreview, setSigPreview] = useState<string | null>(null)
	const fileRef = useRef<HTMLInputElement>(null)

	if (!user) return <div>Loading...</div>

	const signatureUrl =
		(user as { signatureUrl?: string | null }).signatureUrl?.trim() || ''
	const hasSignature =
		!!signatureUrl &&
		signatureUrl.length > 40 &&
		!signatureUrl.includes('placeholder')

	async function onPickSignature(file: File | null) {
		if (!file) return
		if (!file.type.startsWith('image/')) {
			toast.error('Chỉ nhận ảnh PNG/JPG')
			return
		}
		setSigBusy(true)
		try {
			// Trích nét chữ ký, bỏ nền trắng → PNG trong suốt
			const extracted = await extractSignatureFromImage(file)
			setSigPreview(extracted)
			await UpdateMySignature(extracted)
			await qc.invalidateQueries({ queryKey: ['auth', 'user'] })
			await qc.invalidateQueries({ queryKey: ['auth-me-signature'] })
			toast.success(
				'Đã lưu chữ ký (nền trong suốt) — dùng tự động khi duyệt / in form'
			)
		} catch (e) {
			// fallback: lưu raw nếu extract thất bại (ảnh đã transparent)
			try {
				const raw = await fileToDataUrl(file)
				await UpdateMySignature(raw)
				setSigPreview(raw)
				await qc.invalidateQueries({ queryKey: ['auth', 'user'] })
				await qc.invalidateQueries({ queryKey: ['auth-me-signature'] })
				toast.warning(
					e instanceof Error
						? `${e.message} — đã lưu ảnh gốc`
						: 'Đã lưu ảnh gốc'
				)
			} catch (e2) {
				toast.error(
					e2 instanceof Error ? e2.message : 'Lưu chữ ký thất bại'
				)
			}
		} finally {
			setSigBusy(false)
			if (fileRef.current) fileRef.current.value = ''
		}
	}

	const displaySig = sigPreview || signatureUrl || null

	return (
		<div className='space-y-6'>
			{/* Action Buttons */}
			<div className='flex flex-wrap gap-3'>
				<Button
					onClick={() => setEditOpen(true)}
					className='flex items-center gap-2'
				>
					<Edit className='w-4 h-4' />
					Chỉnh sửa thông tin
				</Button>
				<Button
					variant='outline'
					onClick={() => setPasswordOpen(true)}
					className='flex items-center gap-2'
				>
					<KeyRound className='w-4 h-4' />
					Đổi mật khẩu
				</Button>
			</div>

			{/* Profile Information Table */}
			<div className='rounded-md border'>
				<div className='p-6 space-y-6'>
					{/* Personal Information Section */}
					<div>
						<h3 className='text-lg font-semibold mb-4'>
							Thông tin cá nhân
						</h3>
						<div className='grid grid-cols-2 md:grid-cols-4 gap-6'>
							<InfoRow
								icon={<User className='w-4 h-4' />}
								label='Họ và tên'
								value={user.displayName}
							/>
							<InfoRow
								icon={<Award className='w-4 h-4' />}
								label='Cấp bậc'
								value={user.rank || '—'}
							/>
							<InfoRow
								icon={<Briefcase className='w-4 h-4' />}
								label='Chức vụ'
								value={user.position || '—'}
							/>
							<InfoRow
								icon={<Building2 className='w-4 h-4' />}
								label='Đơn vị'
								value={user.unitName || '—'}
							/>
						</div>
					</div>

					<Separator />

					{/* Chữ ký số — mọi tài khoản tự tải / đổi */}
					<div>
						<h3 className='mb-1 flex items-center gap-2 text-lg font-semibold'>
							<PenLine className='h-5 w-5' />
							Chữ ký số
						</h3>
						<p className='text-muted-foreground mb-4 text-sm'>
							Tải ảnh chữ ký (nền trắng). Hệ thống{' '}
							<strong>chỉ lấy nét chữ ký</strong> (nền trong
							suốt), tự dán khi duyệt đề / in form giấy.
						</p>
						<div className='flex flex-wrap items-start gap-6'>
							<div className='flex min-h-[100px] min-w-[200px] items-center justify-center rounded-md border border-dashed bg-white p-3 dark:bg-zinc-950'>
								{displaySig ? (
									<img
										src={displaySig}
										alt='Chữ ký'
										className='max-h-24 max-w-[220px] object-contain'
										style={{ background: 'transparent' }}
									/>
								) : (
									<span className='text-muted-foreground text-xs'>
										Chưa có chữ ký
									</span>
								)}
							</div>
							<div className='space-y-2'>
								<input
									ref={fileRef}
									type='file'
									accept='image/png,image/jpeg,image/webp'
									className='hidden'
									onChange={(e) =>
										void onPickSignature(
											e.target.files?.[0] || null
										)
									}
								/>
								<Button
									type='button'
									variant={
										hasSignature ? 'outline' : 'default'
									}
									disabled={sigBusy}
									onClick={() => fileRef.current?.click()}
								>
									{sigBusy ? (
										<Loader2 className='mr-2 h-4 w-4 animate-spin' />
									) : (
										<Upload className='mr-2 h-4 w-4' />
									)}
									{hasSignature ? 'Đổi chữ ký' : 'Tải chữ ký'}
								</Button>
								<p className='text-muted-foreground max-w-xs text-xs'>
									PNG/JPG · nền trắng · tối đa ~2MB. Sau khi
									lưu, mọi form cần chữ ký sẽ dùng bản đã
									trích nét (không dán cả khung ảnh).
								</p>
							</div>
						</div>
					</div>

					<Separator />

					{/* Login Information Section */}
					<div>
						<h3 className='text-lg font-semibold mb-4'>
							Thông tin đăng nhập
						</h3>
						<div className='grid grid-cols-2 md:grid-cols-4 gap-6'>
							<InfoRow
								icon={<UserCircle className='w-4 h-4' />}
								label='Tên tài khoản'
								value={user.username}
							/>
						</div>
					</div>

					<Separator />

					{/* System Information Section */}
					<div>
						<h3 className='text-lg font-semibold mb-4'>
							Thông tin hệ thống
						</h3>
						<div className='grid grid-cols-2 md:grid-cols-4 gap-6'>
							<InfoRow
								icon={<Calendar className='w-4 h-4' />}
								label='Ngày tạo'
								value={dayjs(user.createdAt).format(
									'DD/MM/YYYY HH:mm:ss'
								)}
							/>
							<InfoRow
								icon={<Clock className='w-4 h-4' />}
								label='Ngày cập nhật'
								value={dayjs(user.updatedAt).format(
									'DD/MM/YYYY HH:mm:ss'
								)}
							/>
						</div>
					</div>
				</div>
			</div>

			{/* Edit Forms */}
			<ProfileEditForm
				open={editOpen}
				setOpen={setEditOpen}
				user={user}
			/>
			<PasswordChangeForm open={passwordOpen} setOpen={setPasswordOpen} />
		</div>
	)
}

function InfoRow({
	icon,
	label,
	value
}: {
	icon?: React.ReactNode
	label: string
	value: string
}) {
	return (
		<div className='space-y-2'>
			<div className='flex items-center gap-2 text-muted-foreground'>
				{icon}
				<p className='text-sm font-medium'>{label}</p>
			</div>
			<p className='text-sm font-semibold'>{value}</p>
		</div>
	)
}
