import { ApiUrl } from '@/const'
import { appFetcher } from './index'

export interface ExportTemplate {
	id: string
	name: string
	format: 'docx' | 'xlsx' | 'xls'
	size: number
	modified: number
}

export interface GetTemplatesResponse {
	data: ExportTemplate[]
}

export interface ExportCourseResponse {
	filename: string
	mimetype: string
	content: string // base64
}

export interface UploadTemplateRequest {
	type: 'course' | 'quiz' | 'assign'
	name: string
	filename: string
	filedata: string // base64
}

// ── course export ──────────────────────────────────────────────────────────

class exportApi {
	async getCourseTemplates(courseId: number): Promise<ExportTemplate[]> {
		const resp = await appFetcher(
			`${ApiUrl}/courses/${courseId}/export/templates`
		)
		if (!resp.ok) throw new Error('Failed to fetch export templates')
		const data: GetTemplatesResponse = await resp.json()
		return data.data
	}

	async exportCourseGrades(
		courseId: number,
		templateId?: string
	): Promise<ExportCourseResponse> {
		const qs = templateId
			? `?templateId=${encodeURIComponent(templateId)}`
			: ''
		const resp = await appFetcher(
			`${ApiUrl}/courses/${courseId}/export${qs}`
		)
		if (!resp.ok) throw new Error('Failed to export course grades')
		return resp.json()
	}

	// ── admin / template management ──────────────────────────────────────

	async getAllTemplates(
		type: 'course' | 'quiz' | 'assign'
	): Promise<ExportTemplate[]> {
		const resp = await appFetcher(
			`${ApiUrl}/admin/export/templates?type=${type}`
		)
		if (!resp.ok) throw new Error('Failed to fetch templates')
		const data: GetTemplatesResponse = await resp.json()
		return data.data
	}

	async uploadTemplate(req: UploadTemplateRequest): Promise<ExportTemplate> {
		const resp = await appFetcher(`${ApiUrl}/admin/export/templates`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(req)
		})
		if (!resp.ok) {
			const body = await resp.json().catch(() => ({}))
			throw new Error(body?.message ?? 'Failed to upload template')
		}
		return resp.json()
	}

	async deleteTemplate(
		type: 'course' | 'quiz' | 'assign',
		templateId: string
	): Promise<void> {
		const resp = await appFetcher(
			`${ApiUrl}/admin/export/templates/${type}/${templateId}`,
			{ method: 'DELETE' }
		)
		if (!resp.ok) {
			const body = await resp.json().catch(() => ({}))
			throw new Error(body?.message ?? 'Failed to delete template')
		}
	}
}

export const ExportApi = new exportApi()

// ── download helper ────────────────────────────────────────────────────────

/**
 * Decode a base64 file response and trigger a browser download.
 * Call this after ExportApi.exportCourseGrades() resolves.
 */
export function triggerBase64Download(
	base64: string,
	filename: string,
	mimetype: string
): void {
	const byteChars = atob(base64)
	const byteNums = new Array(byteChars.length)
	for (let i = 0; i < byteChars.length; i++) {
		byteNums[i] = byteChars.charCodeAt(i)
	}
	const blob = new Blob([new Uint8Array(byteNums)], { type: mimetype })
	const url = URL.createObjectURL(blob)
	const a = document.createElement('a')
	a.href = url
	a.download = filename
	document.body.appendChild(a)
	a.click()
	document.body.removeChild(a)
	URL.revokeObjectURL(url)
}
