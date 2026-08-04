/**
 * Quản lý phép — API wrappers (json fetch + appFetcher auth)
 */
import { appFetcher } from '@/lib/axios'
import { ApiUrl } from '@/lib/const'

async function jsonFetch<T>(path: string, init?: RequestInit): Promise<T> {
	const url = `${ApiUrl.replace(/\/$/, '')}${path}`
	const resp = await appFetcher(url, {
		...init,
		headers: {
			'Content-Type': 'application/json',
			...(init?.headers ?? {})
		}
	})
	if (!resp.ok) {
		let message = `HTTP ${resp.status}`
		try {
			const body = await resp.json()
			message =
				body?.message ||
				body?.error ||
				body?.internal_message ||
				message
		} catch {
			/* ignore */
		}
		throw new Error(message)
	}
	if (resp.status === 204) return undefined as T
	return resp.json() as Promise<T>
}

export function ConvertLeaveWordTemplate(input: {
	fileName: string
	base64: string
}) {
	return jsonFetch<{ fileName: string; base64: string }>(
		'/leave-management/word-templates/convert',
		{ method: 'POST', body: JSON.stringify(input) }
	)
}

/** Mã đối tượng theo quy định (legacy: QN|CN|HSQ|BS vẫn map được phía API) */
export type LeaveObjectType =
	| 'SQ'
	| 'QNCN'
	| 'CNQP'
	| 'VCQP'
	| 'HSQBS'
	| 'HV'
	| 'KHAC'
	| 'QN'
	| 'CN'
	| 'HSQ'
	| 'BS'
export type LeaveType = 'ANNUAL' | 'SPECIAL'
export type LeaveLocalityLevel = 'province' | 'ward' | 'village'
export type LeaveRequestStatus =
	| 'DRAFT'
	| 'PENDING'
	| 'PENDING_COMMANDER'
	| 'PENDING_AGENCY'
	| 'APPROVED'
	| 'RETURNED'
	| 'REJECTED'
	| 'CANCELLED'

export interface LeavePersonnel {
	id: number
	createdAt: string
	updatedAt: string
	code: string
	fullName: string
	enlistmentDate: string | null
	recruitment: string | null
	objectType: LeaveObjectType
	rank: string | null
	position: string | null
	classId: number | null
	unitId: number | null
	unitName: string | null
	hometown: string | null
	permanentResidence: string | null
	userId: number | null
	email: string | null
	commanderUserId: number | null
	commanderName: string | null
	replacementPersonnelId: number | null
	replacementPersonnelName: string | null
	replacementPosition: string | null
	className: string | null
	managementArea: string
}

export interface LeaveLocality {
	id: number
	createdAt: string
	updatedAt: string
	name: string
	level: LeaveLocalityLevel
	parentId: number | null
	code: string | null
	children?: LeaveLocality[]
}

export interface LeaveRegulation {
	id: number
	createdAt: string
	updatedAt: string
	leaveType: LeaveType
	requestScope: 'INDIVIDUAL' | 'CLASS' | 'SHORT_LEAVE'
	classId: number | null
	className: string | null
	objectType: LeaveObjectType | null
	objectTypeLabel: string | null
	minYears: number | null
	maxYears: number | null
	baseDays: number
	label: string | null
	description: string | null
	isActive: boolean
}

export interface LeaveRequest {
	id: number
	createdAt: string
	updatedAt: string
	leaveType: LeaveType
	requestScope: 'INDIVIDUAL' | 'CLASS' | 'SHORT_LEAVE'
	classId: number | null
	className: string | null
	status: LeaveRequestStatus
	personnelId: number | null
	personnelCode: string | null
	personnelName: string | null
	objectType: LeaveObjectType
	objectTypeLabel: string
	rank: string | null
	position: string | null
	enlistmentDate: string | null
	unitId: number | null
	unitName: string | null
	serviceYears: number
	baseDays: number
	travelDays: number
	extraDays: number
	extraReasons: string[]
	totalDays: number
	startDate: string | null
	endDate: string | null
	localityId: number | null
	localityPath: string | null
	note: string | null
	proposedByUserId: number | null
	proposedByUsername: string | null
	proposedByDisplayName: string | null
	proposerEmail: string | null
	commanderUserId: number | null
	commanderName: string | null
	adminNote: string | null
	decidedByUserId: number | null
	decidedByUsername: string | null
	decidedAt: string | null
	/** Số ngày đã đi (đơn đã duyệt cùng năm) */
	usedDays?: number
	/** Số ngày còn lại theo hạn mức năm (ANNUAL) */
	remainingDays?: number | null
	/** Hạn mức ngày phép cơ bản năm */
	quotaDays?: number | null
}

