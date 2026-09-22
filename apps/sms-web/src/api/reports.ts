import { ApiUrl } from '@/const'
import type {
	ConductEntry,
	MyPeriodsResponse,
	MySemester,
	MyYear,
	PeriodsResponse,
	SemesterReport,
	YearReport
} from '@/lib/report/types'
import { appFetcher } from './index'

export class ReportError extends Error {
	status: number
	code?: string
	constructor(message: string, status: number, code?: string) {
		super(message)
		this.name = 'ReportError'
		this.status = status
		this.code = code
	}
}

async function toError(resp: Response): Promise<ReportError> {
	let body: { code?: string; message?: string } = {}
	try {
		body = await resp.json()
	} catch {
		// not JSON: keep the status text below
	}
	return new ReportError(
		body.message || `HTTP ${resp.status}`,
		resp.status,
		body.code
	)
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
	const resp = await appFetcher(`${ApiUrl}${path}`, init)
	if (!resp.ok) throw await toError(resp)
	return (await resp.json()) as T
}

const classPath = (categoryId: number) => `/reports/classes/${categoryId}`

export const ReportApi = {
	periods: (categoryId: number) =>
		request<PeriodsResponse>(`${classPath(categoryId)}/periods`),
	semester: (categoryId: number, year: number, semester: number) =>
		request<SemesterReport>(
			`${classPath(categoryId)}/years/${year}/semesters/${semester}`
		),
	year: (categoryId: number, year: number) =>
		request<YearReport>(`${classPath(categoryId)}/years/${year}`),
	saveConduct: (categoryId: number, entries: ConductEntry[]) =>
		request<{ saved: number }>(`${classPath(categoryId)}/conduct`, {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ entries })
		}),
	myPeriods: () => request<MyPeriodsResponse>('/reports/me/periods'),
	mySemester: (year: number, semester: number) =>
		request<MySemester>(`/reports/me/years/${year}/semesters/${semester}`),
	myYear: (year: number) => request<MyYear>(`/reports/me/years/${year}`)
}
