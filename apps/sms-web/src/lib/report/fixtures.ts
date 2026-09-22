import type { MySemester, MyYear, SemesterReport, YearReport } from './types'

const cls = { id: 72, name: 'Lớp TEST báo cáo', idnumber: 'TEST.RPT' }

export const semesterFixture: SemesterReport = {
	class: cls,
	year: 1,
	semester: 1,
	totalCredits: 6,
	courses: [
		{ id: 800, shortname: 'GP', fullname: 'Giải phẫu', credits: 4 },
		{ id: 801, shortname: 'SL', fullname: 'Sinh lý', credits: 2 }
	],
	students: [
		{
			id: 1016,
			idnumber: 'TST0001',
			fullname: 'An Test',
			scores: { '800': 8, '801': 6 },
			gpa: 7.33,
			classification: 'kha',
			rank: 2,
			conduct: { score: 8.5, label: 'tot' }
		},
		{
			id: 1017,
			idnumber: 'TST0002',
			fullname: 'Bình Test',
			scores: { '800': 9, '801': 9 },
			gpa: 9,
			classification: 'xuat_sac',
			rank: 1,
			conduct: null
		},
		{
			id: 1020,
			idnumber: 'TST0005',
			fullname: 'Em Test',
			scores: { '800': 3.2, '801': 6 },
			gpa: 4.13,
			classification: 'yeu',
			rank: 4,
			conduct: null
		},
		{
			id: 1021,
			idnumber: 'TST0006',
			fullname: 'Giang Test',
			scores: { '800': 7, '801': null },
			gpa: 7,
			classification: 'kha',
			rank: 3,
			conduct: null
		}
	],
	summary: {
		headcount: 4,
		classGpa: 6.87,
		maxGpa: 9,
		byClassification: { xuat_sac: 1, kha: 2, yeu: 1 },
		perCourse: {
			'800': {
				bands: { gioi: 1, xuat_sac: 1, yeu: 1, kha: 1 },
				mean: 6.8
			},
			'801': {
				bands: { trung_binh_kha: 2, xuat_sac: 1 },
				mean: 7
			}
		},
		top: [
			{ rank: 1, fullname: 'Bình Test', gpa: 9 },
			{ rank: 2, fullname: 'An Test', gpa: 7.33 },
			{ rank: 3, fullname: 'Giang Test', gpa: 7 }
		]
	},
	warnings: [{ code: 'exam_not_held', courseId: 801 }]
}

export const semester2Fixture: SemesterReport = {
	class: cls,
	year: 1,
	semester: 2,
	totalCredits: 2,
	courses: [{ id: 802, shortname: 'KT', fullname: 'Kiểm tra', credits: 2 }],
	students: [
		{
			id: 1016,
			idnumber: 'TST0001',
			fullname: 'An Test',
			scores: { '802': 7 },
			gpa: 7,
			classification: 'kha',
			rank: 2,
			conduct: { score: 7.5, label: 'kha' }
		},
		{
			id: 1017,
			idnumber: 'TST0002',
			fullname: 'Bình Test',
			scores: { '802': 9 },
			gpa: 9,
			classification: 'xuat_sac',
			rank: 1,
			conduct: null
		}
	],
	summary: {
		headcount: 2,
		classGpa: 8,
		maxGpa: 9,
		byClassification: { xuat_sac: 1, kha: 1 },
		perCourse: {
			'802': { bands: { kha: 1, xuat_sac: 1 }, mean: 8 }
		},
		top: [
			{ rank: 1, fullname: 'Bình Test', gpa: 9 },
			{ rank: 2, fullname: 'An Test', gpa: 7 }
		]
	},
	warnings: []
}

export const yearFixture: YearReport = {
	class: cls,
	year: 1,
	totalCredits: 8,
	periods: [semesterFixture, semester2Fixture],
	students: [
		{
			id: 1016,
			idnumber: 'TST0001',
			fullname: 'An Test',
			gpa: 7.25,
			classification: 'kha',
			rank: 2,
			conduct: { score: 8, label: 'tot' }
		},
		{
			id: 1017,
			idnumber: 'TST0002',
			fullname: 'Bình Test',
			gpa: 9,
			classification: 'xuat_sac',
			rank: 1,
			conduct: null
		}
	],
	summary: {
		headcount: 2,
		classGpa: 8.13,
		maxGpa: 9,
		byClassification: { xuat_sac: 1, kha: 1 },
		top: [
			{ rank: 1, fullname: 'Bình Test', gpa: 9 },
			{ rank: 2, fullname: 'An Test', gpa: 7.25 }
		]
	},
	warnings: [{ code: 'exam_not_held', courseId: 801 }]
}

export const mySemesterFixture: MySemester = {
	class: cls,
	year: 1,
	semester: 1,
	totalCredits: 6,
	courses: semesterFixture.courses,
	ranked: 4,
	row: semesterFixture.students[0]
}

export const myYearFixture: MyYear = {
	class: cls,
	year: 1,
	totalCredits: 8,
	ranked: 2,
	row: yearFixture.students[0],
	periods: [
		mySemesterFixture,
		{
			class: cls,
			year: 1,
			semester: 2,
			totalCredits: 2,
			courses: semester2Fixture.courses,
			ranked: 2,
			row: semester2Fixture.students[0]
		}
	]
}