export interface LeaveUnit {
	id: number
	createdAt: string
	updatedAt: string
	code: string | null
	name: string
	parentId: number | null
	level: string | null
	commanderUserId: number | null
	commanderName: string | null
	managementArea: string
	isActive: boolean
}

export interface LeaveClass {
	id: number
	unitId: number
	unitName: string
	name: string
	isActive: boolean
}

export function CreateLeaveClass(body: { unitId: number; name: string }) {
	return jsonFetch<{ data: LeaveClass }>('/leave/classes', {
		method: 'POST',
		body: JSON.stringify(body)
	}).then((r) => r.data)
}

export interface LeaveRecord {
	id: number
	createdAt: string
	updatedAt: string
	requestId: number
	status: LeaveRequestStatus
	leaveType: LeaveType
	personnelId: number | null
	personnelCode: string | null
	personnelName: string | null
	objectType: LeaveObjectType
	objectTypeLabel: string
	rank: string | null
	position: string | null
	enlistmentDate: string | null
	unitId: number | null
	unitName: string | null
	serviceYears: number
	baseDays: number
	travelDays: number
	extraDays: number
	extraReasons: string[]
	totalDays: number
	startDate: string | null
	endDate: string | null
	localityId: number | null
	localityPath: string | null
	note: string | null
	adminNote: string | null
	proposedByUserId: number | null
	proposedByUsername: string | null
	proposedByDisplayName: string | null
	decidedByUserId: number | null
	decidedByUsername: string | null
	decidedAt: string | null
	archivedAt: string
	requestScope: 'INDIVIDUAL' | 'CLASS' | 'SHORT_LEAVE'
	classId: number | null
	className: string | null
	memberCount: number
}

export interface LeaveMeta {
	objectTypes: { code: LeaveObjectType; label: string }[]
	extra10Reasons: { code: string; label: string }[]
	extra5Reasons: { code: string; label: string }[]
	specialReasons: { code: string; label: string }[]
	specialMaxDays: number
	specialEligible: LeaveObjectType[]
}

// ── Personnel ──────────────────────────────────────────────

export function ListLeavePersonnel(params?: {
	search?: string
	objectType?: string
}) {
	const qs = new URLSearchParams()
	if (params?.search) qs.set('search', params.search)
	if (params?.objectType) qs.set('objectType', params.objectType)
	const q = qs.toString()
	return jsonFetch<{ data: LeavePersonnel[] }>(
		`/leave/personnel${q ? `?${q}` : ''}`
	).then((r) => r.data)
}

export function GetMyLeavePersonnel() {
	return jsonFetch<{ data: LeavePersonnel | null }>(
		'/leave/my-personnel'
	).then((r) => r.data)
}

export function CreateLeavePersonnel(
	body: Partial<Omit<LeavePersonnel, 'id' | 'createdAt' | 'updatedAt'>> & {
		fullName: string
		objectType: LeaveObjectType
	}
) {
	return jsonFetch<{ data: LeavePersonnel }>('/leave/personnel', {
		method: 'POST',
		body: JSON.stringify(body)
	}).then((r) => r.data)
}

export function UpdateLeavePersonnel(
	id: number,
	body: Partial<LeavePersonnel>
) {
	return jsonFetch<{ data: LeavePersonnel }>(`/leave/personnel/${id}`, {
		method: 'PATCH',
		body: JSON.stringify(body)
	}).then((r) => r.data)
}

export function DeleteLeavePersonnel(id: number) {
	return jsonFetch<{ ok: boolean }>(`/leave/personnel/${id}`, {
		method: 'DELETE'
	})
}

export interface ImportLeaveResult {
	successCount: number
	errorCount: number
	totalCount: number
	errors: { row: number; message: string }[]
	createdCount?: number
	skippedCount?: number
}

export function ImportLeavePersonnel(
	items: Array<
		Partial<Omit<LeavePersonnel, 'id' | 'createdAt' | 'updatedAt'>> & {
			fullName: string
			objectType: LeaveObjectType
		}
	>
) {
	return jsonFetch<{ data: ImportLeaveResult }>('/leave/personnel/import', {
		method: 'POST',
		body: JSON.stringify({ items })
	}).then((r) => r.data)
}

