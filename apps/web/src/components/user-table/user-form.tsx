/**
 * Form thêm người dùng — bắt buộc chọn loại:
 * - Ban Giám Hiệu → role admin (phê duyệt đề xuất)
 * - Tài khoản ngành → 1 ngành + role user_nganh
 * - Tài khoản đơn vị sử dụng → đơn vị + role user_don_vi
 * - Chủ nhiệm khoa → 1 khoa + role exam_dept_head (không đơn vị; chức vụ khóa)
 * - Giáo viên → 1 khoa + role exam_lecturer + danh mục GV (không đơn vị; chức vụ khóa)
 */
import { useEffect, useMemo, useState } from 'react'
import {
	Dialog,
	DialogHeader,
	DialogContent,
	DialogTitle,
	DialogFooter
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '@/components/ui/select'
import { AssignRolesToUser, CreateUser, GetRoles, UpdateUser } from '@/api'
import { AssignUserNganh, GetAssetCatalog } from '@/api/asset'
import {
	CreateExamTeacherCatalog,
	ListExamFacultyOptions,
	UpsertExamFacultyHead
} from '@/api/exam'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { User, UserBody } from '@/types'
import { toast } from 'sonner'
import useUnitsData from '@/hooks/useUnitsData'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { Loader2 } from 'lucide-react'
import { nganhLabel } from '@/lib/nganh'
import {
	AssignLeaveAccount,
	ListLeavePersonnel,
	ListLeaveUnits
} from '@/api/leave'

export interface UserFormProps {
	onSuccess: (data: User[], variables: UserBody, context: unknown) => unknown
	open: boolean
	setOpen: (open: boolean) => void
}

type AccountKind =
	| 'bgh'
	| 'nganh'
	| 'don_vi'
	| 'cnk'
	| 'giang_vien'
	| 'leave_personnel'
	| 'leave_commander'
	| 'leave_management'

export default function UserForm({ onSuccess, open, setOpen }: UserFormProps) {
	const qc = useQueryClient()
	const { data: unitsData = [] } = useUnitsData()
	const rolesQ = useQuery({ queryKey: ['roles'], queryFn: GetRoles })
	const catalogQ = useQuery({
		queryKey: ['asset-catalog', 'user-form-nganh'],
		queryFn: () => GetAssetCatalog(),
		enabled: open
	})
	const facultyQ = useQuery({
		queryKey: ['exam-faculty-options', 'user-form'],
		queryFn: () => ListExamFacultyOptions(),
		enabled: open
	})
	const leavePersonnelQ = useQuery({
		queryKey: ['leave-personnel', 'user-form'],
		queryFn: () => ListLeavePersonnel(),
		enabled: open
	})
	const leaveUnitsQ = useQuery({
		queryKey: ['leave-units', 'user-form'],
		queryFn: () => ListLeaveUnits({ activeOnly: true }),
		enabled: open
	})

	const [accountKind, setAccountKind] = useState<AccountKind | ''>('')
	const [username, setUsername] = useState('')
	const [displayName, setDisplayName] = useState('')
	const [password, setPassword] = useState('')
	const [unitId, setUnitId] = useState('')
	/** TK ngành: chỉ 1 ngành */
	const [nganhCode, setNganhCode] = useState('')
	/** CNK / GV: 1 khoa */
	const [facultyCode, setFacultyCode] = useState('')
	/** Role / phân quyền chọn từ danh sách hiện có */
	const [roleId, setRoleId] = useState('')
	const [personnelId, setPersonnelId] = useState('')
	const [leaveUnitId, setLeaveUnitId] = useState('')
	const [managementArea, setManagementArea] = useState<
		'cán_bộ' | 'quân_lực' | ''
	>('')
	const [pending, setPending] = useState(false)

	const unitOptions = useMemo(() => {
		const list: { value: string; label: string; keywords: string }[] = []
		const walk = (
			nodes: Array<{
				id: number
				alias?: string
				name: string
				children?: unknown[]
			}>
		) => {
			for (const u of nodes) {
				list.push({
					value: String(u.id),
					label: `${u.alias ? `${u.alias} — ` : ''}${u.name}`,
					keywords: `${u.alias || ''} ${u.name}`
				})
				if (u.children?.length) {
					walk(u.children as typeof nodes)
				}
			}
		}
		walk(unitsData as Parameters<typeof walk>[0])
		return list
	}, [unitsData])

	const nganhOptions = useMemo(() => {
		const list = catalogQ.data?.nganh ?? []
		return list.map((n) => ({
			value: n.code.toUpperCase(),
			label: `${n.code} — ${nganhLabel(n)}`,
			keywords: `${n.code} ${n.name}`
		}))
	}, [catalogQ.data])

	const facultyOptions = useMemo(() => {
		return (facultyQ.data || []).map((f) => ({
			value: f.code.toUpperCase(),
			label: `${f.code} — ${f.name}`,
			keywords: `${f.code} ${f.name}`
		}))
	}, [facultyQ.data])
	const personnelOptions = useMemo(
		() =>
			(leavePersonnelQ.data || [])
				.filter((p) => !p.userId)
				.map((p) => ({
					value: String(p.id),
					label: `${p.code} — ${p.fullName}${p.unitName ? ` · ${p.unitName}` : ''}`,
					keywords: `${p.code} ${p.fullName} ${p.unitName || ''}`
				})),
		[leavePersonnelQ.data]
	)
	const leaveUnitOptions = useMemo(
		() =>
			(leaveUnitsQ.data || []).map((u) => ({
				value: String(u.id),
				label: `${u.code ? `${u.code} — ` : ''}${u.name}`,
				keywords: `${u.code || ''} ${u.name} ${u.level || ''}`
			})),
		[leaveUnitsQ.data]
	)

	/** Roles gợi ý theo loại TK (ẩn super_admin) */
	const roleOptions = useMemo(() => {
		const roles = (rolesQ.data || []).filter(
			(r) => r.name !== 'super_admin'
		)
		return roles.map((r) => ({
			value: String(r.id),
			label: r.description ? `${r.name} — ${r.description}` : r.name,
			keywords: `${r.name} ${r.description || ''}`,
			name: r.name
		}))
	}, [rolesQ.data])

	const isTrainingKind = accountKind === 'cnk' || accountKind === 'giang_vien'
	/** CNK / GV: role cố định — không cho chọn lung tung */
	const roleLocked = isTrainingKind

	// Gợi ý role mặc định khi chọn loại TK
	useEffect(() => {
		if (!accountKind || !rolesQ.data?.length) return
		const roles = rolesQ.data
		if (accountKind === 'bgh') {
			const hit =
				roles.find((r) => r.name === 'admin') ||
				roles.find((r) => r.name === 'admin_bgh') ||
				roles.find((r) => r.name.toLowerCase().includes('bgh'))
			if (hit) setRoleId(String(hit.id))
			else setRoleId('')
		} else if (accountKind === 'don_vi') {
			const hit =
				roles.find((r) => r.name === 'user_don_vi') ||
				roles.find((r) => r.name.toLowerCase().includes('don_vi'))
			if (hit) setRoleId(String(hit.id))
			else setRoleId('')
		} else if (accountKind === 'nganh') {
			const hit =
				roles.find((r) => r.name === 'user_nganh') ||
				roles.find((r) => r.name === 'Khoa Ngành') ||
				roles.find(
					(r) =>
						r.name.toLowerCase().includes('ngành') ||
						r.name.toLowerCase().includes('nganh')
				)
			if (hit) setRoleId(String(hit.id))
			else setRoleId('')
		} else if (accountKind === 'cnk') {
			const hit =
				roles.find((r) => r.name === 'exam_dept_head') ||
				roles.find((r) => r.name.toLowerCase().includes('dept_head')) ||
				roles.find((r) => r.name === 'user_nganh')
			if (hit) setRoleId(String(hit.id))
			else setRoleId('')
		} else if (accountKind === 'giang_vien') {
			const hit =
				roles.find((r) => r.name === 'exam_lecturer') ||
				roles.find((r) => r.name.toLowerCase().includes('lecturer')) ||
				roles.find((r) => r.name.toLowerCase().includes('giang_vien'))
			if (hit) setRoleId(String(hit.id))
			else setRoleId('')
		} else if (
			accountKind === 'leave_personnel' ||
			accountKind === 'leave_commander' ||
			accountKind === 'leave_management'
		) {
			const preferred =
				accountKind === 'leave_management'
					? ['leave_agency']
					: accountKind === 'leave_commander'
						? ['leave_commander']
						: ['leave_personnel']
			const hit = preferred
				.map((name) => roles.find((r) => r.name === name))
				.find(Boolean)
			if (hit) setRoleId(String(hit.id))
			else setRoleId('')
		}
	}, [accountKind, rolesQ.data])

	function resetForm() {
		setAccountKind('')
		setUsername('')
		setDisplayName('')
		setPassword('')
		setUnitId('')
		setNganhCode('')
		setFacultyCode('')
		setRoleId('')
		setPersonnelId('')
		setLeaveUnitId('')
		setManagementArea('')
	}

	const mut = useMutation({
		mutationFn: CreateUser
	})

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault()
		if (!accountKind) {
			toast.error(
				'Chọn loại: Ban Giám Hiệu, Ngành, Đơn vị, Chủ nhiệm khoa hoặc Giáo viên'
			)
			return
		}
		if (!username.trim() || !displayName.trim() || !password.trim()) {
			toast.error('Nhập đủ họ tên, username, mật khẩu')
			return
		}
		if (accountKind === 'don_vi' && !unitId) {
			toast.error('Chọn đơn vị sử dụng')
			return
		}
		if (accountKind === 'nganh' && !nganhCode) {
			toast.error('Chọn đúng 1 ngành')
			return
		}
		if (
			(accountKind === 'cnk' || accountKind === 'giang_vien') &&
			!facultyCode
		) {
			toast.error('Chọn khoa (K1…K8)')
			return
		}
		if (accountKind === 'leave_personnel' && !personnelId) {
			toast.error('Chọn quân nhân gắn với tài khoản')
			return
		}
		if (accountKind === 'leave_commander' && !leaveUnitId) {
			toast.error('Chọn cơ quan do chỉ huy phụ trách')
			return
		}
		if (accountKind === 'leave_management' && !managementArea) {
			toast.error('Chọn Cơ quan hoặc Quân lực')
			return
		}
		if (!roleId) {
			toast.error(
				roleLocked
					? 'Thiếu role hệ thống (exam_dept_head / exam_lecturer). Chạy seed role đề thi.'
					: 'Chọn phân quyền (vai trò) hiện có'
			)
			return
		}

		const positionLabel =
			accountKind === 'bgh'
				? 'Ban Giám Hiệu'
				: accountKind === 'don_vi'
					? 'Đơn vị sử dụng'
					: accountKind === 'cnk'
						? 'Chủ nhiệm khoa'
						: accountKind === 'giang_vien'
							? 'Giáo viên'
							: accountKind === 'leave_personnel'
								? 'Quân nhân'
								: accountKind === 'leave_commander'
									? 'Chỉ huy cơ quan'
									: accountKind === 'leave_management'
										? 'Cơ quan quản lý'
										: 'User ngành'

		setPending(true)
		try {
			const body: UserBody = {
				username: username.trim(),
				password: password.trim(),
				displayName: displayName.trim(),
				isSuperUser: false,
				unitId: accountKind === 'don_vi' ? Number(unitId) : undefined,
				position: positionLabel
			}
			const created = await mut.mutateAsync(body)

			// Phân quyền: role đã chọn
			await AssignRolesToUser({
				userId: created.id,
				roleIds: [Number(roleId)]
			})

			if (accountKind === 'leave_personnel') {
				await AssignLeaveAccount({
					userId: created.id,
					kind: 'personnel',
					personnelId: Number(personnelId)
				})
			} else if (accountKind === 'leave_commander') {
				await AssignLeaveAccount({
					userId: created.id,
					kind: 'commander',
					unitId: Number(leaveUnitId)
				})
			} else if (accountKind === 'leave_management') {
				await AssignLeaveAccount({
					userId: created.id,
					kind: 'management',
					managementArea
				})
			}

			// TK ngành: gán đúng 1 ngành
			if (accountKind === 'nganh') {
				await AssignUserNganh({
					userId: created.id,
					nganhCodes: [nganhCode.toUpperCase()]
				})
			}

			// CNK: gán exam_faculty_heads + khóa chức vụ
			if (accountKind === 'cnk') {
				await UpsertExamFacultyHead({
					userId: created.id,
					facultyCode: facultyCode.toUpperCase()
				})
			}

			// GV: thêm danh mục khoa + khóa chức vụ
			if (accountKind === 'giang_vien') {
				await CreateExamTeacherCatalog({
					userId: created.id,
					displayName: displayName.trim(),
					facultyCode: facultyCode.toUpperCase()
				})
			}

			try {
				await UpdateUser({
					id: created.id,
					displayName: displayName.trim(),
					unitId:
						accountKind === 'don_vi' ? Number(unitId) : undefined,
					position: positionLabel
				})
			} catch {
				/* optional — CNK/GV đã set position qua faculty-head / catalog */
			}

			await Promise.all([
				qc.invalidateQueries({ queryKey: ['users'] }),
				qc.invalidateQueries({ queryKey: ['pending-permissions'] }),
				qc.invalidateQueries({ queryKey: ['user-nganh'] }),
				qc.invalidateQueries({ queryKey: ['exam-teacher-catalog'] }),
				qc.invalidateQueries({ queryKey: ['exam-teachers'] }),
				qc.refetchQueries({ queryKey: ['users'], type: 'all' })
			])

			const roleName =
				roleOptions.find((r) => r.value === roleId)?.name || roleId
			const facLabel =
				facultyOptions.find(
					(f) => f.value === facultyCode.toUpperCase()
				)?.label || facultyCode
			const msg =
				accountKind === 'bgh'
					? `Đã tạo TK Ban Giám Hiệu «${username.trim()}» · quyền ${roleName}`
					: accountKind === 'don_vi'
						? `Đã tạo TK đơn vị «${username.trim()}» · quyền ${roleName}`
						: accountKind === 'cnk'
							? `Đã tạo Chủ nhiệm khoa «${username.trim()}» · ${facLabel}`
							: accountKind === 'giang_vien'
								? `Đã tạo Giáo viên «${username.trim()}» · ${facLabel}`
								: `Đã tạo TK ngành «${username.trim()}» · ${nganhCode} · quyền ${roleName}`
			toast.success(msg)
			onSuccess([created as User], body, undefined)
			resetForm()
			setOpen(false)
		} catch (err) {
			console.error(err)
			toast.error('Thêm mới người dùng thất bại', {
				description: (err as Error).message
			})
		} finally {
			setPending(false)
		}
	}

	return (
		<Dialog
			open={open}
			onOpenChange={(o) => {
				if (!o) resetForm()
				setOpen(o)
			}}
		>
			<DialogContent className='!max-w-4xl w-[min(96vw,56rem)] !h-auto max-h-[90vh] overflow-y-auto sm:p-8'>
				<DialogHeader>
					<DialogTitle className='text-xl'>
						Thêm người dùng
					</DialogTitle>
				</DialogHeader>
				<form className='space-y-5' onSubmit={handleSubmit}>
					<div className='space-y-2 rounded-lg border border-primary/30 bg-primary/5 p-4'>
						<Label className='text-base font-semibold'>
							Loại tài khoản{' '}
							<span className='text-destructive'>*</span>
						</Label>
						<Select
							value={accountKind}
							onValueChange={(v) => {
								setAccountKind(v as AccountKind)
								setUnitId('')
								setNganhCode('')
								setFacultyCode('')
								setPersonnelId('')
								setLeaveUnitId('')
								setManagementArea('')
							}}
						>
							<SelectTrigger className='h-11 text-base'>
								<SelectValue placeholder='Chọn loại tài khoản…' />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value='bgh'>
									Ban Giám Hiệu (phê duyệt đề xuất)
								</SelectItem>
								<SelectItem value='nganh'>
									Tài khoản ngành
								</SelectItem>
								<SelectItem value='don_vi'>
									Tài khoản đơn vị sử dụng
								</SelectItem>
								<SelectItem value='cnk'>
									Chủ nhiệm khoa (duyệt đề theo khoa)
								</SelectItem>
								<SelectItem value='giang_vien'>
									Giáo viên (soạn đề theo khoa)
								</SelectItem>
								<SelectItem value='leave_personnel'>
									Tài khoản quân nhân
								</SelectItem>
								<SelectItem value='leave_commander'>
									Tài khoản chỉ huy cơ quan
								</SelectItem>
								<SelectItem value='leave_management'>
									Tài khoản cơ quan quản lý
								</SelectItem>
							</SelectContent>
						</Select>
					</div>

					<div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
						<div className='space-y-2 sm:col-span-2'>
							<Label className='text-base'>
								Họ và tên{' '}
								<span className='text-destructive'>*</span>
							</Label>
							<Input
								className='h-11 text-base'
								value={displayName}
								onChange={(e) => setDisplayName(e.target.value)}
								placeholder='Họ tên hiển thị'
							/>
						</div>
						<div className='space-y-2'>
							<Label className='text-base'>
								Tên tài khoản{' '}
								<span className='text-destructive'>*</span>
							</Label>
							<Input
								className='h-11 text-base font-mono'
								value={username}
								onChange={(e) => setUsername(e.target.value)}
								placeholder='username đăng nhập'
							/>
						</div>
						<div className='space-y-2'>
							<Label className='text-base'>
								Mật khẩu{' '}
								<span className='text-destructive'>*</span>
							</Label>
							<Input
								className='h-11 text-base'
								type='password'
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								placeholder='Mật khẩu'
							/>
						</div>
					</div>

					{accountKind === 'bgh' && (
						<div className='rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 text-sm text-muted-foreground'>
							Tài khoản <strong>Ban Giám Hiệu</strong> nhận đề
							xuất chờ duyệt, phê duyệt/từ chối rồi chuyển xuống
							ngành. Phân quyền mặc định: role{' '}
							<code className='text-xs'>admin</code>.
						</div>
					)}

					{accountKind === 'don_vi' && (
						<div className='space-y-2'>
							<Label className='text-base'>
								Đơn vị sử dụng (chỉ 1){' '}
								<span className='text-destructive'>*</span>
							</Label>
							<SearchableSelect
								value={unitId}
								onValueChange={setUnitId}
								options={unitOptions}
								placeholder='Chọn 1 đơn vị…'
								searchPlaceholder='Gõ D1, BGH…'
								emptyText='Không có đơn vị'
								className='h-11 text-base'
							/>
							<p className='text-sm text-muted-foreground'>
								Mỗi tài khoản ĐV chỉ gắn <strong>một</strong>{' '}
								đơn vị sử dụng — giống TK ngành (1 ngành).
							</p>
						</div>
					)}

					{accountKind === 'nganh' && (
						<div className='space-y-2'>
							<Label className='text-base'>
								Ngành (chỉ 1){' '}
								<span className='text-destructive'>*</span>
							</Label>
							<SearchableSelect
								value={nganhCode}
								onValueChange={setNganhCode}
								options={nganhOptions}
								placeholder={
									catalogQ.isLoading
										? 'Đang tải ngành…'
										: 'Chọn 1 ngành…'
								}
								searchPlaceholder='Gõ HC2A, CNTT…'
								emptyText='Không có ngành'
								disabled={catalogQ.isLoading}
								className='h-11 text-base'
							/>
							<p className='text-sm text-muted-foreground'>
								Mỗi tài khoản ngành chỉ gán <strong>một</strong>{' '}
								ngành.
							</p>
						</div>
					)}

					{(accountKind === 'cnk' ||
						accountKind === 'giang_vien') && (
						<div className='space-y-3 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4'>
							<div className='space-y-2'>
								<Label className='text-base'>
									Khoa phụ trách (chỉ 1){' '}
									<span className='text-destructive'>*</span>
								</Label>
								<SearchableSelect
									value={facultyCode}
									onValueChange={setFacultyCode}
									options={facultyOptions}
									placeholder={
										facultyQ.isLoading
											? 'Đang tải khoa…'
											: 'Chọn 1 khoa (K1…K8)…'
									}
									searchPlaceholder='Gõ K1, Dược…'
									emptyText='Không có khoa trong DMĐT'
									disabled={facultyQ.isLoading}
									className='h-11 text-base'
								/>
							</div>
							<div className='rounded-md border bg-background/60 px-3 py-2 text-sm'>
								<span className='text-muted-foreground'>
									Chức vụ (gắn tài khoản, không sửa sau):{' '}
								</span>
								<strong>
									{accountKind === 'cnk'
										? 'Chủ nhiệm khoa'
										: 'Giáo viên'}
								</strong>
							</div>
							<p className='text-sm text-muted-foreground'>
								{accountKind === 'cnk' ? (
									<>
										CNK duyệt đề theo <strong>khoa</strong>{' '}
										— không cần đơn vị. Role:{' '}
										<code className='text-xs'>
											exam_dept_head
										</code>
										.
									</>
								) : (
									<>
										GV soạn đề theo khoa trong danh mục —
										không cần đơn vị. Role:{' '}
										<code className='text-xs'>
											exam_lecturer
										</code>
										.
									</>
								)}
							</p>
						</div>
					)}

					{accountKind === 'leave_personnel' && (
						<div className='space-y-2 rounded-lg border border-sky-500/30 bg-sky-500/5 p-4'>
							<Label className='text-base'>
								Quân nhân{' '}
								<span className='text-destructive'>*</span>
							</Label>
							<SearchableSelect
								value={personnelId}
								onValueChange={setPersonnelId}
								options={personnelOptions}
								placeholder={
									leavePersonnelQ.isLoading
										? 'Đang tải…'
										: 'Chọn quân nhân…'
								}
								searchPlaceholder='Tìm theo mã hoặc họ tên…'
								emptyText='Không còn quân nhân chưa có tài khoản'
								disabled={leavePersonnelQ.isLoading}
								className='h-11 text-base'
							/>
						</div>
					)}

					{accountKind === 'leave_commander' && (
						<div className='space-y-2 rounded-lg border border-sky-500/30 bg-sky-500/5 p-4'>
							<Label className='text-base'>
								Cơ quan chỉ huy{' '}
								<span className='text-destructive'>*</span>
							</Label>
							<SearchableSelect
								value={leaveUnitId}
								onValueChange={setLeaveUnitId}
								options={leaveUnitOptions}
								placeholder={
									leaveUnitsQ.isLoading
										? 'Đang tải…'
										: 'Chọn cơ quan…'
								}
								searchPlaceholder='Tìm mã hoặc tên cơ quan…'
								emptyText='Không có cơ quan'
								disabled={leaveUnitsQ.isLoading}
								className='h-11 text-base'
							/>
						</div>
					)}

					{accountKind === 'leave_management' && (
						<div className='space-y-2 rounded-lg border border-sky-500/30 bg-sky-500/5 p-4'>
							<Label className='text-base'>
								Phạm vi quản lý{' '}
								<span className='text-destructive'>*</span>
							</Label>
							<Select
								value={managementArea}
								onValueChange={(v) =>
									setManagementArea(
										v as 'cán_bộ' | 'quân_lực'
									)
								}
							>
								<SelectTrigger className='h-11 text-base'>
									<SelectValue placeholder='Chọn Cơ quan hoặc Quân lực…' />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value='cán_bộ'>
										Cơ quan
									</SelectItem>
									<SelectItem value='quân_lực'>
										Quân lực
									</SelectItem>
								</SelectContent>
							</Select>
						</div>
					)}

					{/* Phân quyền — CNK/GV khóa role; loại khác chọn tự do */}
					{accountKind ? (
						<div className='space-y-2 rounded-lg border p-4'>
							<Label className='text-base font-semibold'>
								Phân quyền (vai trò){' '}
								{!roleLocked && (
									<span className='text-destructive'>*</span>
								)}
							</Label>
							{rolesQ.isLoading ? (
								<p className='text-sm text-muted-foreground'>
									Đang tải danh sách quyền…
								</p>
							) : roleLocked ? (
								<div className='rounded-md border bg-muted/40 px-3 py-2 text-sm'>
									{roleOptions.find((r) => r.value === roleId)
										?.label ||
										(accountKind === 'cnk'
											? 'exam_dept_head'
											: 'exam_lecturer')}
									<span className='text-muted-foreground ml-2'>
										(cố định theo loại TK)
									</span>
								</div>
							) : (
								<SearchableSelect
									value={roleId}
									onValueChange={setRoleId}
									options={roleOptions.map((r) => ({
										value: r.value,
										label: r.label,
										keywords: r.keywords
									}))}
									placeholder='Chọn vai trò / phân quyền…'
									searchPlaceholder='Gõ tên role…'
									emptyText='Không có vai trò'
									className='h-11 text-base'
								/>
							)}
							{!roleLocked && (
								<p className='text-sm text-muted-foreground'>
									Gán luôn khi tạo — không cần vào menu Phân
									quyền lần nữa (trừ khi đổi sau).
								</p>
							)}
						</div>
					) : null}

					<DialogFooter className='gap-2 sm:gap-3 pt-2'>
						<Button
							type='button'
							variant='outline'
							className='h-10 min-w-[6rem]'
							disabled={pending}
							onClick={() => {
								resetForm()
								setOpen(false)
							}}
						>
							Hủy
						</Button>
						<Button
							type='submit'
							className='h-10 min-w-[6rem]'
							disabled={pending || !accountKind}
						>
							{pending ? (
								<>
									<Loader2 className='w-4 h-4 mr-1.5 animate-spin' />
									Đang lưu…
								</>
							) : (
								'Thêm'
							)}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	)
}
