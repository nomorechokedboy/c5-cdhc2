import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import '@/i18n'
import { semesterFixture } from '@/lib/report/fixtures'
import { SummaryPanel } from './SummaryPanel'

afterEach(cleanup)

describe('SummaryPanel', () => {
	it('shows headcount, class ĐTB and the highest ĐTB', () => {
		render(<SummaryPanel summary={semesterFixture.summary} />)
		expect(screen.getByText('Sĩ số').previousSibling?.textContent).toBe('4')
		expect(screen.getByText('ĐTB lớp').previousSibling?.textContent).toBe(
			'6.87'
		)
		expect(
			screen.getByText('ĐTB cao nhất').previousSibling?.textContent
		).toBe('9.00')
	})

	it('draws one bar segment per non-empty band, sized by its count, with a legend', () => {
		const { container } = render(
			<SummaryPanel summary={semesterFixture.summary} />
		)
		const segments = container.querySelectorAll('[data-band]')
		expect([...segments].map((s) => s.getAttribute('data-band'))).toEqual([
			'xuat_sac',
			'kha',
			'yeu'
		])
		expect((segments[1] as HTMLElement).style.flexGrow).toBe('2')
		const legend = within(
			screen.getByRole('list', { name: 'Phân loại học tập' })
		)
		expect(legend.getByText('Khá').closest('li')?.textContent).toContain(
			'2'
		)
	})

	it('lists the top three in rank order', () => {
		render(<SummaryPanel summary={semesterFixture.summary} />)
		const top = within(
			screen.getByRole('list', { name: 'Ba học viên đứng đầu' })
		)
		expect(
			top.getAllByRole('listitem').map((li) => li.textContent)
		).toEqual([
			expect.stringContaining('Bình Test'),
			expect.stringContaining('An Test'),
			expect.stringContaining('Giang Test')
		])
	})

	it('shows a per-course table only when courses and stats are given', () => {
		const { rerender } = render(
			<SummaryPanel summary={semesterFixture.summary} />
		)
		expect(screen.queryByText('Phân loại theo học phần')).toBeNull()
		rerender(
			<SummaryPanel
				summary={semesterFixture.summary}
				courses={semesterFixture.courses}
			/>
		)
		expect(screen.getByText('Phân loại theo học phần')).toBeTruthy()
		expect(screen.getByText('6.80')).toBeTruthy()
	})

	it('does not draw an empty bar when nobody is classified', () => {
		const { container } = render(
			<SummaryPanel
				summary={{
					headcount: 0,
					classGpa: null,
					maxGpa: null,
					byClassification: {},
					top: []
				}}
			/>
		)
		expect(container.querySelectorAll('[data-band]')).toHaveLength(0)
		expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(2)
	})
})