// ── Localities ─────────────────────────────────────────────

export function ListLeaveLocalities(params?: {
	level?: string
	parentId?: number
	tree?: boolean
}) {
	const qs = new URLSearchParams()
	if (params?.level) qs.set('level', params.level)
	if (params?.parentId != null) qs.set('parentId', String(params.parentId))
	if (params?.tree) qs.set('tree', 'true')
	const q = qs.toString()
	return jsonFetch<{ data: LeaveLocality[] }>(
		`/leave/localities${q ? `?${q}` : ''}`
	).then((r) => r.data)
}

export function CreateLeaveLocality(body: {
	name: string
	level: LeaveLocalityLevel
	parentId?: number | null
	level?: string | null
	code?: string | null
}) {
	return jsonFetch<{ data: LeaveLocality }>('/leave/localities', {
		method: 'POST',
		body: JSON.stringify(body)
	}).then((r) => r.data)
}

export function UpdateLeaveLocality(
	id: number,
	body: { name?: string; code?: string | null }
) {
	return jsonFetch<{ data: LeaveLocality }>(`/leave/localities/${id}`, {
		method: 'PATCH',
		body: JSON.stringify(body)
	}).then((r) => r.data)
}

export function DeleteLeaveLocality(id: number) {
	return jsonFetch<{ ok: boolean }>(`/leave/localities/${id}`, {
		method: 'DELETE'
	})
}

export function ImportLeaveLocalities(
	items: {
		province: string
		ward?: string | null
		village?: string | null
		provinceCode?: string | null
		wardCode?: string | null
		villageCode?: string | null
	}[]
) {
	return jsonFetch<{ data: ImportLeaveResult }>('/leave/localities/import', {
		method: 'POST',
		body: JSON.stringify({ items })
	}).then((r) => r.data)
}

// ── Regulations ────────────────────────────────────────────

export function ListLeaveRegulations(leaveType?: string) {
	const q = leaveType ? `?leaveType=${leaveType}` : ''
	return jsonFetch<{ data: LeaveRegulation[] }>(
		`/leave/regulations${q}`
	).then((r) => r.data)
}

export function GetLeaveMeta() {
	return jsonFetch<{ data: LeaveMeta }>('/leave/meta').then((r) => r.data)
}

export function ComputeLeaveDays(body: {
	objectType: string
	serviceYears?: number
	enlistmentDate?: string | null
	/** Ngày bắt đầu nghỉ — dùng tính thâm niên */
	startDate?: string | null
	leaveType?: string
	travelDays?: number
	extraDays?: number
	specialDays?: number
}) {
	return jsonFetch<{
		data: {
			serviceYears: number
			baseDays: number
			travelDays: number
			extraDays: number
			totalDays: number
		}
	}>('/leave/compute-days', {
		method: 'POST',
		body: JSON.stringify(body)
	}).then((r) => r.data)
}

// ── Requests ───────────────────────────────────────────────

export function ListLeaveRequests(params?: {
	status?: string
	mine?: boolean
	leaveType?: string
	/** Tìm mã QN hoặc họ tên */
	search?: string
	/** Lọc theo chỉ huy (user id) */
	commanderUserId?: number
	/** mine | commander | agency | all | related */
	inbox?: string
}) {
	const qs = new URLSearchParams()
	if (params?.status) qs.set('status', params.status)
	if (params?.mine) qs.set('mine', 'true')
	if (params?.leaveType) qs.set('leaveType', params.leaveType)
	if (params?.search) qs.set('search', params.search)
	if (params?.commanderUserId != null)
		qs.set('commanderUserId', String(params.commanderUserId))
	if (params?.inbox) qs.set('inbox', params.inbox)
	const q = qs.toString()
	return jsonFetch<{ data: LeaveRequest[] }>(
		`/leave/requests${q ? `?${q}` : ''}`
	).then((r) => r.data)
}

