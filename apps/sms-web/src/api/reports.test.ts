import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/const', () => ({ ApiUrl: 'http://api.test' }))
vi.mock('./index', () => ({ appFetcher: vi.fn() }))

import { appFetcher } from './index'
import { ReportApi, ReportError } from './reports'

const fetcher = vi.mocked(appFetcher)
const json = (body: unknown, status = 200) =>
	new Response(JSON.stringify(body), { status })

beforeEach(() => fetcher.mockReset())

describe('ReportApi', () => {
	it('reads the class endpoints', async () => {
		fetcher.mockImplementation(async () => json({ ok: 1 }))
		await ReportApi.periods(72)
		await ReportApi.semester(72, 1, 2)
		await ReportApi.year(72, 1)
		expect(fetcher.mock.calls.map((c) => c[0])).toEqual([
			'http://api.test/reports/classes/72/periods',
			'http://api.test/reports/classes/72/years/1/semesters/2',
			'http://api.test/reports/classes/72/years/1'
		])
	})

	it('reads the student endpoints', async () => {
		fetcher.mockImplementation(async () => json({ ok: 1 }))
		await ReportApi.myPeriods()
		await ReportApi.mySemester(1, 2)
		await ReportApi.myYear(1)
		expect(fetcher.mock.calls.map((c) => c[0])).toEqual([
			'http://api.test/reports/me/periods',
			'http://api.test/reports/me/years/1/semesters/2',
			'http://api.test/reports/me/years/1'
		])
	})

	it('saves conduct with a PUT and a JSON body', async () => {
		fetcher.mockResolvedValue(json({ saved: 1 }))
		const entries = [{ studentId: 5, year: 1, semester: 2, score: 8.5 }]
		await expect(ReportApi.saveConduct(72, entries)).resolves.toEqual({
			saved: 1
		})
		const [url, init] = fetcher.mock.calls[0]
		expect(url).toBe('http://api.test/reports/classes/72/conduct')
		expect(init?.method).toBe('PUT')
		expect(JSON.parse(String(init?.body))).toEqual({ entries })
	})

	it('turns an Encore error body into a ReportError', async () => {
		fetcher.mockResolvedValue(
			json({ code: 'not_found', message: 'no such class' }, 404)
		)
		const err = await ReportApi.periods(1).catch((e) => e)
		expect(err).toBeInstanceOf(ReportError)
		expect(err).toMatchObject({
			message: 'no such class',
			status: 404,
			code: 'not_found'
		})
	})

	it('still reports an error whose body is not JSON', async () => {
		fetcher.mockResolvedValue(new Response('boom', { status: 502 }))
		const err = await ReportApi.periods(1).catch((e) => e)
		expect(err).toMatchObject({ status: 502, message: 'HTTP 502' })
	})
})
