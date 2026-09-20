import { QueryClientProvider } from '@tanstack/react-query'
import {
	cleanup,
	fireEvent,
	render,
	screen,
	waitFor
} from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Student } from '@/types'

const { updateStudents, getUnits } = vi.hoisted(() => ({
	updateStudents: vi.fn(async () => ({})),
	getUnits: vi.fn(async () => [
		{
			id: 7,
			alias: 'L1',
			name: 'Lớp 1',
			level: 'class',
			parent: { id: 3, name: 'Đại đội 1', alias: 'D1' },
			children: []
		},
		{
			id: 8,
			alias: 'L2',
			name: 'Lớp 2',
			level: 'class',
			parent: { id: 4, name: 'Đại đội 2', alias: 'D2' },
			children: []
		}
	])
}))

vi.mock('@/api', () => ({
	UpdateStudents: updateStudents,
	GetUnits: getUnits,
	UploadFiles: vi.fn()
}))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

import { queryClient } from '@/integrations/tanstack-query/root-provider'
import StudentEditForm from '../StudentEditForm'

const student = {
	id: 1,
	createdAt: '',
	updatedAt: '',
	studentId: 'HV001',
	fullName: 'Nguyễn Văn A',
	dob: '2001-05-06',
	ethnic: 'Kinh',
	religion: 'Không',
	rank: 'Binh nhì',
	politicalOrg: 'hcyu',
	fatherDob: '1975-12-31',
	cpvOfficialAt: null,
	familySize: 4,
	unitId: 7,
	unit: {
		id: 7,
		alias: 'L1',
		name: 'Lớp 1',
		level: 'class',
		parent: { id: 3, name: 'Đại đội 1', alias: 'D1', level: 'company' }
	},
	childrenInfos: [{ fullName: 'Con', dob: '2020-02-03' }],
	siblings: []
} as unknown as Student

function renderForm(onClose = vi.fn()) {
	render(
		<QueryClientProvider client={queryClient}>
			<StudentEditForm student={student} onClose={onClose} />
		</QueryClientProvider>
	)
	return onClose
}

beforeEach(() => {
	vi.stubGlobal(
		'ResizeObserver',
		class {
			observe() {}
			unobserve() {}
			disconnect() {}
		}
	)
	Element.prototype.scrollIntoView = vi.fn()
	updateStudents.mockClear()
})
afterEach(cleanup)

describe('StudentEditForm', () => {
	it('shows stored ISO dates as dd/mm/yyyy in date inputs', () => {
		renderForm()
		expect(screen.getByDisplayValue('06/05/2001')).toBeTruthy() // dob
		expect(screen.getByDisplayValue('31/12/1975')).toBeTruthy() // fatherDob
		expect(screen.getByDisplayValue('03/02/2020')).toBeTruthy() // child dob
	})

	it('shows the selected option for string selects and for the numeric unitId', async () => {
		renderForm()
		expect(screen.getByRole('combobox', { name: /Kinh/ })).toBeTruthy()
		await waitFor(() =>
			expect(screen.getByRole('combobox', { name: /Lớp 1/ })).toBeTruthy()
		)
	})

	it('submits dates as yyyy-mm-dd and unitId/familySize as numbers, then closes', async () => {
		const onClose = renderForm()
		await waitFor(() => screen.getByRole('combobox', { name: /Lớp 1/ }))

		fireEvent.click(screen.getByRole('button', { name: 'Lưu thay đổi' }))

		await waitFor(() => expect(updateStudents).toHaveBeenCalledTimes(1))
		const [{ data }] = updateStudents.mock.calls[0] as unknown as [
			{ data: Array<Record<string, any>> }
		]
		const sent = data[0]
		expect(sent.dob).toBe('2001-05-06')
		expect(sent.fatherDob).toBe('1975-12-31')
		expect(sent.childrenInfos[0].dob).toBe('2020-02-03')
		expect(sent.unitId).toBe(7)
		expect(sent.familySize).toBe(4)
		expect('unit' in sent).toBe(false)
		expect('avatarFile' in sent).toBe(false)
		await waitFor(() => expect(onClose).toHaveBeenCalled())
	})

	it('blocks saving when a date is not a valid dd/mm/yyyy', async () => {
		renderForm()
		const dob = screen.getByDisplayValue('06/05/2001') as HTMLInputElement
		fireEvent.change(dob, { target: { value: '' } })
		// gõ từng ký tự như người dùng thật
		for (const ch of '31022001') {
			fireEvent.change(dob, { target: { value: dob.value + ch } })
		}
		expect(dob.value).toBe('31/02/2001')

		fireEvent.click(screen.getByRole('button', { name: 'Lưu thay đổi' }))

		await waitFor(() =>
			expect(screen.getAllByText(/không hợp lệ/i).length).toBeGreaterThan(
				0
			)
		)
		expect(updateStudents).not.toHaveBeenCalled()
	})

	describe('date mask', () => {
		const setup = () => {
			renderForm()
			return screen.getByDisplayValue('06/05/2001') as HTMLInputElement
		}
		const change = (el: HTMLInputElement, value: string) =>
			fireEvent.change(el, { target: { value } })

		it.each([
			['05022001', '05/02/2001'],
			['5/2/2001', '05/02/2001'],
			['05-02-2001', '05/02/2001'],
			['05/02/2001', '05/02/2001'],
			['0502', '05/02/'],
			['31/02', '31/02/']
		])('pastes %s over the whole value as %s', (pasted, expected) => {
			const dob = setup()
			change(dob, pasted)
			expect(dob.value).toBe(expected)
		})

		it('types forward through the separators', () => {
			const dob = setup()
			change(dob, '')
			let out = ''
			for (const ch of '05022001') {
				change(dob, dob.value + ch)
				out = dob.value
			}
			expect(out).toBe('05/02/2001')
		})

		it.each([
			['06/05/200', '06/05/200'], // xoá số cuối của năm
			['0/05/2001', '0/05/2001'], // xoá số cuối của ngày
			['06/5/2001', '06/5/2001'], // xoá số cuối của tháng
			['0605/2001', '0/05/2001'] // xoá dấu "/" → xoá số đứng trước nó
		])(
			'backspace edit %s keeps other segments intact',
			(input, expected) => {
				const dob = setup()
				change(dob, input)
				expect(dob.value).toBe(expected)
			}
		)

		it('ignores non-digit typing', () => {
			const dob = setup()
			change(dob, '06/05/2001a')
			expect(dob.value).toBe('06/05/2001')
		})
	})
})