export function CreateLeaveRequest(body: {
	leaveType?: string
	requestScope?: 'INDIVIDUAL' | 'CLASS' | 'SHORT_LEAVE'
	classId?: number | null
	className?: string | null
	manualDays?: number
	personnelId?: number | null
	objectType?: string
	rank?: string | null
	unitId?: number | null
	unitName?: string | null
	travelDays?: number
	extraDays?: number
	extraReasons?: string[]
	specialDays?: number
	startDate?: string | null
	endDate?: string | null
	localityId?: number | null
	/** Địa chỉ cụ thể (số nhà, đường…) */
	localityDetail?: string | null
	note?: string | null
	replacementPersonnelId?: number | null
}) {
	return jsonFetch<{ data: LeaveRequest }>('/leave/requests', {
		method: 'POST',
		body: JSON.stringify(body)
	}).then((r) => r.data)
}

export type LeaveMailResult = {
	ok: boolean
	to: string
	mode: string
	error?: string
	previewUrl?: string
	isTestInbox: boolean
	message: string
}

export function DecideLeaveRequest(
	id: number,
	body: {
		decision: 'APPROVED' | 'REJECTED' | 'RETURNED'
		adminNote?: string | null
		travelDays?: number
		extraDays?: number
		extraReasons?: string[]
	}
) {
	return jsonFetch<{ data: LeaveRequest; mail?: LeaveMailResult | null }>(
		`/leave/requests/${id}/decide`,
		{
			method: 'POST',
			body: JSON.stringify(body)
		}
	)
}

export function ListLeaveMailLog(limit = 30) {
	return jsonFetch<{
		data: {
			id: number
			createdAt: string
			requestId: number | null
			toEmail: string
			subject: string
			body: string | null
			mode: string | null
			ok: boolean
			error: string | null
			previewUrl: string | null
			kind: string | null
		}[]
	}>(`/leave/mail/log?limit=${limit}`).then((r) => r.data)
}

/** Lưu SMTP Gmail thật (App Password) */
export function SaveLeaveMailConfig(body: {
	host?: string
	port?: string | number
	user: string
	pass: string
	from?: string
}) {
	return jsonFetch<{
		data: { ok: boolean; message: string; status: LeaveMailStatus }
	}>('/leave/mail/config', {
		method: 'POST',
		body: JSON.stringify(body)
	}).then((r) => r.data)
}

export function PatchLeaveRequest(
	id: number,
	body: {
		travelDays?: number
		extraDays?: number
		extraReasons?: string[]
		startDate?: string | null
		endDate?: string | null
		adminNote?: string | null
	}
) {
	return jsonFetch<{ data: LeaveRequest }>(`/leave/requests/${id}`, {
		method: 'PATCH',
		body: JSON.stringify(body)
	}).then((r) => r.data)
}

export function GetLeaveRequest(id: number) {
	return jsonFetch<{ data: LeaveRequest }>(`/leave/requests/${id}`).then(
		(r) => r.data
	)
}

export function CancelLeaveRequest(id: number) {
	return jsonFetch<{ data: LeaveRequest }>(`/leave/requests/${id}/cancel`, {
		method: 'POST',
		body: '{}'
	}).then((r) => r.data)
}

// ── Units (danh mục đơn vị) ────────────────────────────────

export function ListLeaveUnits(params?: {
	search?: string
	activeOnly?: boolean
}) {
	const qs = new URLSearchParams()
	if (params?.search) qs.set('search', params.search)
	if (params?.activeOnly === false) qs.set('activeOnly', 'false')
	const q = qs.toString()
	return jsonFetch<{ data: LeaveUnit[] }>(
		`/leave/units${q ? `?${q}` : ''}`
	).then((r) => r.data)
}

export type LeaveAccountKind = 'personnel' | 'commander' | 'management'

export function AssignLeaveAccount(body: {
	userId: number
	kind: LeaveAccountKind
	personnelId?: number
	unitId?: number
	managementArea?: 'cán_bộ' | 'quân_lực'
}) {
	return jsonFetch<{ ok: boolean }>('/leave/accounts/assign', {
		method: 'POST',
		body: JSON.stringify(body)
	})
}

export function ListLeaveClasses(unitId?: number) {
	const q = unitId != null ? `?unitId=${unitId}` : ''
	return jsonFetch<{ data: LeaveClass[] }>(`/leave/classes${q}`).then(
		(r) => r.data
	)
}

export interface LeaveAuditLog {
	id: number
	createdAt: string
	userId: number | null
	action: string
	entityType: string
	entityId: number | null
	details: string | null
}

export function ListLeaveAuditLogs(entityType?: string) {
	const q = entityType ? `?entityType=${encodeURIComponent(entityType)}` : ''
	return jsonFetch<{ data: LeaveAuditLog[] }>(`/leave/audit-logs${q}`).then(
		(r) => r.data
	)
}

export function CreateLeaveUnit(body: {
	name: string
	code?: string | null
	parentId?: number | null
	isActive?: boolean
	commanderUserId?: number | null
}) {
	return jsonFetch<{ data: LeaveUnit }>('/leave/units', {
		method: 'POST',
		body: JSON.stringify(body)
	}).then((r) => r.data)
}

export function UpdateLeaveUnit(
	id: number,
	body: Partial<{
		name: string
		code: string | null
		parentId: number | null
		isActive: boolean
		commanderUserId: number | null
	}>
) {
	return jsonFetch<{ data: LeaveUnit }>(`/leave/units/${id}`, {
		method: 'PATCH',
		body: JSON.stringify(body)
	}).then((r) => r.data)
}

export function DeleteLeaveUnit(id: number) {
	return jsonFetch<{ ok: boolean }>(`/leave/units/${id}`, {
		method: 'DELETE'
	})
}

export function ImportLeaveUnits(
	items: { name: string; code?: string | null }[]
) {
	return jsonFetch<{ data: ImportLeaveResult }>('/leave/units/import', {
		method: 'POST',
		body: JSON.stringify({ items })
	}).then((r) => r.data)
}

// ── Records (lưu trữ nghỉ phép) ────────────────────────────

export function ListLeaveRecords(params?: {
	search?: string
	year?: number
	leaveType?: string
	objectType?: string
	status?: string
}) {
	const qs = new URLSearchParams()
	if (params?.search) qs.set('search', params.search)
	if (params?.year != null) qs.set('year', String(params.year))
	if (params?.leaveType) qs.set('leaveType', params.leaveType)
	if (params?.objectType) qs.set('objectType', params.objectType)
	if (params?.status) qs.set('status', params.status)
	const q = qs.toString()
	return jsonFetch<{ data: LeaveRecord[] }>(
		`/leave/records${q ? `?${q}` : ''}`
	).then((r) => r.data)
}

// ── Object types (bảng đối tượng) ──────────────────────────

export interface LeaveObjectTypeRow {
	id: number
	createdAt: string
	updatedAt: string
	code: string
	name: string
	sortOrder: number
	isActive: boolean
}

export function ListLeaveObjectTypes(activeOnly = false) {
	const q = activeOnly ? '' : '?activeOnly=false'
	return jsonFetch<{ data: LeaveObjectTypeRow[] }>(
		`/leave/object-types${q}`
	).then((r) => r.data)
}

export function CreateLeaveObjectType(body: {
	code: string
	name: string
	sortOrder?: number
	isActive?: boolean
}) {
	return jsonFetch<{ data: LeaveObjectTypeRow }>('/leave/object-types', {
		method: 'POST',
		body: JSON.stringify(body)
	}).then((r) => r.data)
}

export function UpdateLeaveObjectType(
	id: number,
	body: Partial<{ name: string; sortOrder: number; isActive: boolean }>
) {
	return jsonFetch<{ data: LeaveObjectTypeRow }>(
		`/leave/object-types/${id}`,
		{ method: 'PATCH', body: JSON.stringify(body) }
	).then((r) => r.data)
}

export function DeleteLeaveObjectType(id: number) {
	return jsonFetch<{ ok: boolean }>(`/leave/object-types/${id}`, {
		method: 'DELETE'
	})
}

// ── Extra standards (tiêu chuẩn phép thêm) ─────────────────

export interface LeaveExtraStandard {
	id: number
	createdAt: string
	updatedAt: string
	code: string
	label: string
	days: number
	sortOrder: number
	isActive: boolean
}

export function ListLeaveExtraStandards(params?: {
	activeOnly?: boolean
	days?: number
}) {
	const qs = new URLSearchParams()
	if (params?.activeOnly === false) qs.set('activeOnly', 'false')
	if (params?.days != null) qs.set('days', String(params.days))
	const q = qs.toString()
	return jsonFetch<{ data: LeaveExtraStandard[] }>(
		`/leave/extra-standards${q ? `?${q}` : ''}`
	).then((r) => r.data)
}

export function CreateLeaveExtraStandard(body: {
	code: string
	label: string
	days: number
	sortOrder?: number
	isActive?: boolean
}) {
	return jsonFetch<{ data: LeaveExtraStandard }>('/leave/extra-standards', {
		method: 'POST',
		body: JSON.stringify(body)
	}).then((r) => r.data)
}

export function UpdateLeaveExtraStandard(
	id: number,
	body: Partial<{
		label: string
		days: number
		sortOrder: number
		isActive: boolean
	}>
) {
	return jsonFetch<{ data: LeaveExtraStandard }>(
		`/leave/extra-standards/${id}`,
		{ method: 'PATCH', body: JSON.stringify(body) }
	).then((r) => r.data)
}

export function DeleteLeaveExtraStandard(id: number) {
	return jsonFetch<{ ok: boolean }>(`/leave/extra-standards/${id}`, {
		method: 'DELETE'
	})
}

// ── Regulations CRUD ───────────────────────────────────────

export function CreateLeaveRegulation(body: {
	leaveType: string
	objectType?: string | null
	minYears?: number | null
	maxYears?: number | null
	baseDays: number
	label?: string | null
	description?: string | null
	isActive?: boolean
}) {
	return jsonFetch<{ data: LeaveRegulation }>('/leave/regulations', {
		method: 'POST',
		body: JSON.stringify(body)
	}).then((r) => r.data)
}

export function UpdateLeaveRegulation(
	id: number,
	body: Partial<{
		baseDays: number
		label: string | null
		description: string | null
		isActive: boolean
		minYears: number | null
		maxYears: number | null
	}>
) {
	return jsonFetch<{ data: LeaveRegulation }>(`/leave/regulations/${id}`, {
		method: 'PATCH',
		body: JSON.stringify(body)
	}).then((r) => r.data)
}

export function DeleteLeaveRegulation(id: number) {
	return jsonFetch<{ ok: boolean }>(`/leave/regulations/${id}`, {
		method: 'DELETE'
	})
}

// ── Alerts (thông báo duyệt) ───────────────────────────────

export interface LeaveAlert {
	id: number
	createdAt: string
	userId: number
	requestId: number
	kind: 'NEED_COMMANDER' | 'NEED_AGENCY' | 'DECIDED' | 'RETURNED'
	title: string
	message: string
	readAt: string | null
	personnelName?: string | null
	personnelCode?: string | null
	status?: string | null
	totalDays?: number | null
	startDate?: string | null
	endDate?: string | null
}

export function ListLeaveAlerts(params?: {
	unreadOnly?: boolean
	limit?: number
}) {
	const qs = new URLSearchParams()
	if (params?.unreadOnly) qs.set('unreadOnly', 'true')
	if (params?.limit != null) qs.set('limit', String(params.limit))
	const q = qs.toString()
	return jsonFetch<{ data: LeaveAlert[] }>(
		`/leave/alerts${q ? `?${q}` : ''}`
	).then((r) => r.data)
}

export function GetLeaveAlertCount() {
	return jsonFetch<{ data: { count: number; pendingApprove: number } }>(
		'/leave/alerts/unread-count'
	).then((r) => r.data)
}

export function MarkLeaveAlertsRead(body: {
	ids?: number[]
	requestId?: number
	all?: boolean
}) {
	return jsonFetch<{ ok: boolean }>('/leave/alerts/mark-read', {
		method: 'POST',
		body: JSON.stringify(body)
	})
}

export function GetLeavePersonnel(id: number) {
	return jsonFetch<{ data: LeavePersonnel }>(`/leave/personnel/${id}`).then(
		(r) => r.data
	)
}

// ── Mail status / test ─────────────────────────────────────

export interface LeaveMailStatus {
	configured: boolean
	mode: string
	host: string | null
	port: number | null
	user: string | null
	from: string | null
	devMode: boolean
	lastPreviewUrl: string | null
	hint: string
}

export function GetLeaveMailStatus() {
	return jsonFetch<{ data: LeaveMailStatus }>('/leave/mail/status').then(
		(r) => r.data
	)
}

export function TestLeaveMail(to: string) {
	return jsonFetch<{
		data: {
			ok: boolean
			mode: string
			error?: string
			previewUrl?: string
			to: string
			isTestInbox?: boolean
		}
	}>('/leave/mail/test', {
		method: 'POST',
		body: JSON.stringify({ to })
	}).then((r) => r.data)
}

export interface LeaveBatch {
	id: number
	createdAt: string
	updatedAt: string
	requestId: number
	personnelId: number | null
	personnelCode: string | null
	personnelName: string | null
	objectType: string
	leaveType: string
	batchIndex: number
	batchLabel: string
	startDate: string | null
	endDate: string | null
	totalDays: number
	note: string | null
	createdByUserId: number | null
}

export function ListLeaveBatches(requestId?: number) {
	const q = requestId ? `?requestId=${requestId}` : ''
	return jsonFetch<{ data: LeaveBatch[] }>(`/leave/batches${q}`).then(
		(r) => r.data
	)
}

export function CreateLeaveBatch(
	body: Partial<LeaveBatch> & { requestId: number }
) {
	return jsonFetch<{ data: LeaveBatch }>('/leave/batches', {
		method: 'POST',
		body: JSON.stringify(body)
	}).then((r) => r.data)
}

export function UpdateLeaveBatch(id: number, body: Partial<LeaveBatch>) {
	return jsonFetch<{ data: LeaveBatch }>(`/leave/batches/${id}`, {
		method: 'PUT',
		body: JSON.stringify(body)
	}).then((r) => r.data)
}

export function DeleteLeaveBatch(id: number) {
	return jsonFetch<{ ok: boolean }>(`/leave/batches/${id}`, {
		method: 'DELETE'
	})
}

export interface LeaveTakenReportItem extends LeaveRecord {}
export interface LeaveCheckYearItem extends LeavePersonnel {
	takenDays: number
	remainingDays: number
}
export interface LeaveNotYetTakenItem {
	personnelId: number
	personnelCode: string
	personnelName: string
	objectType: string
	unitId: number | null
	unitName: string | null
}

export function GetLeaveTakenReport(year: number) {
	return jsonFetch<{ data: LeaveTakenReportItem[] }>(
		`/leave/reports/taken-list?year=${year}`
	).then((r) => r.data)
}

export function GetLeaveCheckYearReport(params: {
	year: number
	search?: string
}) {
	const qs = new URLSearchParams({ year: String(params.year) })
	if (params.search) qs.set('search', params.search)
	return jsonFetch<{ data: LeaveCheckYearItem[] }>(
		`/leave/reports/check-year?${qs}`
	).then((r) => r.data)
}

export function GetLeaveNotYetTakenReport(year: number) {
	return jsonFetch<{ data: LeaveNotYetTakenItem[] }>(
		`/leave/reports/not-yet-taken?year=${year}`
	).then((r) => r.data)
}

export interface LeaveAccess {
	role: 'admin' | 'commander' | 'agency' | 'personnel' | 'none'
	isAdmin: boolean
	isCommander: boolean
	isAgency: boolean
	isPersonnel: boolean
	canPropose: boolean
	hasModuleAccess: boolean
	canApprove: boolean
	canReadCatalogs: boolean
	canManageCatalogs: boolean
	canViewReports: boolean
	canManageSettings: boolean
	managementArea: string | null
	unitIds: number[]
	unitNames: string[]
}

export function GetLeaveMyAccess() {
	return jsonFetch<{ data: LeaveAccess }>('/leave/my-access').then(
		(r) => r.data
	)
}

export interface LeavePosition {
	id: number
	name: string
	sortOrder: number
	isActive: boolean
}

export function ListLeavePositions(activeOnly = true) {
	return jsonFetch<{ data: LeavePosition[] }>(
		`/leave/positions?activeOnly=${activeOnly}`
	).then((r) => r.data)
}

export function CreateLeavePosition(body: Omit<LeavePosition, 'id'>) {
	return jsonFetch<{ data: LeavePosition }>('/leave/positions', {
		method: 'POST',
		body: JSON.stringify(body)
	}).then((r) => r.data)
}

export function UpdateLeavePosition(
	id: number,
	body: Partial<Omit<LeavePosition, 'id'>>
) {
	return jsonFetch<{ data: LeavePosition }>(`/leave/positions/${id}`, {
		method: 'PATCH',
		body: JSON.stringify(body)
	}).then((r) => r.data)
}

export function DeleteLeavePosition(id: number) {
	return jsonFetch<{ ok: boolean }>(`/leave/positions/${id}`, {
		method: 'DELETE'
	})
}
