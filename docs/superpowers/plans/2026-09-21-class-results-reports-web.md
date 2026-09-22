# Class Results Reports — Web Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give admins, managers and students report pages for a class's semester and year results in `apps/sms-web`, with rèn luyện entry and an Excel export, reading every number from sms-api.

**Architecture:** The browser only renders and exports the JSON that `sms-api` (`usrreports` service) already computes; there is no grade maths in the web app. A thin fetch wrapper (`src/api/reports.ts`, same style as `src/api/export.ts`) plus TanStack Query hooks feed presentational components under `src/components/reports/`. The xlsx file is built in the browser with `exceljs` (loaded lazily) from the same JSON.

**Tech Stack:** React 19, Vite 6, TanStack Router (file routes) and Query, Tailwind v4, `@repo/ui` shadcn components, i18next (`src/i18n/vi.json`), vitest 3 + Testing Library, `exceljs`.

**Spec:** `docs/superpowers/specs/2026-09-21-class-results-reports-design.md` (§7 Web, §8 Export). Backend plan already executed: `docs/superpowers/plans/2026-09-21-class-results-reports-backend.md`.

## Global Constraints

- All calculation lives in sms-api. The web app never computes ĐMH, ĐTB, xếp loại, hạng or rèn luyện averages. It may only choose colours by fixed thresholds, look rows up by id, and sort/filter period lists.
- Access: `/khoa-hoc/$categoryIdnumber/ket-qua` for admin and manager only; `/ket-qua` for students only (teachers get neither). Students only ever receive their own row.
- Export is **xlsx only**, built in the browser with `exceljs`, imported lazily (`await import('exceljs')`). Scores are written as numbers, never strings.
- Score display is 2 decimals (`formatScore`), rèn luyện 1 decimal. The xlsx uses number formats `0.00` (scores, ĐTB), `0.0` (rèn luyện), `0` (hạng), so the file equals the screen. (The spec says "one-decimal format"; the regulation defines ĐMH to 2 decimals and the spec also requires screen and file to be identical, so 2 decimals wins.)
- Colour bands from the sample legend: score ≥ 9 → `--success`, 5 ≤ score < 7 → `--warning`, score < 5 → circled in red by the existing `Score` component (`score-fail`).
- All UI text goes in `apps/sms-web/src/i18n/vi.json` under a new `report` block; components use `useTranslation()`; no hard-coded Vietnamese in components.
- Explicit loading, empty, error and warning states everywhere; nothing renders `NaN`, `undefined` or a blank table silently.
- Design identity is "Vở ghi điểm": reuse `Score`, `.score`, `.paper`, `.total-rule`, `Ledger`-style number strips, tokens `--success`, `--warning`, `--rule`. No new fonts, no new colour tokens.
- Code style: tabs, single quotes, no semicolons, `@/` alias, `@repo/ui/components/ui/*` imports.
- Tests: `cd apps/sms-web && pnpm exec vitest run <file>`. Type check: `pnpm exec tsc --noEmit 2>&1 | grep -E "src/(lib/report|components/reports|api/reports|routes)"` must print nothing for files this plan touches.
- Do not commit unless the user asks. Each task ends with a **Commit** step; skip it (leave files staged-free) unless told to commit. Commit trailer: `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>`.
- Do not touch unrelated dirty files (`apps/api/local.db`, `apps/web/src/api/client.ts`, `packages/coursegrades/...`, etc.).
- Out of scope (separate plan): aligning the student dashboard, the teacher grade table and the Moodle `customgradeexport` plugin with the regulation numbers (`calculateFinalGrade`, `getGradeColor`, `overallScore`).

---

## File Structure

Backend (Task 1):
- Modify `apps/sms-api/internal/classreport/me.go` — `MyPeriodsResponse`.
- Modify `apps/sms-api/internal/classreport/service.go` — `MyPeriods`.
- Modify `apps/sms-api/internal/classreport/service_test.go` — test.
- Modify `apps/sms-api/usrreports/reports.go` — `GET /reports/me/periods`.

Web (`apps/sms-web/src`):
- `lib/report/types.ts` — TS types mirroring the API JSON.
- `lib/report/labels.ts` — band order, i18n key helpers, `scoreTone`, `TONE_CLASS`, `BAND_BAR`.
- `lib/report/periods.ts` — `yearsOf`, `semestersOf`, `latestPeriod`, `resolvePeriod`.
- `lib/report/category.ts` — `categoryFromParam`.
- `lib/report/fixtures.ts` — test fixtures (semester, year, student results).
- `lib/report/export/workbook.ts` — xlsx builders and download.
- `api/reports.ts` — `ReportApi`, `ReportError`.
- `components/reports/useReport.ts` — query and mutation hooks.
- `components/reports/ConductInput.tsx` — inline rèn luyện input and `parseConduct`.
- `components/reports/cells.tsx` — shared table cells.
- `components/reports/ReportTable.tsx` — semester table.
- `components/reports/YearTable.tsx` — year table.
- `components/reports/SummaryPanel.tsx`, `WarningsBanner.tsx`, `ReportStates.tsx`.
- `components/reports/ReportExportButton.tsx`, `PeriodPicker.tsx`.
- `components/reports/SemesterReportView.tsx`, `YearReportView.tsx`, `ClassResultsPage.tsx`.
- `components/reports/MyResultCards.tsx`, `MyResultsPage.tsx` — student cards, views and page.
- `routes/khoa-hoc/$categoryIdnumber/ket-qua.tsx`, `routes/ket-qua.tsx`.
- Modify: `i18n/vi.json`, `routes/khoa-hoc/$categoryIdnumber/index.tsx`, `components/app-sidebar.tsx`, `components/student/dashboard.tsx`, `routeTree.gen.ts` (regenerated), `package.json` (+ `exceljs`).

---

### Task 1: Backend — `GET /reports/me/periods` for students

A student has no way to learn which (year, semester) pairs their class has. Add a student-only endpoint that returns them, with no course names or warnings.

**Files:**
- Modify: `apps/sms-api/internal/classreport/me.go`
- Modify: `apps/sms-api/internal/classreport/service.go` (after `MyYear`)
- Modify: `apps/sms-api/internal/classreport/service_test.go` (after `TestMyYearHasEachSemester`)
- Modify: `apps/sms-api/usrreports/reports.go` (before `GetMySemesterResult`)

**Interfaces:**
- Consumes: `Service.Periods(ctx, categoryID int) (*PeriodsResponse, error)`, `s.classes.ClassOf(ctx, userID int64) (int, error)`, `Period{Year, Semester, Courses}`.
- Produces: `classreport.MyPeriodsResponse{Class reporting.Class "class"; Periods []Period "periods"}`; `(*Service).MyPeriods(ctx, userID int64) (*MyPeriodsResponse, error)`; HTTP `GET /reports/me/periods` (auth, student only) → `{class:{id,name,idnumber}, periods:[{year,semester,courses}]}`.

- [ ] **Step 1: Write the failing test**

Append to `service_test.go`:

```go
func TestMyPeriodsHasNoCourseNamesOrUnassigned(t *testing.T) {
	svc, _, _ := fixture()
	mine, err := svc.MyPeriods(ctx, 1)
	if err != nil {
		t.Fatal(err)
	}
	if mine.Class.IDNumber != "Y53" || len(mine.Periods) != 2 {
		t.Fatalf("periods = %+v", mine)
	}
	body, _ := json.Marshal(mine)
	if strings.Contains(string(body), "OLD") || strings.Contains(string(body), "unassigned") {
		t.Fatalf("staff-only data leaked: %s", body)
	}

	svc.classes = fakeClasses{} // student enrolled nowhere
	if _, err := svc.MyPeriods(ctx, 1); !errors.Is(err, ErrNotFound) {
		t.Fatalf("no class: %v", err)
	}
}
```

- [ ] **Step 2: Run it to see it fail**

Run: `cd apps/sms-api && ENV=test encore test ./internal/classreport/ -run TestMyPeriods`
Expected: FAIL to compile, `svc.MyPeriods undefined`.

- [ ] **Step 3: Implement**

In `me.go`, after the `MyYear` type:

```go
// MyPeriodsResponse lists the periods of the caller's own class. Unlike the
// staff listing it has no course names and no unassigned courses.
type MyPeriodsResponse struct {
	Class   reporting.Class `json:"class"`
	Periods []Period        `json:"periods"`
}
```

In `service.go`, after `MyYear`:

```go
// MyPeriods lists the periods of the student's own class.
func (s *Service) MyPeriods(ctx context.Context, userID int64) (*MyPeriodsResponse, error) {
	categoryID, err := s.classes.ClassOf(ctx, userID)
	if err != nil {
		return nil, err
	}
	resp, err := s.Periods(ctx, categoryID)
	if err != nil {
		return nil, err
	}
	return &MyPeriodsResponse{Class: resp.Class, Periods: resp.Periods}, nil
}
```

In `usrreports/reports.go`, before `GetMySemesterResult`:

```go
// GetMyPeriods lists the periods of the caller's own class.
//
//encore:api auth method=GET path=/reports/me/periods
func (s *Service) GetMyPeriods(ctx context.Context) (*classreport.MyPeriodsResponse, error) {
	payload, err := requireStudent()
	if err != nil {
		return nil, err
	}
	resp, err := s.reports.MyPeriods(ctx, payload.UserID)
	return resp, toAPIError(ctx, err)
}
```

- [ ] **Step 4: Run tests and the compile check**

Run: `cd apps/sms-api && ENV=test encore test ./internal/classreport/... && encore check`
Expected: PASS, `encore check` prints no errors.

- [ ] **Step 5: Commit** (only if asked)

```bash
git add apps/sms-api/internal/classreport apps/sms-api/usrreports/reports.go
git commit -m "feat(api): list a student's own class periods"
```

---

### Task 2: Foundations — dependency, types, helpers, fixtures, i18n

**Files:**
- Modify: `apps/sms-web/package.json` (via pnpm), `pnpm-lock.yaml`
- Create: `apps/sms-web/src/lib/report/{types,labels,periods,category,fixtures}.ts`
- Create tests: `apps/sms-web/src/lib/report/{labels,periods,category}.test.ts`
- Modify: `apps/sms-web/src/i18n/vi.json`

**Interfaces:**
- Produces (used by every later task):
  - `types.ts`: `Band`, `ConductLabel`, `ReportClass`, `ReportCourse`, `Conduct`, `StudentRow`, `CourseStats`, `TopEntry`, `Summary`, `WarningCode`, `ReportWarning`, `SemesterReport`, `YearRow`, `YearReport`, `Period`, `UnassignedCourse`, `PeriodsResponse`, `MyPeriodsResponse`, `MySemester`, `MyYear`, `ConductEntry`.
  - `labels.ts`: `BANDS: Band[]`, `bandKey(b) => 'report.band.<b>'`, `conductKey(l) => 'report.conductBand.<l>'`, `type Tone = 'good' | 'warn' | 'none'`, `scoreTone(v: number): Tone`, `TONE_CLASS: Record<Tone,string>`, `BAND_BAR: Record<Band,string>`.
  - `periods.ts`: `interface PeriodKey {year:number; semester:number}`, `yearsOf(ps: PeriodKey[]): number[]`, `semestersOf(ps, year): number[]`, `latestPeriod(ps): PeriodKey | null`, `resolvePeriod(ps, wanted: Partial<PeriodKey>): PeriodKey | null`.
  - `category.ts`: `categoryFromParam(categories: CourseCategory[], param: string): CourseCategory | undefined`.
  - `fixtures.ts`: `semesterFixture: SemesterReport`, `semester2Fixture: SemesterReport`, `yearFixture: YearReport`, `mySemesterFixture: MySemester`, `myYearFixture: MyYear`.

- [ ] **Step 1: Install exceljs**

Run: `cd /home/hadius/Workspace/monorepo/turborepo/unamed-repo && pnpm --filter sms-web add exceljs`
Expected: `exceljs` appears under `dependencies` in `apps/sms-web/package.json`.

- [ ] **Step 2: Create `src/lib/report/types.ts`**

```ts
// Shapes of the sms-api `usrreports` JSON. Nothing here is computed in the browser.

export type Band =
	| 'xuat_sac'
	| 'gioi'
	| 'kha'
	| 'trung_binh_kha'
	| 'trung_binh'
	| 'yeu'

export type ConductLabel =
	| 'xuat_sac'
	| 'tot'
	| 'kha'
	| 'trung_binh'
	| 'yeu'
	| 'kem'

export interface ReportClass {
	id: number
	name: string
	idnumber: string
}

export interface ReportCourse {
	id: number
	shortname: string
	fullname: string
	credits: number
}

export interface Conduct {
	score: number
	label: ConductLabel
}

export interface StudentRow {
	id: number
	idnumber: string
	fullname: string
	/** courseId (as string) → ĐMH, or null when the course is not scored */
	scores: Record<string, number | null>
	gpa: number | null
	classification: Band | null
	rank: number | null
	conduct: Conduct | null
}

export interface CourseStats {
	bands: Partial<Record<Band, number>>
	mean: number | null
}

export interface TopEntry {
	rank: number
	fullname: string
	gpa: number
}

export interface Summary {
	headcount: number
	classGpa: number | null
	maxGpa: number | null
	byClassification: Partial<Record<Band, number>>
	perCourse?: Record<string, CourseStats>
	top: TopEntry[]
}

export type WarningCode =
	| 'course_no_grade_items'
	| 'exam_not_held'
	| 'test_count_mismatch'
	| 'course_no_credits'

export interface ReportWarning {
	code: WarningCode
	courseId?: number
}

export interface SemesterReport {
	class: ReportClass
	year: number
	semester: number
	totalCredits: number
	courses: ReportCourse[]
	students: StudentRow[]
	summary: Summary
	warnings: ReportWarning[]
}

export interface YearRow {
	id: number
	idnumber: string
	fullname: string
	gpa: number | null
	classification: Band | null
	rank: number | null
	conduct: Conduct | null
}

export interface YearReport {
	class: ReportClass
	year: number
	totalCredits: number
	periods: SemesterReport[]
	students: YearRow[]
	summary: Summary
	warnings: ReportWarning[]
}

export interface Period {
	year: number
	semester: number
	courses: number
}

export interface UnassignedCourse {
	id: number
	shortname: string
	missing: string[]
}

export interface PeriodsResponse {
	class: ReportClass
	periods: Period[]
	unassigned: UnassignedCourse[]
}

export interface MyPeriodsResponse {
	class: ReportClass
	periods: Period[]
}

export interface MySemester {
	class: ReportClass
	year: number
	semester: number
	totalCredits: number
	courses: ReportCourse[]
	ranked: number
	row: StudentRow
}

export interface MyYear {
	class: ReportClass
	year: number
	totalCredits: number
	ranked: number
	row: YearRow
	periods: MySemester[]
}

export interface ConductEntry {
	studentId: number
	year: number
	semester: number
	/** null deletes the stored score */
	score: number | null
}
```

- [ ] **Step 3: Write failing tests for labels, periods, category**

`src/lib/report/labels.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { BANDS, TONE_CLASS, bandKey, conductKey, scoreTone } from './labels'

describe('scoreTone', () => {
	it.each([
		[10, 'good'],
		[9, 'good'],
		[8.99, 'none'],
		[7, 'none'],
		[6.99, 'warn'],
		[5, 'warn'],
		[4.99, 'none'],
		[0, 'none']
	])('%s is %s', (value, tone) => {
		expect(scoreTone(value)).toBe(tone)
	})

	it('has a class for every tone, empty for none', () => {
		expect(TONE_CLASS.good).toContain('success')
		expect(TONE_CLASS.warn).toContain('warning')
		expect(TONE_CLASS.none).toBe('')
	})
})

describe('keys', () => {
	it('lists the six study bands best first', () => {
		expect(BANDS).toEqual([
			'xuat_sac',
			'gioi',
			'kha',
			'trung_binh_kha',
			'trung_binh',
			'yeu'
		])
	})
	it('builds i18n keys', () => {
		expect(bandKey('gioi')).toBe('report.band.gioi')
		expect(conductKey('tot')).toBe('report.conductBand.tot')
	})
})
```

`src/lib/report/periods.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { latestPeriod, resolvePeriod, semestersOf, yearsOf } from './periods'

const ps = [
	{ year: 1, semester: 1 },
	{ year: 1, semester: 2 },
	{ year: 2, semester: 1 },
	{ year: 2, semester: 2 },
	{ year: 2, semester: 3 }
]

describe('periods', () => {
	it('lists years and the semesters of a year, ascending', () => {
		expect(yearsOf([...ps].reverse())).toEqual([1, 2])
		expect(semestersOf(ps, 2)).toEqual([1, 2, 3])
		expect(semestersOf(ps, 9)).toEqual([])
	})

	it('finds the latest period, or none', () => {
		expect(latestPeriod(ps)).toEqual({ year: 2, semester: 3 })
		expect(latestPeriod([])).toBeNull()
	})

	it('keeps a valid choice', () => {
		expect(resolvePeriod(ps, { year: 1, semester: 2 })).toEqual({
			year: 1,
			semester: 2
		})
	})

	it('falls back to the latest semester of the year, then to the latest period', () => {
		expect(resolvePeriod(ps, { year: 1, semester: 9 })).toEqual({
			year: 1,
			semester: 2
		})
		expect(resolvePeriod(ps, { year: 1 })).toEqual({ year: 1, semester: 2 })
		expect(resolvePeriod(ps, { year: 7 })).toEqual({ year: 2, semester: 3 })
		expect(resolvePeriod(ps, {})).toEqual({ year: 2, semester: 3 })
		expect(resolvePeriod([], {})).toBeNull()
	})
})
```

`src/lib/report/category.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { CourseCategory } from '@/types'
import { categoryFromParam } from './category'

const cats = [
	new CourseCategory(1, 'Lớp A', '', 'Y53', true, 0, 0),
	new CourseCategory(2, 'Lớp B', '', '', true, 0, 0)
]

describe('categoryFromParam', () => {
	it('matches by idnumber, or by id when the category has none', () => {
		expect(categoryFromParam(cats, 'Y53')?.id).toBe(1)
		expect(categoryFromParam(cats, '2')?.id).toBe(2)
	})
	it('does not match the id of a category that has an idnumber', () => {
		expect(categoryFromParam(cats, '1')).toBeUndefined()
	})
})
```

- [ ] **Step 4: Run to verify failure**

Run: `cd apps/sms-web && pnpm exec vitest run src/lib/report`
Expected: FAIL, cannot find `./labels`, `./periods`, `./category`.

- [ ] **Step 5: Implement the helpers**

`src/lib/report/labels.ts`:

```ts
import type { Band, ConductLabel } from './types'

/** Study bands, best first (the order used for bars, legends and sheets). */
export const BANDS: Band[] = [
	'xuat_sac',
	'gioi',
	'kha',
	'trung_binh_kha',
	'trung_binh',
	'yeu'
]

export const bandKey = (band: Band) => `report.band.${band}`
export const conductKey = (label: ConductLabel) =>
	`report.conductBand.${label}`

/** Colour band of a score cell, from the sample legend. Below 5 the Score component circles it in red. */
export type Tone = 'good' | 'warn' | 'none'

export function scoreTone(value: number): Tone {
	if (value >= 9) return 'good'
	if (value >= 5 && value < 7) return 'warn'
	return 'none'
}

export const TONE_CLASS: Record<Tone, string> = {
	good: 'bg-success/15',
	warn: 'bg-warning/20',
	none: ''
}

/** Segment colour of each study band in the distribution bar. */
export const BAND_BAR: Record<Band, string> = {
	xuat_sac: 'bg-success',
	gioi: 'bg-success/70',
	kha: 'bg-primary/60',
	trung_binh_kha: 'bg-warning/80',
	trung_binh: 'bg-warning/55',
	yeu: 'bg-destructive'
}
```

`src/lib/report/periods.ts`:

```ts
export interface PeriodKey {
	year: number
	semester: number
}

const asc = (a: number, b: number) => a - b

export const yearsOf = (periods: PeriodKey[]) =>
	[...new Set(periods.map((p) => p.year))].sort(asc)

export const semestersOf = (periods: PeriodKey[], year: number) =>
	periods
		.filter((p) => p.year === year)
		.map((p) => p.semester)
		.sort(asc)

export function latestPeriod(periods: PeriodKey[]): PeriodKey | null {
	if (periods.length === 0) return null
	const year = Math.max(...periods.map((p) => p.year))
	const semesters = semestersOf(periods, year)
	return { year, semester: semesters[semesters.length - 1] }
}

/**
 * Turns a possibly stale or partial choice into a period that exists: keep it
 * if valid, else the latest semester of the chosen year, else the latest period.
 */
export function resolvePeriod(
	periods: PeriodKey[],
	wanted: Partial<PeriodKey>
): PeriodKey | null {
	if (periods.length === 0) return null
	if (wanted.year !== undefined) {
		const semesters = semestersOf(periods, wanted.year)
		if (semesters.length > 0) {
			if (
				wanted.semester !== undefined &&
				semesters.includes(wanted.semester)
			) {
				return { year: wanted.year, semester: wanted.semester }
			}
			return {
				year: wanted.year,
				semester: semesters[semesters.length - 1]
			}
		}
	}
	return latestPeriod(periods)
}
```

`src/lib/report/category.ts`:

```ts
import type { CourseCategory } from '@/types'

/** The URL segment of a category is its idnumber, or its id when it has none (same rule as the sidebar). */
export function categoryFromParam(
	categories: CourseCategory[],
	param: string
): CourseCategory | undefined {
	return categories.find(
		(c) => (c.idnumber?.trim() ? c.idnumber : String(c.id)) === param
	)
}
```

- [ ] **Step 6: Run to verify pass**

Run: `cd apps/sms-web && pnpm exec vitest run src/lib/report`
Expected: PASS (all three files).

- [ ] **Step 7: Create `src/lib/report/fixtures.ts`** (values are consistent with the regulation, hand-checked: An = (8·4 + 6·2)/6 = 7.33)

```ts
import type {
	MySemester,
	MyYear,
	SemesterReport,
	YearReport
} from './types'

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
```

- [ ] **Step 8: Add the `report` block to `src/i18n/vi.json`**

Insert it before the `"sidebar": {` key (anchor: the line `	"sidebar": {` that is followed by `"loading": "Đang tải môn học..."`). Add exactly:

```json
	"report": {
		"title": "Kết quả học tập",
		"classTitle": "Kết quả học tập lớp {{name}}",
		"back": "Về danh sách môn học",
		"tabSemester": "Học kỳ",
		"tabYear": "Cả năm",
		"year": "Năm {{number}}",
		"semester": "Học kỳ {{number}}",
		"pickYear": "Năm học",
		"pickSemester": "Học kỳ",
		"col": {
			"no": "STT",
			"idnumber": "Mã học viên",
			"name": "Họ và tên",
			"courses": "Điểm học phần",
			"summary": "Tổng kết",
			"gpa": "ĐTB",
			"gpaYear": "ĐTB năm",
			"classification": "Xếp loại",
			"rank": "Hạng",
			"conduct": "Rèn luyện",
			"conductYear": "Rèn luyện năm",
			"conductLabel": "Xếp loại rèn luyện",
			"credits": "{{count}} TC"
		},
		"band": {
			"xuat_sac": "Xuất sắc",
			"gioi": "Giỏi",
			"kha": "Khá",
			"trung_binh_kha": "Trung bình khá",
			"trung_binh": "Trung bình",
			"yeu": "Yếu"
		},
		"conductBand": {
			"xuat_sac": "Xuất sắc",
			"tot": "Tốt",
			"kha": "Khá",
			"trung_binh": "Trung bình",
			"yeu": "Yếu",
			"kem": "Kém"
		},
		"summary": {
			"title": "Tổng hợp lớp",
			"headcount": "Sĩ số",
			"classGpa": "ĐTB lớp",
			"maxGpa": "ĐTB cao nhất",
			"distribution": "Phân loại học tập",
			"top": "Ba học viên đứng đầu",
			"perCourse": "Phân loại theo học phần",
			"course": "Học phần",
			"mean": "Điểm trung bình"
		},
		"warning": {
			"title": "Cần lưu ý",
			"course_no_grade_items": "Học phần {{course}} chưa có cột điểm nào.",
			"exam_not_held": "Học phần {{course}} chưa có điểm thi, kết quả có thể chỉ là tạm thời.",
			"test_count_mismatch": "Học phần {{course}} có số bài kiểm tra chưa đúng quy chế (Điều 10.4).",
			"course_no_credits": "Học phần {{course}} chưa có số tín chỉ nên không được tính."
		},
		"unassigned": "{{count}} học phần chưa được xếp vào kỳ nào (thiếu {{fields}}): {{courses}}",
		"states": {
			"loading": "Đang tải kết quả",
			"empty": "Chưa có điểm để lập báo cáo.",
			"noPeriods": "Lớp này chưa có học phần nào gắn năm học và học kỳ.",
			"error": "Không tải được kết quả",
			"retry": "Thử lại",
			"classNotFound": "Không tìm thấy lớp này.",
			"noScore": "Chưa có điểm"
		},
		"conduct": {
			"invalid": "Nhập số từ 0 đến 10, tối đa một chữ số thập phân",
			"saved": "Đã lưu điểm rèn luyện",
			"saveError": "Lưu điểm rèn luyện thất bại",
			"for": "Rèn luyện của {{name}}"
		},
		"export": {
			"button": "Tải Excel",
			"exporting": "Đang xuất",
			"success": "Đã xuất file Excel",
			"error": "Xuất file Excel thất bại",
			"school": "TRƯỜNG CAO ĐẲNG HẬU CẦN 2",
			"titleSemester": "KẾT QUẢ HỌC TẬP HỌC KỲ {{semester}} NĂM {{year}}",
			"titleYear": "KẾT QUẢ HỌC TẬP NĂM {{year}}",
			"class": "Lớp: {{name}}",
			"sheetResults": "Kết quả",
			"sheetSummary": "Tổng hợp",
			"legendTitle": "Chú thích",
			"legendGood": "Từ 9,00 trở lên",
			"legendWarn": "Từ 5,00 đến dưới 7,00",
			"legendFail": "Dưới 5,00 (chưa đạt)",
			"place": "……………, ngày …… tháng …… năm ……",
			"principal": "HIỆU TRƯỞNG",
			"dean": "TRƯỞNG PHÒNG ĐÀO TẠO",
			"signHint": "(Ký, ghi rõ họ tên)"
		},
		"mine": {
			"title": "Kết quả học tập của tôi",
			"subtitle": "Điểm trung bình, xếp loại và thứ hạng của bạn trong lớp.",
			"rankOf": "Hạng {{rank}}/{{ranked}} trong lớp",
			"notRanked": "Chưa xếp hạng",
			"noClass": "Chưa xác định được lớp của bạn hoặc lớp chưa có kết quả.",
			"conduct": "Rèn luyện",
			"credits": "Tín chỉ",
			"yearTitle": "Tổng kết năm {{number}}"
		},
		"link": {
			"classResults": "Kết quả lớp",
			"myResults": "Kết quả học tập"
		}
	},
```

- [ ] **Step 9: Verify JSON and tests**

Run: `cd apps/sms-web && node -e "JSON.parse(require('fs').readFileSync('src/i18n/vi.json','utf8'));console.log('ok')" && pnpm exec vitest run src/lib/report`
Expected: `ok`, tests PASS.

- [ ] **Step 10: Commit** (only if asked)

```bash
git add apps/sms-web/package.json pnpm-lock.yaml apps/sms-web/src/lib/report apps/sms-web/src/i18n/vi.json
git commit -m "feat(sms-web): report types, helpers and copy"
```

---

### Task 3: API wrapper and query hooks

**Files:**
- Create: `apps/sms-web/src/api/reports.ts`, `apps/sms-web/src/api/reports.test.ts`
- Create: `apps/sms-web/src/components/reports/useReport.ts`

The Encore-generated `src/api/client.ts` is not regenerated (its header is v1.50.4 and regenerating rewrites the whole file); like `src/api/export.ts`, the new endpoints go through `appFetcher` so the token refresh flow still applies.

**Interfaces:**
- Consumes: `appFetcher(url, init?)` from `@/api`, `ApiUrl` from `@/const`, types from Task 2, `CategoryApi.GetCategories(): Promise<CourseCategory[]>`.
- Produces:
  - `class ReportError extends Error { status: number; code?: string }`
  - `ReportApi.periods(categoryId)`, `.semester(categoryId, year, semester)`, `.year(categoryId, year)`, `.saveConduct(categoryId, entries: ConductEntry[]): Promise<{saved:number}>`, `.myPeriods()`, `.mySemester(year, semester)`, `.myYear(year)`
  - `useReport.ts`: `useCategories()`, `usePeriods(categoryId)`, `useSemesterReport(categoryId, year, semester)`, `useYearReport(categoryId, year)`, `useSaveConduct(categoryId)` (mutation taking `ConductEntry[]`), `useMyPeriods()`, `useMySemester(year, semester)`, `useMyYear(year)`; each query hook returns the TanStack `UseQueryResult`.

- [ ] **Step 1: Write the failing test `src/api/reports.test.ts`**

```ts
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
```

- [ ] **Step 2: Run to see it fail**

Run: `cd apps/sms-web && pnpm exec vitest run src/api/reports.test.ts`
Expected: FAIL, cannot resolve `./reports`.

- [ ] **Step 3: Implement `src/api/reports.ts`**

```ts
import { ApiUrl } from '@/const'
import { appFetcher } from './index'
import type {
	ConductEntry,
	MyPeriodsResponse,
	MySemester,
	MyYear,
	PeriodsResponse,
	SemesterReport,
	YearReport
} from '@/lib/report/types'

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
		request<MySemester>(
			`/reports/me/years/${year}/semesters/${semester}`
		),
	myYear: (year: number) => request<MyYear>(`/reports/me/years/${year}`)
}
```

- [ ] **Step 4: Implement `src/components/reports/useReport.ts`**

```ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CategoryApi } from '@/api'
import { ReportApi } from '@/api/reports'
import type { ConductEntry } from '@/lib/report/types'

export const reportKeys = {
	classRoot: (categoryId: number) => ['report', 'class', categoryId] as const,
	periods: (categoryId: number) =>
		['report', 'class', categoryId, 'periods'] as const,
	semester: (categoryId: number, year: number, semester: number) =>
		['report', 'class', categoryId, 'semester', year, semester] as const,
	year: (categoryId: number, year: number) =>
		['report', 'class', categoryId, 'year', year] as const,
	myPeriods: ['report', 'me', 'periods'] as const,
	mySemester: (year: number, semester: number) =>
		['report', 'me', 'semester', year, semester] as const,
	myYear: (year: number) => ['report', 'me', 'year', year] as const
}

// Same key as the dashboards, so the list is shared and cached.
export const useCategories = () =>
	useQuery({ queryKey: ['categories'], queryFn: CategoryApi.GetCategories })

export const usePeriods = (categoryId: number) =>
	useQuery({
		queryKey: reportKeys.periods(categoryId),
		queryFn: () => ReportApi.periods(categoryId)
	})

export const useSemesterReport = (
	categoryId: number,
	year: number,
	semester: number
) =>
	useQuery({
		queryKey: reportKeys.semester(categoryId, year, semester),
		queryFn: () => ReportApi.semester(categoryId, year, semester)
	})

export const useYearReport = (categoryId: number, year: number) =>
	useQuery({
		queryKey: reportKeys.year(categoryId, year),
		queryFn: () => ReportApi.year(categoryId, year)
	})

/** Saves rèn luyện and refetches the class's semester and year reports (the year value is derived). */
export function useSaveConduct(categoryId: number) {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (entries: ConductEntry[]) =>
			ReportApi.saveConduct(categoryId, entries),
		onSuccess: () =>
			Promise.all([
				queryClient.invalidateQueries({
					queryKey: [...reportKeys.classRoot(categoryId), 'semester']
				}),
				queryClient.invalidateQueries({
					queryKey: [...reportKeys.classRoot(categoryId), 'year']
				})
			])
	})
}

export const useMyPeriods = () =>
	useQuery({ queryKey: reportKeys.myPeriods, queryFn: ReportApi.myPeriods })

export const useMySemester = (year: number, semester: number) =>
	useQuery({
		queryKey: reportKeys.mySemester(year, semester),
		queryFn: () => ReportApi.mySemester(year, semester)
	})

export const useMyYear = (year: number) =>
	useQuery({
		queryKey: reportKeys.myYear(year),
		queryFn: () => ReportApi.myYear(year)
	})
```

- [ ] **Step 5: Run tests and type check**

Run: `cd apps/sms-web && pnpm exec vitest run src/api/reports.test.ts && pnpm exec tsc --noEmit 2>&1 | grep -E "src/(lib/report|components/reports|api/reports)"; echo done`
Expected: 5 tests PASS; nothing printed before `done`.

- [ ] **Step 6: Commit** (only if asked)

```bash
git add apps/sms-web/src/api/reports.ts apps/sms-web/src/api/reports.test.ts apps/sms-web/src/components/reports/useReport.ts
git commit -m "feat(sms-web): reports api wrapper and query hooks"
```

---

### Task 4: `ConductInput` — inline rèn luyện entry

**Files:**
- Create: `apps/sms-web/src/components/reports/ConductInput.tsx`, `ConductInput.test.tsx`

**Interfaces:**
- Consumes: `Input` from `@repo/ui/components/ui/input`; i18n key `report.conduct.invalid`.
- Produces:
  - `type ConductParse = { ok: true; value: number | null } | { ok: false }`
  - `parseConduct(text: string): ConductParse` — blank → `{ok:true, value:null}`; accepts `,` or `.`; 0–10 with at most one decimal.
  - `<ConductInput value={number|null} ariaLabel={string} onSave={(v:number|null)=>void} />` — saves on blur or Enter when the value changed and is valid; Escape restores; invalid input sets `aria-invalid` and does not save.

- [ ] **Step 1: Write the failing test**

```tsx
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import '@/i18n'
import { ConductInput, parseConduct } from './ConductInput'

afterEach(cleanup)

describe('parseConduct', () => {
	it.each([
		['8.5', 8.5],
		['8,5', 8.5],
		[' 10 ', 10],
		['0', 0],
		['10.0', 10]
	])('accepts %s', (text, value) => {
		expect(parseConduct(text)).toEqual({ ok: true, value })
	})

	it('treats blank as delete', () => {
		expect(parseConduct('  ')).toEqual({ ok: true, value: null })
	})

	it.each(['abc', '10.5', '11', '-1', '7.25', '1e1', '8.'])(
		'rejects %s',
		(text) => {
			expect(parseConduct(text)).toEqual({ ok: false })
		}
	)
})

describe('ConductInput', () => {
	const setup = (value: number | null = 8.5) => {
		const onSave = vi.fn()
		render(<ConductInput value={value} ariaLabel='RL An' onSave={onSave} />)
		return { onSave, input: screen.getByLabelText('RL An') as HTMLInputElement }
	}

	it('shows the stored score with one decimal, or empty', () => {
		expect(setup(9).input.value).toBe('9.0')
		cleanup()
		expect(setup(null).input.value).toBe('')
	})

	it('saves a changed valid value on blur', () => {
		const { input, onSave } = setup()
		fireEvent.change(input, { target: { value: '7,5' } })
		fireEvent.blur(input)
		expect(onSave).toHaveBeenCalledWith(7.5)
	})

	it('saves null when cleared', () => {
		const { input, onSave } = setup()
		fireEvent.change(input, { target: { value: '' } })
		fireEvent.blur(input)
		expect(onSave).toHaveBeenCalledWith(null)
	})

	it('does not save an unchanged value', () => {
		const { input, onSave } = setup()
		fireEvent.blur(input)
		expect(onSave).not.toHaveBeenCalled()
	})

	it('flags an invalid value and does not save it', () => {
		const { input, onSave } = setup()
		fireEvent.change(input, { target: { value: '11' } })
		fireEvent.blur(input)
		expect(onSave).not.toHaveBeenCalled()
		expect(input.getAttribute('aria-invalid')).toBe('true')
	})

	it('restores the stored value on Escape', () => {
		const { input, onSave } = setup()
		fireEvent.change(input, { target: { value: '3' } })
		fireEvent.keyDown(input, { key: 'Escape' })
		expect(input.value).toBe('8.5')
		fireEvent.blur(input)
		expect(onSave).not.toHaveBeenCalled()
	})

	it('saves on Enter', () => {
		const { input, onSave } = setup()
		fireEvent.change(input, { target: { value: '6' } })
		fireEvent.keyDown(input, { key: 'Enter' })
		expect(onSave).toHaveBeenCalledWith(6)
	})
})
```

- [ ] **Step 2: Run to see it fail**

Run: `cd apps/sms-web && pnpm exec vitest run src/components/reports/ConductInput.test.tsx`
Expected: FAIL, cannot resolve `./ConductInput`.

- [ ] **Step 3: Implement `ConductInput.tsx`**

Enter blurs the field, and the blur handler does the save, so the two paths share one code path (and Enter cannot double-save).

```tsx
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Input } from '@repo/ui/components/ui/input'

export type ConductParse = { ok: true; value: number | null } | { ok: false }

/** Rèn luyện is 0 to 10 with at most one decimal; blank means "delete". */
export function parseConduct(text: string): ConductParse {
	const s = text.trim().replace(',', '.')
	if (s === '') return { ok: true, value: null }
	if (!/^\d{1,2}(\.\d)?$/.test(s)) return { ok: false }
	const value = Number(s)
	return value >= 0 && value <= 10 ? { ok: true, value } : { ok: false }
}

const show = (value: number | null) => (value === null ? '' : value.toFixed(1))

interface ConductInputProps {
	value: number | null
	ariaLabel: string
	onSave: (value: number | null) => void
}

export function ConductInput({ value, ariaLabel, onSave }: ConductInputProps) {
	const { t } = useTranslation()
	const [text, setText] = useState(show(value))
	const [invalid, setInvalid] = useState(false)

	useEffect(() => {
		setText(show(value))
		setInvalid(false)
	}, [value])

	const commit = () => {
		const parsed = parseConduct(text)
		if (!parsed.ok) {
			setInvalid(true)
			return
		}
		setInvalid(false)
		if (parsed.value !== value) onSave(parsed.value)
	}

	return (
		<Input
			inputMode='decimal'
			aria-label={ariaLabel}
			aria-invalid={invalid}
			title={invalid ? t('report.conduct.invalid') : undefined}
			value={text}
			onChange={(e) => setText(e.target.value)}
			onBlur={commit}
			onKeyDown={(e) => {
				if (e.key === 'Enter') e.currentTarget.blur()
				if (e.key === 'Escape') {
					setText(show(value))
					setInvalid(false)
				}
			}}
			className='score mx-auto h-8 w-16 text-center'
		/>
	)
}
```

Problem to handle: the Enter test fires only `keyDown`, and in jsdom `blur()` on an element that was never focused does not dispatch a blur event. In the test, focus the input first: change the Enter test to call `input.focus()` before `fireEvent.keyDown`. Apply this edit in the test now:

```tsx
	it('saves on Enter', () => {
		const { input, onSave } = setup()
		input.focus()
		fireEvent.change(input, { target: { value: '6' } })
		fireEvent.keyDown(input, { key: 'Enter' })
		expect(onSave).toHaveBeenCalledWith(6)
	})
```

- [ ] **Step 4: Run to verify pass**

Run: `cd apps/sms-web && pnpm exec vitest run src/components/reports/ConductInput.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit** (only if asked)

```bash
git add apps/sms-web/src/components/reports/ConductInput.tsx apps/sms-web/src/components/reports/ConductInput.test.tsx
git commit -m "feat(sms-web): inline conduct input"
```

---

### Task 5: Shared cells and the semester `ReportTable`

**Files:**
- Create: `apps/sms-web/src/components/reports/cells.tsx`
- Create: `apps/sms-web/src/components/reports/ReportTable.tsx`, `ReportTable.test.tsx`

**Interfaces:**
- Consumes: `Score` (`@/components/score`), `TONE_CLASS`, `scoreTone`, `bandKey`, `conductKey` (Task 2), `ConductInput` (Task 4), ui `Table*`.
- Produces:
  - `cells.tsx`: `Dash()`, `ScoreCell({value: number|null, className?})` (a `<td>` with tone fill and `Score`), `BandCell({band: Band|null})`, `RankCell({rank: number|null})`, `ConductScoreCell({conduct: Conduct|null})` (read-only 1 decimal), `ConductLabelCell({conduct: Conduct|null})`.
  - `ReportTable({report: SemesterReport, onSaveConduct?: (studentId:number, score:number|null)=>void})` — when `onSaveConduct` is given the rèn luyện column is an input.

- [ ] **Step 1: Write the failing test `ReportTable.test.tsx`**

```tsx
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import '@/i18n'
import { semesterFixture } from '@/lib/report/fixtures'
import { ReportTable } from './ReportTable'

afterEach(cleanup)

const rowOf = (name: string) =>
	screen.getByText(name).closest('tr') as HTMLTableRowElement

describe('ReportTable', () => {
	it('has group headers, course columns with credits, and one row per student in order', () => {
		render(<ReportTable report={semesterFixture} />)
		expect(screen.getByText('Điểm học phần')).toBeTruthy()
		expect(screen.getByText('Tổng kết')).toBeTruthy()
		expect(screen.getByText('GP')).toBeTruthy()
		expect(screen.getByText('4 TC')).toBeTruthy()
		const names = screen
			.getAllByRole('row')
			.slice(2)
			.map((r) => within(r).getAllByRole('cell')[2].textContent)
		expect(names).toEqual(['An Test', 'Bình Test', 'Em Test', 'Giang Test'])
	})

	it('shows the scores the API sent, two decimals, and dashes for missing ones', () => {
		render(<ReportTable report={semesterFixture} />)
		const giang = within(rowOf('Giang Test'))
		expect(giang.getAllByText('7.00').length).toBe(2) // GP score and ĐTB
		expect(giang.getAllByText('—').length).toBeGreaterThanOrEqual(1)
		const an = within(rowOf('An Test'))
		expect(an.getByText('7.33')).toBeTruthy()
		expect(an.getByText('Khá')).toBeTruthy()
		expect(an.getByText('2')).toBeTruthy()
	})

	it('colours cells by band and circles failing scores', () => {
		const { container } = render(<ReportTable report={semesterFixture} />)
		const binh = rowOf('Bình Test')
		expect(binh.querySelector('td.bg-success\\/15')).not.toBeNull()
		const an = rowOf('An Test')
		expect(an.querySelector('td.bg-warning\\/20')).not.toBeNull() // 6.00
		expect(container.querySelectorAll('.score-fail').length).toBeGreaterThan(0) // Em 3.20, 4.13
		expect(rowOf('Em Test').querySelectorAll('.score-fail').length).toBe(2)
	})

	it('shows conduct read-only, with its label, or a dash when there is none', () => {
		render(<ReportTable report={semesterFixture} />)
		const an = within(rowOf('An Test'))
		expect(an.getByText('8.5')).toBeTruthy()
		expect(an.getByText('Tốt')).toBeTruthy()
		expect(screen.queryByRole('textbox')).toBeNull()
	})

	it('turns conduct into inputs when editable and reports the change with the student id', () => {
		const onSave = vi.fn()
		render(<ReportTable report={semesterFixture} onSaveConduct={onSave} />)
		expect(screen.getAllByRole('textbox')).toHaveLength(4)
		const input = screen.getByLabelText('Rèn luyện của Bình Test')
		fireEvent.change(input, { target: { value: '9,5' } })
		fireEvent.blur(input)
		expect(onSave).toHaveBeenCalledWith(1017, 9.5)
	})
})
```

- [ ] **Step 2: Run to see it fail**

Run: `cd apps/sms-web && pnpm exec vitest run src/components/reports/ReportTable.test.tsx`
Expected: FAIL, cannot resolve `./ReportTable`.

- [ ] **Step 3: Implement `cells.tsx`**

```tsx
import { useTranslation } from 'react-i18next'
import { TableCell } from '@repo/ui/components/ui/table'
import { Score } from '@/components/score'
import { cn } from '@/lib/utils'
import { TONE_CLASS, bandKey, conductKey, scoreTone } from '@/lib/report/labels'
import type { Band, Conduct } from '@/lib/report/types'

export const Dash = () => <span className='text-muted-foreground'>—</span>

export function ScoreCell({
	value,
	className
}: {
	value: number | null
	className?: string
}) {
	return (
		<TableCell
			className={cn(
				'text-center',
				value !== null && TONE_CLASS[scoreTone(value)],
				className
			)}
		>
			{value === null ? <Dash /> : <Score value={value} />}
		</TableCell>
	)
}

export function BandCell({ band }: { band: Band | null }) {
	const { t } = useTranslation()
	return (
		<TableCell className='whitespace-nowrap'>
			{band ? t(bandKey(band)) : <Dash />}
		</TableCell>
	)
}

export function RankCell({ rank }: { rank: number | null }) {
	return (
		<TableCell className='score text-center'>
			{rank === null ? <Dash /> : rank}
		</TableCell>
	)
}

export function ConductScoreCell({ conduct }: { conduct: Conduct | null }) {
	return (
		<TableCell className='score text-center'>
			{conduct ? conduct.score.toFixed(1) : <Dash />}
		</TableCell>
	)
}

export function ConductLabelCell({ conduct }: { conduct: Conduct | null }) {
	const { t } = useTranslation()
	return (
		<TableCell className='whitespace-nowrap'>
			{conduct ? t(conductKey(conduct.label)) : <Dash />}
		</TableCell>
	)
}
```

- [ ] **Step 4: Implement `ReportTable.tsx`**

```tsx
import { useTranslation } from 'react-i18next'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow
} from '@repo/ui/components/ui/table'
import type { SemesterReport } from '@/lib/report/types'
import { ConductInput } from './ConductInput'
import {
	BandCell,
	ConductLabelCell,
	ConductScoreCell,
	RankCell,
	ScoreCell
} from './cells'

interface ReportTableProps {
	report: SemesterReport
	/** When given, the rèn luyện column is an input that reports changes. */
	onSaveConduct?: (studentId: number, score: number | null) => void
}

const GROUP_EDGE = 'border-rule border-l'

/** Sổ điểm của một học kỳ: mỗi học viên một dòng, mỗi học phần một cột. */
export function ReportTable({ report, onSaveConduct }: ReportTableProps) {
	const { t } = useTranslation()
	return (
		<Table>
			<TableHeader>
				<TableRow className='hover:bg-transparent'>
					<TableHead rowSpan={2} className='w-12 text-center'>
						{t('report.col.no')}
					</TableHead>
					<TableHead rowSpan={2}>{t('report.col.idnumber')}</TableHead>
					<TableHead rowSpan={2} className='bg-card sticky left-0 z-10'>
						{t('report.col.name')}
					</TableHead>
					<TableHead
						colSpan={report.courses.length}
						className={`${GROUP_EDGE} text-center`}
					>
						{t('report.col.courses')}
					</TableHead>
					<TableHead colSpan={5} className={`${GROUP_EDGE} text-center`}>
						{t('report.col.summary')}
					</TableHead>
				</TableRow>
				<TableRow className='hover:bg-transparent'>
					{report.courses.map((c, i) => (
						<TableHead
							key={c.id}
							title={c.fullname}
							className={`text-center ${i === 0 ? GROUP_EDGE : ''}`}
						>
							{c.shortname}
							<span className='text-muted-foreground block text-xs font-normal'>
								{t('report.col.credits', { count: c.credits })}
							</span>
						</TableHead>
					))}
					<TableHead className={`${GROUP_EDGE} text-center`}>
						{t('report.col.gpa')}
					</TableHead>
					<TableHead>{t('report.col.classification')}</TableHead>
					<TableHead className='text-center'>{t('report.col.rank')}</TableHead>
					<TableHead className='text-center'>
						{t('report.col.conduct')}
					</TableHead>
					<TableHead>{t('report.col.conductLabel')}</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{report.students.map((s, i) => (
					<TableRow key={s.id} className='group/row'>
						<TableCell className='text-muted-foreground text-center'>
							{i + 1}
						</TableCell>
						<TableCell className='whitespace-nowrap'>{s.idnumber}</TableCell>
						<TableCell className='bg-card group-hover/row:bg-accent sticky left-0 z-10 font-medium whitespace-nowrap'>
							{s.fullname}
						</TableCell>
						{report.courses.map((c, j) => (
							<ScoreCell
								key={c.id}
								value={s.scores[String(c.id)] ?? null}
								className={j === 0 ? GROUP_EDGE : undefined}
							/>
						))}
						<ScoreCell value={s.gpa} className={`${GROUP_EDGE} font-semibold`} />
						<BandCell band={s.classification} />
						<RankCell rank={s.rank} />
						{onSaveConduct ? (
							<TableCell className='text-center'>
								<ConductInput
									value={s.conduct?.score ?? null}
									ariaLabel={t('report.conduct.for', { name: s.fullname })}
									onSave={(score) => onSaveConduct(s.id, score)}
								/>
							</TableCell>
						) : (
							<ConductScoreCell conduct={s.conduct} />
						)}
						<ConductLabelCell conduct={s.conduct} />
					</TableRow>
				))}
			</TableBody>
		</Table>
	)
}
```

- [ ] **Step 5: Run to verify pass**

Run: `cd apps/sms-web && pnpm exec vitest run src/components/reports/ReportTable.test.tsx`
Expected: PASS. If `getAllByRole('cell')[2]` fails because the ui `TableCell` renders `td` inside `tbody` (it does), the header rows are the first two `tr`s, hence `.slice(2)`.

- [ ] **Step 6: Commit** (only if asked)

```bash
git add apps/sms-web/src/components/reports/cells.tsx apps/sms-web/src/components/reports/ReportTable.tsx apps/sms-web/src/components/reports/ReportTable.test.tsx
git commit -m "feat(sms-web): semester report table"
```

---

### Task 6: `YearTable`

**Files:**
- Create: `apps/sms-web/src/components/reports/YearTable.tsx`, `YearTable.test.tsx`

**Interfaces:**
- Consumes: `ScoreCell`, `BandCell`, `RankCell`, `ConductScoreCell`, `ConductLabelCell` (Task 5), `YearReport`, `semesterFixture`/`yearFixture` (Task 2).
- Produces: `YearTable({report: YearReport})` — read-only; per semester of the year a group with that semester's ĐTB and rèn luyện, then the year group (ĐTB năm, xếp loại, hạng, rèn luyện năm, xếp loại rèn luyện). Rèn luyện is edited only in the semester tab.

- [ ] **Step 1: Write the failing test**

```tsx
import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import '@/i18n'
import { yearFixture } from '@/lib/report/fixtures'
import { YearTable } from './YearTable'

afterEach(cleanup)

const rowOf = (name: string) =>
	screen.getByText(name).closest('tr') as HTMLTableRowElement

describe('YearTable', () => {
	it('has a group per semester, then the year totals', () => {
		render(<YearTable report={yearFixture} />)
		expect(screen.getByText('Học kỳ 1')).toBeTruthy()
		expect(screen.getByText('Học kỳ 2')).toBeTruthy()
		expect(screen.getByText('Tổng kết')).toBeTruthy()
		expect(screen.getByText('ĐTB năm')).toBeTruthy()
		expect(screen.getByText('Rèn luyện năm')).toBeTruthy()
	})

	it('shows each semester result next to the year result', () => {
		render(<YearTable report={yearFixture} />)
		const an = within(rowOf('An Test'))
		expect(an.getByText('7.33')).toBeTruthy() // HK1 ĐTB
		expect(an.getByText('7.25')).toBeTruthy() // năm
		expect(an.getByText('8.0')).toBeTruthy() // rèn luyện năm
		expect(an.getByText('Tốt')).toBeTruthy()
		expect(an.getByText('8.5')).toBeTruthy() // rèn luyện HK1
		expect(an.getByText('7.5')).toBeTruthy() // rèn luyện HK2
	})

	it('leaves the year conduct empty when a semester has none, and never edits', () => {
		render(<YearTable report={yearFixture} />)
		const binh = within(rowOf('Bình Test'))
		expect(binh.getAllByText('—').length).toBeGreaterThanOrEqual(3)
		expect(screen.queryByRole('textbox')).toBeNull()
	})

	it('shows dashes for a semester a student has no row in', () => {
		render(<YearTable report={yearFixture} />)
		// Giang is not in the year list; add one who is missing from semester 2.
		const report = {
			...yearFixture,
			students: [
				...yearFixture.students,
				{
					id: 1021,
					idnumber: 'TST0006',
					fullname: 'Giang Test',
					gpa: 7,
					classification: 'kha' as const,
					rank: 3,
					conduct: null
				}
			]
		}
		cleanup()
		render(<YearTable report={report} />)
		expect(within(rowOf('Giang Test')).getAllByText('—').length).toBeGreaterThanOrEqual(3)
	})
})
```

- [ ] **Step 2: Run to see it fail**

Run: `cd apps/sms-web && pnpm exec vitest run src/components/reports/YearTable.test.tsx`
Expected: FAIL, cannot resolve `./YearTable`.

- [ ] **Step 3: Implement `YearTable.tsx`**

```tsx
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow
} from '@repo/ui/components/ui/table'
import type { StudentRow, YearReport } from '@/lib/report/types'
import {
	BandCell,
	ConductLabelCell,
	ConductScoreCell,
	RankCell,
	ScoreCell
} from './cells'

const GROUP_EDGE = 'border-rule border-l'

/** Sổ điểm cả năm: mỗi học kỳ một nhóm (ĐTB và rèn luyện), rồi tổng kết năm. */
export function YearTable({ report }: { report: YearReport }) {
	const { t } = useTranslation()

	// Rows of each semester by student id, so a student's semester result sits on their row.
	const byPeriod = useMemo(
		() =>
			report.periods.map(
				(p) => new Map<number, StudentRow>(p.students.map((s) => [s.id, s]))
			),
		[report.periods]
	)

	return (
		<Table>
			<TableHeader>
				<TableRow className='hover:bg-transparent'>
					<TableHead rowSpan={2} className='w-12 text-center'>
						{t('report.col.no')}
					</TableHead>
					<TableHead rowSpan={2}>{t('report.col.idnumber')}</TableHead>
					<TableHead rowSpan={2} className='bg-card sticky left-0 z-10'>
						{t('report.col.name')}
					</TableHead>
					{report.periods.map((p) => (
						<TableHead
							key={p.semester}
							colSpan={2}
							className={`${GROUP_EDGE} text-center`}
						>
							{t('report.semester', { number: p.semester })}
						</TableHead>
					))}
					<TableHead colSpan={5} className={`${GROUP_EDGE} text-center`}>
						{t('report.col.summary')}
					</TableHead>
				</TableRow>
				<TableRow className='hover:bg-transparent'>
					{report.periods.map((p) => (
						<PeriodHeads key={p.semester} />
					))}
					<TableHead className={`${GROUP_EDGE} text-center`}>
						{t('report.col.gpaYear')}
					</TableHead>
					<TableHead>{t('report.col.classification')}</TableHead>
					<TableHead className='text-center'>{t('report.col.rank')}</TableHead>
					<TableHead className='text-center'>
						{t('report.col.conductYear')}
					</TableHead>
					<TableHead>{t('report.col.conductLabel')}</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{report.students.map((s, i) => (
					<TableRow key={s.id} className='group/row'>
						<TableCell className='text-muted-foreground text-center'>
							{i + 1}
						</TableCell>
						<TableCell className='whitespace-nowrap'>{s.idnumber}</TableCell>
						<TableCell className='bg-card group-hover/row:bg-accent sticky left-0 z-10 font-medium whitespace-nowrap'>
							{s.fullname}
						</TableCell>
						{byPeriod.map((rows, k) => {
							const row = rows.get(s.id)
							return (
								<PeriodCells key={report.periods[k].semester} row={row} />
							)
						})}
						<ScoreCell value={s.gpa} className={`${GROUP_EDGE} font-semibold`} />
						<BandCell band={s.classification} />
						<RankCell rank={s.rank} />
						<ConductScoreCell conduct={s.conduct} />
						<ConductLabelCell conduct={s.conduct} />
					</TableRow>
				))}
			</TableBody>
		</Table>
	)
}

function PeriodHeads() {
	const { t } = useTranslation()
	return (
		<>
			<TableHead className={`${GROUP_EDGE} text-center`}>
				{t('report.col.gpa')}
			</TableHead>
			<TableHead className='text-center'>{t('report.col.conduct')}</TableHead>
		</>
	)
}

function PeriodCells({ row }: { row: StudentRow | undefined }) {
	return (
		<>
			<ScoreCell value={row?.gpa ?? null} className={GROUP_EDGE} />
			<ConductScoreCell conduct={row?.conduct ?? null} />
		</>
	)
}
```

- [ ] **Step 4: Run to verify pass**

Run: `cd apps/sms-web && pnpm exec vitest run src/components/reports/YearTable.test.tsx`
Expected: PASS. (`getByText('7.33')` is unique on An's row: HK1 ĐTB only; `'7.00'` for HK2 ĐTB and `'7.25'` for the year are distinct.)

- [ ] **Step 5: Commit** (only if asked)

```bash
git add apps/sms-web/src/components/reports/YearTable.tsx apps/sms-web/src/components/reports/YearTable.test.tsx
git commit -m "feat(sms-web): year report table"
```

---

### Task 7: `SummaryPanel`, `WarningsBanner`, `ReportStates`

**Files:**
- Create: `apps/sms-web/src/components/reports/SummaryPanel.tsx`, `WarningsBanner.tsx`, `ReportStates.tsx`
- Create tests: `SummaryPanel.test.tsx`, `WarningsBanner.test.tsx`, `ReportStates.test.tsx`

**Interfaces:**
- Consumes: `Summary`, `ReportCourse`, `ReportWarning`, `UnassignedCourse`, `BANDS`, `bandKey`, `BAND_BAR`, `Score`.
- Produces:
  - `SummaryPanel({summary: Summary, courses?: ReportCourse[]})` — number strip (sĩ số, ĐTB lớp, ĐTB cao nhất), stacked distribution bar with legend counts, top 3, and (when `courses` and `summary.perCourse` exist) a per-course table (mean and band counts).
  - `WarningsBanner({warnings: ReportWarning[], courses: ReportCourse[], unassigned?: UnassignedCourse[]})` — renders nothing when both are empty.
  - `ReportSkeleton()`, `ReportError({message: string, onRetry?: () => void})`, `ReportEmpty({message: string})`.

- [ ] **Step 1: Write the failing tests**

`SummaryPanel.test.tsx`:

```tsx
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
		expect(screen.getByText('ĐTB lớp').previousSibling?.textContent).toBe('6.87')
		expect(screen.getByText('ĐTB cao nhất').previousSibling?.textContent).toBe('9.00')
	})

	it('draws one bar segment per non-empty band, sized by its count, with a legend', () => {
		const { container } = render(<SummaryPanel summary={semesterFixture.summary} />)
		const segments = container.querySelectorAll('[data-band]')
		expect([...segments].map((s) => s.getAttribute('data-band'))).toEqual([
			'xuat_sac',
			'kha',
			'yeu'
		])
		expect((segments[1] as HTMLElement).style.flexGrow).toBe('2')
		const legend = within(screen.getByRole('list', { name: 'Phân loại học tập' }))
		expect(legend.getByText('Khá').closest('li')?.textContent).toContain('2')
	})

	it('lists the top three in rank order', () => {
		render(<SummaryPanel summary={semesterFixture.summary} />)
		const top = within(screen.getByRole('list', { name: 'Ba học viên đứng đầu' }))
		expect(top.getAllByRole('listitem').map((li) => li.textContent)).toEqual([
			expect.stringContaining('Bình Test'),
			expect.stringContaining('An Test'),
			expect.stringContaining('Giang Test')
		])
	})

	it('shows a per-course table only when courses and stats are given', () => {
		const { rerender } = render(<SummaryPanel summary={semesterFixture.summary} />)
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
```

`WarningsBanner.test.tsx`:

```tsx
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import '@/i18n'
import { semesterFixture } from '@/lib/report/fixtures'
import { WarningsBanner } from './WarningsBanner'

afterEach(cleanup)

describe('WarningsBanner', () => {
	it('renders nothing without warnings', () => {
		const { container } = render(<WarningsBanner warnings={[]} courses={[]} />)
		expect(container.firstChild).toBeNull()
	})

	it('names the course a warning is about', () => {
		render(
			<WarningsBanner
				warnings={semesterFixture.warnings}
				courses={semesterFixture.courses}
			/>
		)
		expect(screen.getByRole('status')).toBeTruthy()
		expect(screen.getByText(/Học phần SL chưa có điểm thi/)).toBeTruthy()
	})

	it('falls back to the course id when the course is unknown', () => {
		render(
			<WarningsBanner
				warnings={[{ code: 'course_no_credits', courseId: 99 }]}
				courses={[]}
			/>
		)
		expect(screen.getByText(/Học phần #99 chưa có số tín chỉ/)).toBeTruthy()
	})

	it('lists courses that are in no semester', () => {
		render(
			<WarningsBanner
				warnings={[]}
				courses={[]}
				unassigned={[{ id: 8, shortname: 'OLD', missing: ['year'] }]}
			/>
		)
		expect(screen.getByText(/1 học phần chưa được xếp vào kỳ nào/)).toBeTruthy()
		expect(screen.getByText(/OLD/)).toBeTruthy()
	})
})
```

`ReportStates.test.tsx`:

```tsx
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import '@/i18n'
import { ReportEmpty, ReportError, ReportSkeleton } from './ReportStates'

afterEach(cleanup)

describe('ReportStates', () => {
	it('announces loading', () => {
		render(<ReportSkeleton />)
		expect(screen.getByRole('status', { name: 'Đang tải kết quả' })).toBeTruthy()
	})

	it('shows the error and retries', () => {
		const onRetry = vi.fn()
		render(<ReportError message='no such class' onRetry={onRetry} />)
		expect(screen.getByRole('alert').textContent).toContain('no such class')
		fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }))
		expect(onRetry).toHaveBeenCalled()
	})

	it('has no retry button without a handler', () => {
		render(<ReportError message='x' />)
		expect(screen.queryByRole('button')).toBeNull()
	})

	it('shows the empty message', () => {
		render(<ReportEmpty message='Chưa có điểm' />)
		expect(screen.getByText('Chưa có điểm')).toBeTruthy()
	})
})
```

- [ ] **Step 2: Run to see them fail**

Run: `cd apps/sms-web && pnpm exec vitest run src/components/reports/SummaryPanel.test.tsx src/components/reports/WarningsBanner.test.tsx src/components/reports/ReportStates.test.tsx`
Expected: FAIL, modules not found.

- [ ] **Step 3: Implement `ReportStates.tsx`**

```tsx
import { LoaderCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@repo/ui/components/ui/button'
import { Card, CardContent } from '@repo/ui/components/ui/card'

export function ReportSkeleton() {
	const { t } = useTranslation()
	return (
		<div
			role='status'
			aria-label={t('report.states.loading')}
			className='space-y-3'
		>
			{Array.from({ length: 6 }).map((_, i) => (
				<div key={i} className='bg-muted h-9 animate-pulse rounded-md' />
			))}
			<LoaderCircle className='sr-only' />
		</div>
	)
}

export function ReportError({
	message,
	onRetry
}: {
	message: string
	onRetry?: () => void
}) {
	const { t } = useTranslation()
	return (
		<Card role='alert' className='border-destructive/50 border-dashed'>
			<CardContent className='flex flex-col items-center gap-3 py-8 text-center'>
				<p className='font-medium'>{t('report.states.error')}</p>
				<p className='text-muted-foreground text-sm'>{message}</p>
				{onRetry && (
					<Button variant='outline' onClick={onRetry}>
						{t('report.states.retry')}
					</Button>
				)}
			</CardContent>
		</Card>
	)
}

export function ReportEmpty({ message }: { message: string }) {
	return (
		<Card className='border-dashed'>
			<CardContent className='text-muted-foreground py-8 text-center'>
				{message}
			</CardContent>
		</Card>
	)
}
```

- [ ] **Step 4: Implement `WarningsBanner.tsx`**

```tsx
import { TriangleAlert } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type {
	ReportCourse,
	ReportWarning,
	UnassignedCourse
} from '@/lib/report/types'

interface WarningsBannerProps {
	warnings: ReportWarning[]
	courses: ReportCourse[]
	unassigned?: UnassignedCourse[]
}

export function WarningsBanner({
	warnings,
	courses,
	unassigned = []
}: WarningsBannerProps) {
	const { t } = useTranslation()
	if (warnings.length === 0 && unassigned.length === 0) return null

	const courseName = (id?: number) =>
		courses.find((c) => c.id === id)?.shortname ?? `#${id}`

	return (
		<div
			role='status'
			className='border-warning/50 bg-warning/10 space-y-1 rounded-lg border p-4 text-sm'
		>
			<p className='flex items-center gap-2 font-medium'>
				<TriangleAlert className='text-warning h-4 w-4' />
				{t('report.warning.title')}
			</p>
			<ul className='list-disc space-y-1 pl-6'>
				{warnings.map((w, i) => (
					<li key={`${w.code}-${w.courseId ?? i}`}>
						{t(`report.warning.${w.code}`, {
							course: courseName(w.courseId)
						})}
					</li>
				))}
				{unassigned.length > 0 && (
					<li>
						{t('report.unassigned', {
							count: unassigned.length,
							fields: [...new Set(unassigned.flatMap((u) => u.missing))].join(', '),
							courses: unassigned.map((u) => u.shortname).join(', ')
						})}
					</li>
				)}
			</ul>
		</div>
	)
}
```

- [ ] **Step 5: Implement `SummaryPanel.tsx`**

The bar segments use `flex-grow` equal to the count, so no ratio is computed in the browser.

```tsx
import { useTranslation } from 'react-i18next'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow
} from '@repo/ui/components/ui/table'
import { Score } from '@/components/score'
import { BANDS, BAND_BAR, bandKey } from '@/lib/report/labels'
import type { ReportCourse, Summary } from '@/lib/report/types'
import { Dash } from './cells'

const fmt = (v: number | null) => (v === null ? <Dash /> : v.toFixed(2))

interface SummaryPanelProps {
	summary: Summary
	courses?: ReportCourse[]
}

export function SummaryPanel({ summary, courses }: SummaryPanelProps) {
	const { t } = useTranslation()
	const present = BANDS.filter((b) => (summary.byClassification[b] ?? 0) > 0)
	const perCourse = summary.perCourse

	return (
		<section className='space-y-6'>
			<h3 className='text-lg'>{t('report.summary.title')}</h3>

			<div className='divide-rule bg-card flex w-full divide-x overflow-hidden rounded-lg border sm:w-fit'>
				{[
					{ label: t('report.summary.headcount'), value: <>{summary.headcount}</> },
					{ label: t('report.summary.classGpa'), value: fmt(summary.classGpa) },
					{ label: t('report.summary.maxGpa'), value: fmt(summary.maxGpa) }
				].map(({ label, value }) => (
					<div key={label} className='min-w-0 flex-1 px-4 py-3 sm:min-w-36 sm:px-6'>
						<p className='score text-2xl'>{value}</p>
						<p className='text-muted-foreground text-sm'>{label}</p>
					</div>
				))}
			</div>

			<div className='space-y-2'>
				<h4 className='text-sm font-medium'>{t('report.summary.distribution')}</h4>
				{present.length > 0 && (
					<div className='flex h-4 w-full overflow-hidden rounded-full border'>
						{present.map((b) => (
							<div
								key={b}
								data-band={b}
								className={BAND_BAR[b]}
								style={{ flexGrow: summary.byClassification[b] }}
							/>
						))}
					</div>
				)}
				<ul
					aria-label={t('report.summary.distribution')}
					className='flex flex-wrap gap-x-4 gap-y-1 text-sm'
				>
					{BANDS.map((b) => (
						<li key={b} className='flex items-center gap-1.5'>
							<span className={`${BAND_BAR[b]} inline-block h-2.5 w-2.5 rounded-full`} />
							<span>{t(bandKey(b))}</span>
							<span className='score'>{summary.byClassification[b] ?? 0}</span>
						</li>
					))}
				</ul>
			</div>

			{summary.top.length > 0 && (
				<div className='space-y-2'>
					<h4 className='text-sm font-medium'>{t('report.summary.top')}</h4>
					<ul aria-label={t('report.summary.top')} className='space-y-1'>
						{summary.top.map((e) => (
							<li key={`${e.rank}-${e.fullname}`} className='flex items-baseline gap-3'>
								<span className='score w-6 text-right'>{e.rank}</span>
								<span className='flex-1'>{e.fullname}</span>
								<Score value={e.gpa} />
							</li>
						))}
					</ul>
				</div>
			)}

			{courses && perCourse && (
				<div className='space-y-2'>
					<h4 className='text-sm font-medium'>{t('report.summary.perCourse')}</h4>
					<Table>
						<TableHeader>
							<TableRow className='hover:bg-transparent'>
								<TableHead>{t('report.summary.course')}</TableHead>
								<TableHead className='text-center'>{t('report.summary.mean')}</TableHead>
								{BANDS.map((b) => (
									<TableHead key={b} className='text-center'>
										{t(bandKey(b))}
									</TableHead>
								))}
							</TableRow>
						</TableHeader>
						<TableBody>
							{courses.map((c) => {
								const stats = perCourse[String(c.id)]
								return (
									<TableRow key={c.id}>
										<TableCell title={c.fullname}>{c.shortname}</TableCell>
										<TableCell className='score text-center'>
											{fmt(stats?.mean ?? null)}
										</TableCell>
										{BANDS.map((b) => (
											<TableCell key={b} className='score text-center'>
												{stats?.bands[b] ?? 0}
											</TableCell>
										))}
									</TableRow>
								)
							})}
						</TableBody>
					</Table>
				</div>
			)}
		</section>
	)
}
```

- [ ] **Step 6: Run to verify pass**

Run: `cd apps/sms-web && pnpm exec vitest run src/components/reports/SummaryPanel.test.tsx src/components/reports/WarningsBanner.test.tsx src/components/reports/ReportStates.test.tsx`
Expected: PASS. Notes for a failing run: the number-strip test reads `previousSibling` of the label `<p>`, which is the value `<p>`; `getByText('6.80')` must match only the ĐMH course-mean cell (the class ĐTB is `6.87`).

- [ ] **Step 7: Commit** (only if asked)

```bash
git add apps/sms-web/src/components/reports/{SummaryPanel,WarningsBanner,ReportStates}*.tsx
git commit -m "feat(sms-web): report summary, warnings and states"
```

---

### Task 8: Excel export builders

**Files:**
- Create: `apps/sms-web/src/lib/report/export/workbook.ts`, `workbook.test.ts`

**Interfaces:**
- Consumes: `SemesterReport`, `YearReport`, `Summary`, `BANDS`, `bandKey`, `conductKey`, `scoreTone`, `@/i18n` default export (i18next instance, initialised with `vi.json`), `exceljs` (lazy).
- Produces:
  - `buildSemesterWorkbook(report: SemesterReport): Promise<Workbook>` — sheets `Kết quả` and `Tổng hợp`.
  - `buildYearWorkbook(report: YearReport): Promise<Workbook>` — same two sheets.
  - `exportFileName(report: SemesterReport | YearReport): string` — `Ket_qua_hoc_tap_HK<s>_Nam<y>_<class>.xlsx` or `Ket_qua_hoc_tap_Nam<y>_<class>.xlsx`, class name ASCII-fied.
  - `downloadWorkbook(wb: Workbook, filename: string): Promise<void>`
  - `exportReport(report: SemesterReport | YearReport): Promise<void>` — build, then download.
- Sheet layout (main sheet `Kết quả`): rows 1–3 merged, centred: school, title, class. Row 4 blank. Rows 5–6 two-row header (row 5 group titles, merged across the group; STT / Mã / Họ tên merged over rows 5–6). Data from row 7. Column A STT, B mã học viên, C họ tên, then the groups. Below the table: legend (three coloured swatches), place/date, two signature blocks.

- [ ] **Step 1: Write the failing test `workbook.test.ts`**

```ts
// @vitest-environment node
import { describe, expect, it } from 'vitest'
import '@/i18n'
import {
	semester2Fixture,
	semesterFixture,
	yearFixture
} from '@/lib/report/fixtures'
import {
	buildSemesterWorkbook,
	buildYearWorkbook,
	exportFileName
} from './workbook'

// Semester fixture columns: A STT, B mã, C tên, D GP, E SL, F ĐTB, G xếp loại, H hạng, I RL, J xếp loại RL.
// Rows: 5-6 header, 7 An, 8 Bình, 9 Em, 10 Giang.

const reload = async (wb: Awaited<ReturnType<typeof buildSemesterWorkbook>>) => {
	const buffer = await wb.xlsx.writeBuffer()
	const { default: ExcelJS } = await import('exceljs')
	const out = new ExcelJS.Workbook()
	await out.xlsx.load(buffer)
	return out
}

describe('buildSemesterWorkbook', () => {
	it('has the results sheet and the summary sheet', async () => {
		const wb = await buildSemesterWorkbook(semesterFixture)
		expect(wb.worksheets.map((w) => w.name)).toEqual(['Kết quả', 'Tổng hợp'])
	})

	it('writes the header block, merged group headers and one row per student in order', async () => {
		const ws = (await buildSemesterWorkbook(semesterFixture)).getWorksheet('Kết quả')!
		expect(ws.getCell('A1').value).toBe('TRƯỜNG CAO ĐẲNG HẬU CẦN 2')
		expect(ws.getCell('A2').value).toBe('KẾT QUẢ HỌC TẬP HỌC KỲ 1 NĂM 1')
		expect(ws.getCell('A3').value).toBe('Lớp: Lớp TEST báo cáo')
		expect(ws.getCell('D5').value).toBe('Điểm học phần')
		expect(ws.getCell('F5').value).toBe('Tổng kết')
		expect(ws.model.merges).toEqual(
			expect.arrayContaining(['A1:J1', 'A2:J2', 'A3:J3', 'D5:E5', 'F5:J5', 'A5:A6', 'B5:B6', 'C5:C6'])
		)
		expect(ws.getCell('D6').value).toBe('GP\n4 TC')
		expect([7, 8, 9, 10].map((r) => ws.getCell(`C${r}`).value)).toEqual([
			'An Test',
			'Bình Test',
			'Em Test',
			'Giang Test'
		])
		expect([7, 8, 9, 10].map((r) => ws.getCell(`A${r}`).value)).toEqual([1, 2, 3, 4])
	})

	it('writes scores as numbers with the number formats, and leaves missing values empty', async () => {
		const ws = (await buildSemesterWorkbook(semesterFixture)).getWorksheet('Kết quả')!
		expect(ws.getCell('D7').value).toBe(8)
		expect(ws.getCell('D7').numFmt).toBe('0.00')
		expect(ws.getCell('F7').value).toBe(7.33)
		expect(ws.getCell('G7').value).toBe('Khá')
		expect(ws.getCell('H7').value).toBe(2)
		expect(ws.getCell('H7').numFmt).toBe('0')
		expect(ws.getCell('I7').value).toBe(8.5)
		expect(ws.getCell('I7').numFmt).toBe('0.0')
		expect(ws.getCell('J7').value).toBe('Tốt')
		expect(ws.getCell('I8').value).toBeNull() // Bình has no rèn luyện
		expect(ws.getCell('J8').value).toBeNull()
		expect(ws.getCell('E10').value).toBeNull() // Giang, course not scored
		for (const addr of ['D7', 'E7', 'F7', 'H7', 'I7']) {
			expect(typeof ws.getCell(addr).value).toBe('number')
		}
	})

	it('fills the colour bands and reds the failing scores', async () => {
		const ws = (await buildSemesterWorkbook(semesterFixture)).getWorksheet('Kết quả')!
		const argb = (addr: string) =>
			(ws.getCell(addr).fill as { fgColor?: { argb?: string } } | undefined)?.fgColor?.argb
		expect(argb('D8')).toBeDefined() // 9.00 good
		expect(argb('E7')).toBeDefined() // 6.00 warn
		expect(argb('D8')).not.toBe(argb('E7'))
		expect(argb('D7')).toBeUndefined() // 8.00 no fill
		expect(ws.getCell('D9').font?.color?.argb).toBe('FFC00000') // 3.20 fails
	})

	it('has a legend and two signature blocks under the table', async () => {
		const ws = (await buildSemesterWorkbook(semesterFixture)).getWorksheet('Kết quả')!
		const texts: string[] = []
		ws.eachRow((row) =>
			row.eachCell((c) => {
				if (typeof c.value === 'string') texts.push(c.value)
			})
		)
		expect(texts).toEqual(
			expect.arrayContaining([
				'Chú thích',
				'Từ 9,00 trở lên',
				'Từ 5,00 đến dưới 7,00',
				'Dưới 5,00 (chưa đạt)',
				'HIỆU TRƯỞNG',
				'TRƯỞNG PHÒNG ĐÀO TẠO'
			])
		)
	})

	it('is landscape A4 and fits one page wide', async () => {
		const ws = (await buildSemesterWorkbook(semesterFixture)).getWorksheet('Kết quả')!
		expect(ws.pageSetup.orientation).toBe('landscape')
		expect(ws.pageSetup.paperSize).toBe(9)
		expect(ws.pageSetup.fitToWidth).toBe(1)
	})

	it('keeps numbers and formats after a save and reload', async () => {
		const ws = (await reload(await buildSemesterWorkbook(semesterFixture))).getWorksheet('Kết quả')!
		expect(ws.getCell('F7').value).toBe(7.33)
		expect(ws.getCell('F7').numFmt).toBe('0.00')
		expect(ws.getCell('D5').value).toBe('Điểm học phần')
	})

	it('summarises the class on the second sheet', async () => {
		const ws = (await buildSemesterWorkbook(semesterFixture)).getWorksheet('Tổng hợp')!
		const rows: unknown[][] = []
		ws.eachRow((row) => rows.push((row.values as unknown[]).slice(1)))
		expect(rows).toEqual(
			expect.arrayContaining([
				['Sĩ số', 4],
				['ĐTB lớp', 6.87],
				['ĐTB cao nhất', 9],
				['Khá', 2],
				[1, 'Bình Test', 9]
			])
		)
		// per-course: GP mean 6.8
		expect(rows.some((r) => r[0] === 'GP' && r[1] === 6.8)).toBe(true)
	})
})

describe('buildYearWorkbook', () => {
	// A STT, B mã, C tên, D-E HK1 (ĐTB, RL), F-G HK2, H ĐTB năm, I xếp loại, J hạng, K RL năm, L xếp loại RL.
	it('has a group per semester and the year totals', async () => {
		const ws = (await buildYearWorkbook(yearFixture)).getWorksheet('Kết quả')!
		expect(ws.getCell('A2').value).toBe('KẾT QUẢ HỌC TẬP NĂM 1')
		expect(ws.getCell('D5').value).toBe('Học kỳ 1')
		expect(ws.getCell('F5').value).toBe('Học kỳ 2')
		expect(ws.getCell('H5').value).toBe('Tổng kết')
		expect(ws.model.merges).toEqual(
			expect.arrayContaining(['D5:E5', 'F5:G5', 'H5:L5', 'A1:L1'])
		)
	})

	it('puts each semester result and the year result on the student row', async () => {
		const ws = (await buildYearWorkbook(yearFixture)).getWorksheet('Kết quả')!
		expect(ws.getCell('C7').value).toBe('An Test')
		expect(ws.getCell('D7').value).toBe(7.33)
		expect(ws.getCell('E7').value).toBe(8.5)
		expect(ws.getCell('F7').value).toBe(7)
		expect(ws.getCell('G7').value).toBe(7.5)
		expect(ws.getCell('H7').value).toBe(7.25)
		expect(ws.getCell('K7').value).toBe(8)
		expect(ws.getCell('K8').value).toBeNull() // Bình: a semester has no rèn luyện
	})

	it('leaves a semester empty for a student who has no row in it', async () => {
		const report = {
			...yearFixture,
			students: [
				...yearFixture.students,
				{
					id: 1021,
					idnumber: 'TST0006',
					fullname: 'Giang Test',
					gpa: 7,
					classification: 'kha' as const,
					rank: 3,
					conduct: null
				}
			],
			periods: [semesterFixture, semester2Fixture]
		}
		const ws = (await buildYearWorkbook(report)).getWorksheet('Kết quả')!
		expect(ws.getCell('D9').value).toBe(7) // Giang HK1
		expect(ws.getCell('F9').value).toBeNull() // Giang HK2
	})

	it('has no per-course table on the summary sheet', async () => {
		const ws = (await buildYearWorkbook(yearFixture)).getWorksheet('Tổng hợp')!
		const heads: unknown[] = []
		ws.eachRow((row) => heads.push(row.getCell(1).value))
		expect(heads).not.toContain('Học phần')
	})
})

describe('exportFileName', () => {
	it('names a semester and a year file with an ASCII class name', () => {
		expect(exportFileName(semesterFixture)).toBe(
			'Ket_qua_hoc_tap_HK1_Nam1_TEST_RPT.xlsx'
		)
		expect(exportFileName(yearFixture)).toBe('Ket_qua_hoc_tap_Nam1_TEST_RPT.xlsx')
		expect(
			exportFileName({
				...yearFixture,
				class: { id: 1, name: 'Đại đội Y sĩ', idnumber: '' }
			})
		).toBe('Ket_qua_hoc_tap_Nam1_Dai_doi_Y_si.xlsx')
	})
})
```

- [ ] **Step 2: Run to see it fail**

Run: `cd apps/sms-web && pnpm exec vitest run src/lib/report/export/workbook.test.ts`
Expected: FAIL, cannot resolve `./workbook`.

- [ ] **Step 3: Implement `workbook.ts` — part 1, the sheet writer**

```ts
import type { Cell, Workbook, Worksheet } from 'exceljs'
import i18n from '@/i18n'
import { BANDS, bandKey, conductKey, scoreTone } from '@/lib/report/labels'
import type {
	ReportCourse,
	SemesterReport,
	StudentRow,
	Summary,
	YearReport
} from '@/lib/report/types'

const XLSX_MIME =
	'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

const t = (key: string, options?: Record<string, unknown>) =>
	i18n.t(key, options) as string

type CellValue = string | number | null
type Kind = 'score' | 'conduct' | 'rank' | 'text'

interface ColumnSpec {
	header: string
	sub?: string
	kind: Kind
	width: number
}
interface GroupSpec {
	title: string
	columns: ColumnSpec[]
}
interface SheetSpec {
	title: string
	className: string
	groups: GroupSpec[]
	/** [mã học viên, họ tên, ...one value per column of the groups] */
	rows: CellValue[][]
}

const FIXED_COLUMNS = 3
const HEADER_ROW = 5
const FIRST_ROW = 7

const NUMBER_FORMAT: Record<Kind, string | undefined> = {
	score: '0.00',
	conduct: '0.0',
	rank: '0',
	text: undefined
}
const TONE_FILL = { good: 'FFD9EAD3', warn: 'FFFCE8B2' } as const
const FAIL_COLOR = 'FFC00000'

const thin = { style: 'thin' as const }
const BORDER = { top: thin, left: thin, bottom: thin, right: thin }

type ExcelModule = typeof import('exceljs')

async function newWorkbook(): Promise<Workbook> {
	const mod = (await import('exceljs')) as ExcelModule & {
		default?: ExcelModule
	}
	const wb = new (mod.default ?? mod).Workbook()
	wb.creator = t('report.export.school')
	return wb
}

const fill = (argb: string) => ({
	type: 'pattern' as const,
	pattern: 'solid' as const,
	fgColor: { argb }
})

function styleHeader(cell: Cell, value: string) {
	cell.value = value
	cell.font = { bold: true }
	cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
	cell.border = BORDER
	cell.fill = fill('FFF2F2F2')
}

function styleScore(cell: Cell, value: number) {
	const tone = scoreTone(value)
	if (tone !== 'none') cell.fill = fill(TONE_FILL[tone])
	if (value < 5) cell.font = { color: { argb: FAIL_COLOR } }
}

function mergedLine(
	ws: Worksheet,
	row: number,
	lastColumn: number,
	text: string,
	size: number,
	bold: boolean
) {
	ws.mergeCells(row, 1, row, lastColumn)
	const cell = ws.getCell(row, 1)
	cell.value = text
	cell.font = { bold, size }
	cell.alignment = { horizontal: 'center' }
}

function writeMainSheet(wb: Workbook, spec: SheetSpec) {
	const ws = wb.addWorksheet(t('report.export.sheetResults'), {
		pageSetup: {
			orientation: 'landscape',
			paperSize: 9,
			fitToPage: true,
			fitToWidth: 1,
			fitToHeight: 0
		}
	})
	const columns = spec.groups.flatMap((g) => g.columns)
	const last = FIXED_COLUMNS + columns.length
	ws.columns = [
		{ width: 6 },
		{ width: 14 },
		{ width: 26 },
		...columns.map((c) => ({ width: c.width }))
	]

	mergedLine(ws, 1, last, t('report.export.school'), 12, true)
	mergedLine(ws, 2, last, spec.title, 14, true)
	mergedLine(ws, 3, last, t('report.export.class', { name: spec.className }), 11, false)

	;[t('report.col.no'), t('report.col.idnumber'), t('report.col.name')].forEach(
		(text, i) => {
			ws.mergeCells(HEADER_ROW, i + 1, HEADER_ROW + 1, i + 1)
			styleHeader(ws.getCell(HEADER_ROW, i + 1), text)
			ws.getCell(HEADER_ROW + 1, i + 1).border = BORDER
		}
	)
	let col = FIXED_COLUMNS + 1
	for (const group of spec.groups) {
		if (group.columns.length === 0) continue
		if (group.columns.length > 1) {
			ws.mergeCells(HEADER_ROW, col, HEADER_ROW, col + group.columns.length - 1)
		}
		styleHeader(ws.getCell(HEADER_ROW, col), group.title)
		group.columns.forEach((c, k) => {
			ws.getCell(HEADER_ROW, col + k).border = BORDER
			styleHeader(
				ws.getCell(HEADER_ROW + 1, col + k),
				c.sub ? `${c.header}\n${c.sub}` : c.header
			)
		})
		col += group.columns.length
	}
	ws.getRow(HEADER_ROW + 1).height = 32

	spec.rows.forEach((values, i) => {
		const r = FIRST_ROW + i
		const no = ws.getCell(r, 1)
		no.value = i + 1
		no.alignment = { horizontal: 'center' }
		no.border = BORDER
		values.forEach((value, k) => {
			const cell = ws.getCell(r, 2 + k)
			cell.value = value
			cell.border = BORDER
			const spec = columns[k - 2]
			if (!spec) return
			cell.alignment = { horizontal: spec.kind === 'text' ? 'left' : 'center' }
			if (typeof value === 'number') {
				const fmt = NUMBER_FORMAT[spec.kind]
				if (fmt) cell.numFmt = fmt
				if (spec.kind === 'score') styleScore(cell, value)
			}
		})
	})

	writeFooter(ws, FIRST_ROW + spec.rows.length + 1, last)
}

function writeFooter(ws: Worksheet, start: number, last: number) {
	ws.getCell(start, 2).value = t('report.export.legendTitle')
	ws.getCell(start, 2).font = { bold: true }
	const legend: [string, string | null][] = [
		[t('report.export.legendGood'), TONE_FILL.good],
		[t('report.export.legendWarn'), TONE_FILL.warn],
		[t('report.export.legendFail'), null]
	]
	legend.forEach(([text, argb], i) => {
		const swatch = ws.getCell(start + 1 + i, 2)
		swatch.border = BORDER
		if (argb) swatch.fill = fill(argb)
		else swatch.font = { color: { argb: FAIL_COLOR } }
		ws.getCell(start + 1 + i, 3).value = text
	})

	const mid = Math.max(4, Math.floor(last / 2))
	const signRow = start + 6
	ws.mergeCells(signRow, mid + 1, signRow, last)
	const place = ws.getCell(signRow, mid + 1)
	place.value = t('report.export.place')
	place.font = { italic: true }
	place.alignment = { horizontal: 'center' }

	const blocks: [number, number, string][] = [
		[2, mid, t('report.export.dean')],
		[mid + 1, last, t('report.export.principal')]
	]
	for (const [from, to, title] of blocks) {
		ws.mergeCells(signRow + 1, from, signRow + 1, to)
		const head = ws.getCell(signRow + 1, from)
		head.value = title
		head.font = { bold: true }
		head.alignment = { horizontal: 'center' }
		ws.mergeCells(signRow + 2, from, signRow + 2, to)
		const hint = ws.getCell(signRow + 2, from)
		hint.value = t('report.export.signHint')
		hint.font = { italic: true }
		hint.alignment = { horizontal: 'center' }
	}
}
```

- [ ] **Step 4: Implement `workbook.ts` — part 2, summary sheet, builders, file name and download** (append to the same file)

```ts
function writeSummarySheet(
	wb: Workbook,
	summary: Summary,
	courses: ReportCourse[] | undefined,
	className: string
) {
	const ws = wb.addWorksheet(t('report.export.sheetSummary'))
	ws.columns = [{ width: 26 }, { width: 24 }, { width: 14 }, ...BANDS.slice(3).map(() => ({ width: 14 }))]
	let r = 1
	const line = (values: CellValue[], bold = false) => {
		values.forEach((v, i) => {
			const cell = ws.getCell(r, i + 1)
			cell.value = v
			if (bold) cell.font = { bold: true }
		})
		r += 1
	}

	line([`${t('report.summary.title')} - ${className}`], true)
	r += 1
	line([t('report.summary.headcount'), summary.headcount])
	line([t('report.summary.classGpa'), summary.classGpa])
	line([t('report.summary.maxGpa'), summary.maxGpa])
	ws.getCell(r - 2, 2).numFmt = '0.00'
	ws.getCell(r - 1, 2).numFmt = '0.00'
	r += 1
	line([t('report.summary.distribution')], true)
	for (const band of BANDS) {
		line([t(bandKey(band)), summary.byClassification[band] ?? 0])
	}
	r += 1
	line([t('report.summary.top')], true)
	for (const entry of summary.top) {
		line([entry.rank, entry.fullname, entry.gpa])
		ws.getCell(r - 1, 3).numFmt = '0.00'
	}

	if (courses && summary.perCourse) {
		r += 1
		line([t('report.summary.perCourse')], true)
		line(
			[t('report.summary.course'), t('report.summary.mean'), ...BANDS.map((b) => t(bandKey(b)))],
			true
		)
		for (const c of courses) {
			const stats = summary.perCourse[String(c.id)]
			line([c.shortname, stats?.mean ?? null, ...BANDS.map((b) => stats?.bands[b] ?? 0)])
			ws.getCell(r - 1, 2).numFmt = '0.00'
		}
	}
}

const SCORE_WIDTH = 9

const conductLabel = (row: { conduct: StudentRow['conduct'] }) =>
	row.conduct ? t(conductKey(row.conduct.label)) : null

const bandLabel = (band: StudentRow['classification']) =>
	band ? t(bandKey(band)) : null

function summaryColumns(gpaHeader: string, conductHeader: string): ColumnSpec[] {
	return [
		{ header: gpaHeader, kind: 'score', width: SCORE_WIDTH },
		{ header: t('report.col.classification'), kind: 'text', width: 16 },
		{ header: t('report.col.rank'), kind: 'rank', width: 7 },
		{ header: conductHeader, kind: 'conduct', width: 11 },
		{ header: t('report.col.conductLabel'), kind: 'text', width: 16 }
	]
}

export async function buildSemesterWorkbook(report: SemesterReport): Promise<Workbook> {
	const wb = await newWorkbook()
	writeMainSheet(wb, {
		title: t('report.export.titleSemester', {
			semester: report.semester,
			year: report.year
		}),
		className: report.class.name,
		groups: [
			{
				title: t('report.col.courses'),
				columns: report.courses.map((c) => ({
					header: c.shortname,
					sub: t('report.col.credits', { count: c.credits }),
					kind: 'score' as const,
					width: SCORE_WIDTH
				}))
			},
			{
				title: t('report.col.summary'),
				columns: summaryColumns(t('report.col.gpa'), t('report.col.conduct'))
			}
		],
		rows: report.students.map((s) => [
			s.idnumber,
			s.fullname,
			...report.courses.map((c) => s.scores[String(c.id)] ?? null),
			s.gpa,
			bandLabel(s.classification),
			s.rank,
			s.conduct?.score ?? null,
			conductLabel(s)
		])
	})
	writeSummarySheet(wb, report.summary, report.courses, report.class.name)
	return wb
}

export async function buildYearWorkbook(report: YearReport): Promise<Workbook> {
	const wb = await newWorkbook()
	const byPeriod = report.periods.map(
		(p) => new Map(p.students.map((s) => [s.id, s]))
	)
	writeMainSheet(wb, {
		title: t('report.export.titleYear', { year: report.year }),
		className: report.class.name,
		groups: [
			...report.periods.map((p) => ({
				title: t('report.semester', { number: p.semester }),
				columns: [
					{ header: t('report.col.gpa'), kind: 'score' as const, width: SCORE_WIDTH },
					{ header: t('report.col.conduct'), kind: 'conduct' as const, width: 11 }
				]
			})),
			{
				title: t('report.col.summary'),
				columns: summaryColumns(t('report.col.gpaYear'), t('report.col.conductYear'))
			}
		],
		rows: report.students.map((s) => [
			s.idnumber,
			s.fullname,
			...byPeriod.flatMap((rows) => {
				const row = rows.get(s.id)
				return [row?.gpa ?? null, row?.conduct?.score ?? null]
			}),
			s.gpa,
			bandLabel(s.classification),
			s.rank,
			s.conduct?.score ?? null,
			conductLabel(s)
		])
	})
	writeSummarySheet(wb, report.summary, undefined, report.class.name)
	return wb
}

const ascii = (text: string) =>
	text
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.replace(/đ/g, 'd')
		.replace(/Đ/g, 'D')
		.replace(/[^A-Za-z0-9]+/g, '_')
		.replace(/^_+|_+$/g, '')

export function exportFileName(report: SemesterReport | YearReport): string {
	const cls = ascii(report.class.idnumber || report.class.name) || 'lop'
	return 'semester' in report
		? `Ket_qua_hoc_tap_HK${report.semester}_Nam${report.year}_${cls}.xlsx`
		: `Ket_qua_hoc_tap_Nam${report.year}_${cls}.xlsx`
}

export async function downloadWorkbook(wb: Workbook, filename: string) {
	const buffer = await wb.xlsx.writeBuffer()
	const url = URL.createObjectURL(new Blob([buffer], { type: XLSX_MIME }))
	const link = document.createElement('a')
	link.href = url
	link.download = filename
	document.body.appendChild(link)
	link.click()
	link.remove()
	URL.revokeObjectURL(url)
}

export async function exportReport(report: SemesterReport | YearReport) {
	const wb =
		'semester' in report
			? await buildSemesterWorkbook(report)
			: await buildYearWorkbook(report)
	await downloadWorkbook(wb, exportFileName(report))
}
```

- [ ] **Step 5: Run to verify pass**

Run: `cd apps/sms-web && pnpm exec vitest run src/lib/report/export/workbook.test.ts`
Expected: PASS. If a summary-sheet row assertion fails, print `rows` and compare: each `line([...])` writes its values from column A, so `['Khá', 2]` is the band row and `[1, 'Bình Test', 9]` the top entry. If `ws.getCell('D8').fill` is undefined in the colour test, `styleScore` did not run: it only runs for `kind === 'score'` numbers, and D is a course column.

- [ ] **Step 6: Type check**

Run: `cd apps/sms-web && pnpm exec tsc --noEmit 2>&1 | grep -E "src/(lib/report|components/reports|api/reports)"; echo done`
Expected: nothing before `done`.

- [ ] **Step 7: Commit** (only if asked)

```bash
git add apps/sms-web/src/lib/report/export
git commit -m "feat(sms-web): xlsx export of class reports"
```

---

### Task 9: Staff page — views, picker, export button, route, entry link

**Files:**
- Create: `apps/sms-web/src/components/reports/{PeriodPicker,ReportExportButton,SemesterReportView,YearReportView,ClassResultsPage}.tsx`
- Create test: `apps/sms-web/src/components/reports/SemesterReportView.test.tsx`
- Create: `apps/sms-web/src/routes/khoa-hoc/$categoryIdnumber/ket-qua.tsx`
- Modify: `apps/sms-web/src/routes/khoa-hoc/$categoryIdnumber/index.tsx`
- Regenerated: `apps/sms-web/src/routeTree.gen.ts`

**Interfaces:**
- Consumes: hooks and `reportKeys` (Task 3), `ReportTable`, `YearTable`, `SummaryPanel`, `WarningsBanner`, `ReportSkeleton/Error/Empty` (Tasks 5–7), `exportReport` (Task 8), `resolvePeriod`, `yearsOf`, `semestersOf`, `PeriodKey` (Task 2), `categoryFromParam`, `useAuth` (`isAdmin`, `isManager`, `isStudent`), ui `Tabs`, `Select`, `Button`, `toast` from `@repo/ui/components/ui/sonner`.
- Produces:
  - `PeriodPicker({periods: PeriodKey[], value: PeriodKey, withSemester: boolean, onChange: (p: PeriodKey) => void})`
  - `ReportExportButton({report: SemesterReport | YearReport})`
  - `SemesterReportView({categoryId, year, semester})`, `YearReportView({categoryId, year})`
  - `ClassResultsPage({category: CourseCategory})` and `ClassResults({categoryParam: string})` (resolves the category from `/categories`, so reload and deep links work)
  - Route `/khoa-hoc/$categoryIdnumber/ket-qua`.

- [ ] **Step 1: Write the failing test `SemesterReportView.test.tsx`**

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '@/i18n'
import { semesterFixture } from '@/lib/report/fixtures'

vi.mock('@/api', () => ({ CategoryApi: { GetCategories: vi.fn() } }))
vi.mock('@/api/reports', () => ({
	ReportApi: { semester: vi.fn(), saveConduct: vi.fn() },
	ReportError: class extends Error {}
}))

import { ReportApi } from '@/api/reports'
import { SemesterReportView } from './SemesterReportView'

const api = vi.mocked(ReportApi)

const renderView = () => {
	const client = new QueryClient({
		defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
	})
	return render(
		<QueryClientProvider client={client}>
			<SemesterReportView categoryId={72} year={1} semester={1} />
		</QueryClientProvider>
	)
}

beforeEach(() => {
	api.semester.mockReset()
	api.saveConduct.mockReset()
})
afterEach(cleanup)

describe('SemesterReportView', () => {
	it('shows a loading state, then the table, the summary and the warnings', async () => {
		api.semester.mockResolvedValue(semesterFixture)
		renderView()
		expect(screen.getByRole('status', { name: 'Đang tải kết quả' })).toBeTruthy()
		expect(await screen.findByText('An Test')).toBeTruthy()
		expect(screen.getByText('Tổng hợp lớp')).toBeTruthy()
		expect(screen.getByText(/Học phần SL chưa có điểm thi/)).toBeTruthy()
		expect(screen.getByRole('button', { name: /Tải Excel/ })).toBeTruthy()
		expect(api.semester).toHaveBeenCalledWith(72, 1, 1)
	})

	it('shows the error with a retry', async () => {
		api.semester.mockRejectedValue(new Error('boom'))
		renderView()
		const alert = await screen.findByRole('alert')
		expect(alert.textContent).toContain('boom')
		expect(screen.getByRole('button', { name: 'Thử lại' })).toBeTruthy()
	})

	it('shows an empty state when the class has no students', async () => {
		api.semester.mockResolvedValue({ ...semesterFixture, students: [] })
		renderView()
		expect(await screen.findByText('Chưa có điểm để lập báo cáo.')).toBeTruthy()
	})

	it('saves rèn luyện for one student and refetches the report', async () => {
		api.semester.mockResolvedValue(semesterFixture)
		api.saveConduct.mockResolvedValue({ saved: 1 })
		renderView()
		const input = await screen.findByLabelText('Rèn luyện của Bình Test')
		fireEvent.change(input, { target: { value: '9,5' } })
		fireEvent.blur(input)
		await vi.waitFor(() =>
			expect(api.saveConduct).toHaveBeenCalledWith(72, [
				{ studentId: 1017, year: 1, semester: 1, score: 9.5 }
			])
		)
		await vi.waitFor(() => expect(api.semester).toHaveBeenCalledTimes(2))
	})
})
```

- [ ] **Step 2: Run to see it fail**

Run: `cd apps/sms-web && pnpm exec vitest run src/components/reports/SemesterReportView.test.tsx`
Expected: FAIL, cannot resolve `./SemesterReportView`.

- [ ] **Step 3: Implement `PeriodPicker.tsx`**

```tsx
import { useTranslation } from 'react-i18next'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '@repo/ui/components/ui/select'
import {
	resolvePeriod,
	semestersOf,
	yearsOf,
	type PeriodKey
} from '@/lib/report/periods'

interface PeriodPickerProps {
	periods: PeriodKey[]
	value: PeriodKey
	withSemester: boolean
	onChange: (period: PeriodKey) => void
}

export function PeriodPicker({
	periods,
	value,
	withSemester,
	onChange
}: PeriodPickerProps) {
	const { t } = useTranslation()
	return (
		<div className='flex flex-wrap items-center gap-3'>
			<Select
				value={String(value.year)}
				onValueChange={(year) =>
					onChange(resolvePeriod(periods, { year: Number(year) }) ?? value)
				}
			>
				<SelectTrigger aria-label={t('report.pickYear')} className='w-36'>
					<SelectValue />
				</SelectTrigger>
				<SelectContent>
					{yearsOf(periods).map((y) => (
						<SelectItem key={y} value={String(y)}>
							{t('report.year', { number: y })}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
			{withSemester && (
				<Select
					value={String(value.semester)}
					onValueChange={(semester) =>
						onChange({ year: value.year, semester: Number(semester) })
					}
				>
					<SelectTrigger aria-label={t('report.pickSemester')} className='w-36'>
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						{semestersOf(periods, value.year).map((s) => (
							<SelectItem key={s} value={String(s)}>
								{t('report.semester', { number: s })}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			)}
		</div>
	)
}
```

- [ ] **Step 4: Implement `ReportExportButton.tsx`**

```tsx
import { useState } from 'react'
import { FileDown, Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@repo/ui/components/ui/button'
import { toast } from '@repo/ui/components/ui/sonner'
import { exportReport } from '@/lib/report/export/workbook'
import type { SemesterReport, YearReport } from '@/lib/report/types'

export function ReportExportButton({
	report
}: {
	report: SemesterReport | YearReport
}) {
	const { t } = useTranslation()
	const [busy, setBusy] = useState(false)

	const onClick = async () => {
		setBusy(true)
		try {
			await exportReport(report)
			toast.success(t('report.export.success'))
		} catch (err) {
			console.error(err)
			toast.error(t('report.export.error'))
		} finally {
			setBusy(false)
		}
	}

	return (
		<Button variant='outline' onClick={onClick} disabled={busy}>
			{busy ? <Loader2 className='animate-spin' /> : <FileDown />}
			{busy ? t('report.export.exporting') : t('report.export.button')}
		</Button>
	)
}
```

- [ ] **Step 5: Implement `SemesterReportView.tsx` and `YearReportView.tsx`**

`SemesterReportView.tsx`:

```tsx
import { useTranslation } from 'react-i18next'
import { toast } from '@repo/ui/components/ui/sonner'
import { ReportExportButton } from './ReportExportButton'
import { ReportTable } from './ReportTable'
import { ReportEmpty, ReportError, ReportSkeleton } from './ReportStates'
import { SummaryPanel } from './SummaryPanel'
import { useSaveConduct, useSemesterReport } from './useReport'
import { WarningsBanner } from './WarningsBanner'

interface SemesterReportViewProps {
	categoryId: number
	year: number
	semester: number
}

export function SemesterReportView({
	categoryId,
	year,
	semester
}: SemesterReportViewProps) {
	const { t } = useTranslation()
	const query = useSemesterReport(categoryId, year, semester)
	const save = useSaveConduct(categoryId)

	if (query.isLoading) return <ReportSkeleton />
	if (query.isError) {
		return (
			<ReportError
				message={query.error.message}
				onRetry={() => query.refetch()}
			/>
		)
	}
	const report = query.data
	if (!report || report.students.length === 0) {
		return <ReportEmpty message={t('report.states.empty')} />
	}

	const onSaveConduct = (studentId: number, score: number | null) =>
		save.mutate([{ studentId, year, semester, score }], {
			onSuccess: () => toast.success(t('report.conduct.saved')),
			onError: (err) =>
				toast.error(err.message || t('report.conduct.saveError'))
		})

	return (
		<div className='space-y-6'>
			<div className='flex justify-end'>
				<ReportExportButton report={report} />
			</div>
			<WarningsBanner warnings={report.warnings} courses={report.courses} />
			<div className='bg-card rounded-lg border'>
				<ReportTable report={report} onSaveConduct={onSaveConduct} />
			</div>
			<SummaryPanel summary={report.summary} courses={report.courses} />
		</div>
	)
}
```

`YearReportView.tsx`:

```tsx
import { useTranslation } from 'react-i18next'
import { ReportExportButton } from './ReportExportButton'
import { ReportEmpty, ReportError, ReportSkeleton } from './ReportStates'
import { SummaryPanel } from './SummaryPanel'
import { useYearReport } from './useReport'
import { WarningsBanner } from './WarningsBanner'
import { YearTable } from './YearTable'

export function YearReportView({
	categoryId,
	year
}: {
	categoryId: number
	year: number
}) {
	const { t } = useTranslation()
	const query = useYearReport(categoryId, year)

	if (query.isLoading) return <ReportSkeleton />
	if (query.isError) {
		return (
			<ReportError
				message={query.error.message}
				onRetry={() => query.refetch()}
			/>
		)
	}
	const report = query.data
	if (!report || report.students.length === 0) {
		return <ReportEmpty message={t('report.states.empty')} />
	}

	return (
		<div className='space-y-6'>
			<div className='flex justify-end'>
				<ReportExportButton report={report} />
			</div>
			<WarningsBanner
				warnings={report.warnings}
				courses={report.periods.flatMap((p) => p.courses)}
			/>
			<div className='bg-card rounded-lg border'>
				<YearTable report={report} />
			</div>
			<SummaryPanel summary={report.summary} />
		</div>
	)
}
```

- [ ] **Step 6: Run the view test**

Run: `cd apps/sms-web && pnpm exec vitest run src/components/reports/SemesterReportView.test.tsx`
Expected: PASS (4 tests). If the refetch assertion is flaky, the cause is `useSaveConduct` invalidating with the prefix `['report','class',72,'semester']`, which must match `reportKeys.semester`'s prefix; do not weaken the assertion.

- [ ] **Step 7: Implement `ClassResultsPage.tsx`**

```tsx
import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import {
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger
} from '@repo/ui/components/ui/tabs'
import { categoryFromParam } from '@/lib/report/category'
import { resolvePeriod, type PeriodKey } from '@/lib/report/periods'
import type { CourseCategory } from '@/types'
import { PeriodPicker } from './PeriodPicker'
import { ReportEmpty, ReportError, ReportSkeleton } from './ReportStates'
import { SemesterReportView } from './SemesterReportView'
import { useCategories, usePeriods } from './useReport'
import { WarningsBanner } from './WarningsBanner'
import { YearReportView } from './YearReportView'

/** Resolves the class from the URL (idnumber or id) so reloads and deep links work. */
export function ClassResults({ categoryParam }: { categoryParam: string }) {
	const { t } = useTranslation()
	const categories = useCategories()

	if (categories.isLoading) {
		return (
			<div className='p-6'>
				<ReportSkeleton />
			</div>
		)
	}
	if (categories.isError) {
		return (
			<div className='p-6'>
				<ReportError
					message={categories.error.message}
					onRetry={() => categories.refetch()}
				/>
			</div>
		)
	}
	const category = categoryFromParam(categories.data ?? [], categoryParam)
	if (!category) {
		return (
			<div className='p-6'>
				<ReportEmpty message={t('report.states.classNotFound')} />
			</div>
		)
	}
	return <ClassResultsPage category={category} />
}

export function ClassResultsPage({ category }: { category: CourseCategory }) {
	const { t } = useTranslation()
	const periodsQuery = usePeriods(category.id)
	const [tab, setTab] = useState<'semester' | 'year'>('semester')
	const [wanted, setWanted] = useState<Partial<PeriodKey>>({})

	const periods = periodsQuery.data?.periods ?? []
	const period = resolvePeriod(periods, wanted)
	const unassigned = periodsQuery.data?.unassigned ?? []
	const param = category.idnumber?.trim() ? category.idnumber : String(category.id)

	return (
		<div className='container mx-auto space-y-6 p-6'>
			<header className='space-y-1'>
				<h2 className='ink-in text-3xl font-bold'>
					{t('report.classTitle', { name: category.name })}
				</h2>
				<Link
					to='/khoa-hoc/$categoryIdnumber'
					params={{ categoryIdnumber: param }}
					state={{ category: { id: category.id } }}
					className='text-muted-foreground text-sm underline'
				>
					{t('report.back')}
				</Link>
			</header>

			{periodsQuery.isLoading ? (
				<ReportSkeleton />
			) : periodsQuery.isError ? (
				<ReportError
					message={periodsQuery.error.message}
					onRetry={() => periodsQuery.refetch()}
				/>
			) : (
				<>
					<WarningsBanner warnings={[]} courses={[]} unassigned={unassigned} />
					{!period ? (
						<ReportEmpty message={t('report.states.noPeriods')} />
					) : (
						<Tabs
							value={tab}
							onValueChange={(v) => setTab(v as 'semester' | 'year')}
						>
							<div className='flex flex-wrap items-center justify-between gap-3'>
								<TabsList>
									<TabsTrigger value='semester'>
										{t('report.tabSemester')}
									</TabsTrigger>
									<TabsTrigger value='year'>{t('report.tabYear')}</TabsTrigger>
								</TabsList>
								<PeriodPicker
									periods={periods}
									value={period}
									withSemester={tab === 'semester'}
									onChange={setWanted}
								/>
							</div>
							<TabsContent value='semester' className='mt-6'>
								<SemesterReportView
									categoryId={category.id}
									year={period.year}
									semester={period.semester}
								/>
							</TabsContent>
							<TabsContent value='year' className='mt-6'>
								<YearReportView categoryId={category.id} year={period.year} />
							</TabsContent>
						</Tabs>
					)}
				</>
			)}
		</div>
	)
}
```

- [ ] **Step 8: Create the route `src/routes/khoa-hoc/$categoryIdnumber/ket-qua.tsx`**

```tsx
import type { ReactNode } from 'react'
import { Navigate, createFileRoute } from '@tanstack/react-router'
import ProtectedRoute from '@/components/ProtectedRoute'
import { ClassResults } from '@/components/reports/ClassResultsPage'
import useAuth from '@/hooks/useAuth'

export const Route = createFileRoute('/khoa-hoc/$categoryIdnumber/ket-qua')({
	component: RouteComponent
})

// Class reports are for admin and manager; everyone else goes home.
function StaffOnly({ children }: { children: ReactNode }) {
	const { isAdmin, isManager } = useAuth()
	if (!isAdmin && !isManager) return <Navigate to='/' replace />
	return <>{children}</>
}

function RouteComponent() {
	const { categoryIdnumber } = Route.useParams()
	return (
		<ProtectedRoute>
			<StaffOnly>
				<ClassResults categoryParam={categoryIdnumber} />
			</StaffOnly>
		</ProtectedRoute>
	)
}
```

- [ ] **Step 9: Regenerate the route tree**

Run: `cd /home/hadius/Workspace/monorepo/turborepo/unamed-repo && pnpm --filter sms-web build 2>&1 | tail -15 && git diff --stat apps/sms-web/src/routeTree.gen.ts`
Expected: the build succeeds (this also proves `exceljs` bundles), and `routeTree.gen.ts` gained the `ket-qua` route. If the diff also reformats unrelated lines, keep the file as generated: it is the plugin's own output and a hand edit would be overwritten on the next run.

- [ ] **Step 10: Add the entry link on the class page**

In `src/routes/khoa-hoc/$categoryIdnumber/index.tsx` add imports:

```tsx
import { ClipboardList } from 'lucide-react'
import { Button } from '@repo/ui/components/ui/button'
import useAuth from '@/hooks/useAuth'
```

Inside `RouteComponent`, after `const { categoryIdnumber } = Route.useParams()` add `const { isAdmin, isManager } = useAuth()`. Then replace the opening of the returned tree:

```tsx
		<ProtectedRoute>
			{isCoursesLoading ? (
```

with:

```tsx
		<ProtectedRoute>
			{(isAdmin || isManager) && (
				<div className='flex justify-end px-6 pt-6'>
					<Button asChild variant='outline'>
						<Link
							to='/khoa-hoc/$categoryIdnumber/ket-qua'
							params={{ categoryIdnumber }}
						>
							<ClipboardList />
							{t('report.link.classResults')}
						</Link>
					</Button>
				</div>
			)}
			{isCoursesLoading ? (
```

(`Link` is already imported in that file.)

- [ ] **Step 11: Type check and run the report tests**

Run: `cd apps/sms-web && pnpm exec tsc --noEmit 2>&1 | grep -E "src/(lib/report|components/reports|api/reports|routes)"; pnpm exec vitest run src/components/reports src/lib/report src/api; echo done`
Expected: no type errors listed; all tests PASS.

- [ ] **Step 12: Commit** (only if asked)

```bash
git add apps/sms-web/src/components/reports apps/sms-web/src/routes apps/sms-web/src/routeTree.gen.ts
git commit -m "feat(sms-web): class results page for admin and manager"
```

---

### Task 10: Student page — cards, page, route, entry links

**Files:**
- Create: `apps/sms-web/src/components/reports/MyResultCards.tsx`, `MyResultCards.test.tsx`, `MyResultsPage.tsx`
- Create: `apps/sms-web/src/routes/ket-qua.tsx`
- Modify: `apps/sms-web/src/components/app-sidebar.tsx`, `apps/sms-web/src/components/student/dashboard.tsx`
- Regenerated: `apps/sms-web/src/routeTree.gen.ts`

**Interfaces:**
- Consumes: `MySemester`, `MyYear`, `mySemesterFixture`, `myYearFixture`, `ScoreCell`, `Dash`, `bandKey`, `conductKey`, `Score`, hooks `useMyPeriods/useMySemester/useMyYear`, `PeriodPicker`, `ReportError` class from `@/api/reports` (for the 404 check).
- Produces: `MySemesterCard({data: MySemester})`, `MyYearCard({data: MyYear})`, `MyResultsPage()`, route `/ket-qua`.

- [ ] **Step 1: Write the failing test `MyResultCards.test.tsx`**

```tsx
import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import '@/i18n'
import { mySemesterFixture, myYearFixture } from '@/lib/report/fixtures'
import { MySemesterCard, MyYearCard } from './MyResultCards'

afterEach(cleanup)

describe('MySemesterCard', () => {
	it('shows ĐTB, xếp loại, rank of the class and rèn luyện', () => {
		render(<MySemesterCard data={mySemesterFixture} />)
		expect(screen.getByText('7.33')).toBeTruthy()
		expect(screen.getByText('Khá')).toBeTruthy()
		expect(screen.getByText('Hạng 2/4 trong lớp')).toBeTruthy()
		expect(screen.getByText('8.5')).toBeTruthy()
		expect(screen.getByText('Tốt')).toBeTruthy()
	})

	it('lists each course with its credits and score', () => {
		render(<MySemesterCard data={mySemesterFixture} />)
		const gp = within(screen.getByText('Giải phẫu').closest('tr') as HTMLElement)
		expect(gp.getByText('4')).toBeTruthy()
		expect(gp.getByText('8.00')).toBeTruthy()
		expect(within(screen.getByText('Sinh lý').closest('tr') as HTMLElement).getByText('6.00')).toBeTruthy()
	})

	it('says so when the student is not ranked, and dashes an empty result', () => {
		render(
			<MySemesterCard
				data={{
					...mySemesterFixture,
					row: {
						...mySemesterFixture.row,
						gpa: null,
						classification: null,
						rank: null,
						conduct: null,
						scores: {}
					}
				}}
			/>
		)
		expect(screen.getByText('Chưa xếp hạng')).toBeTruthy()
		expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(3)
	})

	it('never shows another student', () => {
		const { container } = render(<MySemesterCard data={mySemesterFixture} />)
		expect(container.textContent).not.toContain('Bình')
	})
})

describe('MyYearCard', () => {
	it('shows the year result and a card for each semester', () => {
		render(<MyYearCard data={myYearFixture} />)
		expect(screen.getByText('Tổng kết năm 1')).toBeTruthy()
		expect(screen.getByText('7.25')).toBeTruthy()
		expect(screen.getByText('Hạng 2/2 trong lớp')).toBeTruthy()
		expect(screen.getByText('Học kỳ 1, Năm 1')).toBeTruthy()
		expect(screen.getByText('Học kỳ 2, Năm 1')).toBeTruthy()
	})
})
```

- [ ] **Step 2: Run to see it fail**

Run: `cd apps/sms-web && pnpm exec vitest run src/components/reports/MyResultCards.test.tsx`
Expected: FAIL, cannot resolve `./MyResultCards`.

- [ ] **Step 3: Implement `MyResultCards.tsx`**

```tsx
import { useTranslation } from 'react-i18next'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from '@repo/ui/components/ui/card'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow
} from '@repo/ui/components/ui/table'
import { Score } from '@/components/score'
import { bandKey, conductKey } from '@/lib/report/labels'
import type {
	Band,
	Conduct,
	MySemester,
	MyYear
} from '@/lib/report/types'
import { Dash, ScoreCell } from './cells'

function ResultHead({
	gpa,
	band,
	conduct
}: {
	gpa: number | null
	band: Band | null
	conduct: Conduct | null
}) {
	const { t } = useTranslation()
	return (
		<div className='flex flex-wrap items-end gap-x-10 gap-y-3'>
			<div>
				<p className='text-muted-foreground text-sm'>{t('report.col.gpa')}</p>
				{gpa === null ? <Dash /> : <Score value={gpa} className='total-rule text-4xl' />}
			</div>
			<div>
				<p className='text-muted-foreground text-sm'>
					{t('report.col.classification')}
				</p>
				<p className='text-lg'>{band ? t(bandKey(band)) : <Dash />}</p>
			</div>
			<div>
				<p className='text-muted-foreground text-sm'>{t('report.mine.conduct')}</p>
				<p className='text-lg'>
					{conduct ? (
						<>
							<span className='score'>{conduct.score.toFixed(1)}</span>{' '}
							{t(conductKey(conduct.label))}
						</>
					) : (
						<Dash />
					)}
				</p>
			</div>
		</div>
	)
}

const rankText = (
	t: (key: string, o?: Record<string, unknown>) => string,
	rank: number | null,
	ranked: number
) =>
	rank === null
		? t('report.mine.notRanked')
		: t('report.mine.rankOf', { rank, ranked })

export function MySemesterCard({ data }: { data: MySemester }) {
	const { t } = useTranslation()
	const { row } = data
	return (
		<Card>
			<CardHeader>
				<CardTitle>
					{t('report.semester', { number: data.semester })},{' '}
					{t('report.year', { number: data.year })}
				</CardTitle>
				<CardDescription>{rankText(t, row.rank, data.ranked)}</CardDescription>
			</CardHeader>
			<CardContent className='space-y-5'>
				<ResultHead gpa={row.gpa} band={row.classification} conduct={row.conduct} />
				<Table>
					<TableHeader>
						<TableRow className='hover:bg-transparent'>
							<TableHead>{t('report.summary.course')}</TableHead>
							<TableHead className='text-center'>{t('report.mine.credits')}</TableHead>
							<TableHead className='text-center'>{t('report.col.gpa')}</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{data.courses.map((c) => (
							<TableRow key={c.id}>
								<TableCell>{c.fullname}</TableCell>
								<TableCell className='score text-center'>{c.credits}</TableCell>
								<ScoreCell value={row.scores[String(c.id)] ?? null} />
							</TableRow>
						))}
					</TableBody>
				</Table>
			</CardContent>
		</Card>
	)
}

export function MyYearCard({ data }: { data: MyYear }) {
	const { t } = useTranslation()
	const { row } = data
	return (
		<div className='space-y-6'>
			<Card>
				<CardHeader>
					<CardTitle>{t('report.mine.yearTitle', { number: data.year })}</CardTitle>
					<CardDescription>{rankText(t, row.rank, data.ranked)}</CardDescription>
				</CardHeader>
				<CardContent>
					<ResultHead gpa={row.gpa} band={row.classification} conduct={row.conduct} />
				</CardContent>
			</Card>
			<div className='grid grid-cols-1 gap-6 xl:grid-cols-2'>
				{data.periods.map((p) => (
					<MySemesterCard key={p.semester} data={p} />
				))}
			</div>
		</div>
	)
}
```

The test's `getByText('8.5')` and `getByText('Tốt')` rely on the score `<span>` being its own element (it is) and on `Tốt` sitting in the same `<p>` as a text node next to it: `getByText('Tốt')` matches elements whose own text content is `Tốt`, which fails when the `<p>` also contains `8.5`. Fix by wrapping the label:

```tsx
							<span className='score'>{conduct.score.toFixed(1)}</span>{' '}
							<span>{t(conductKey(conduct.label))}</span>
```

Apply that change now (replace the `{t(conductKey(conduct.label))}` text node with the `<span>`).

- [ ] **Step 4: Run to verify pass**

Run: `cd apps/sms-web && pnpm exec vitest run src/components/reports/MyResultCards.test.tsx`
Expected: PASS. (`getByText('7.33')` matches only the big ĐTB; the course rows show 8.00 and 6.00.)

- [ ] **Step 5: Implement `MyResultsPage.tsx`**

```tsx
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger
} from '@repo/ui/components/ui/tabs'
import { ReportError as ReportApiError } from '@/api/reports'
import { resolvePeriod, type PeriodKey } from '@/lib/report/periods'
import { MySemesterCard, MyYearCard } from './MyResultCards'
import { PeriodPicker } from './PeriodPicker'
import { ReportEmpty, ReportError, ReportSkeleton } from './ReportStates'
import { useMyPeriods, useMySemester, useMyYear } from './useReport'

function useMessage() {
	const { t } = useTranslation()
	return (err: Error) =>
		err instanceof ReportApiError && err.status === 404
			? t('report.mine.noClass')
			: err.message
}

function MySemesterView({ year, semester }: PeriodKey) {
	const message = useMessage()
	const query = useMySemester(year, semester)
	if (query.isLoading) return <ReportSkeleton />
	if (query.isError) {
		return <ReportError message={message(query.error)} onRetry={() => query.refetch()} />
	}
	return <MySemesterCard data={query.data!} />
}

function MyYearView({ year }: { year: number }) {
	const message = useMessage()
	const query = useMyYear(year)
	if (query.isLoading) return <ReportSkeleton />
	if (query.isError) {
		return <ReportError message={message(query.error)} onRetry={() => query.refetch()} />
	}
	return <MyYearCard data={query.data!} />
}

export function MyResultsPage() {
	const { t } = useTranslation()
	const message = useMessage()
	const periodsQuery = useMyPeriods()
	const [tab, setTab] = useState<'semester' | 'year'>('semester')
	const [wanted, setWanted] = useState<Partial<PeriodKey>>({})

	const periods = periodsQuery.data?.periods ?? []
	const period = resolvePeriod(periods, wanted)

	return (
		<div className='container mx-auto space-y-6 p-6'>
			<header className='space-y-1'>
				<h2 className='ink-in text-3xl font-bold'>{t('report.mine.title')}</h2>
				<p className='text-muted-foreground'>{t('report.mine.subtitle')}</p>
			</header>

			{periodsQuery.isLoading ? (
				<ReportSkeleton />
			) : periodsQuery.isError ? (
				<ReportError
					message={message(periodsQuery.error)}
					onRetry={() => periodsQuery.refetch()}
				/>
			) : !period ? (
				<ReportEmpty message={t('report.states.noPeriods')} />
			) : (
				<Tabs value={tab} onValueChange={(v) => setTab(v as 'semester' | 'year')}>
					<div className='flex flex-wrap items-center justify-between gap-3'>
						<TabsList>
							<TabsTrigger value='semester'>{t('report.tabSemester')}</TabsTrigger>
							<TabsTrigger value='year'>{t('report.tabYear')}</TabsTrigger>
						</TabsList>
						<PeriodPicker
							periods={periods}
							value={period}
							withSemester={tab === 'semester'}
							onChange={setWanted}
						/>
					</div>
					<TabsContent value='semester' className='mt-6'>
						<MySemesterView year={period.year} semester={period.semester} />
					</TabsContent>
					<TabsContent value='year' className='mt-6'>
						<MyYearView year={period.year} />
					</TabsContent>
				</Tabs>
			)}
		</div>
	)
}
```

- [ ] **Step 6: Create the route `src/routes/ket-qua.tsx`**

```tsx
import type { ReactNode } from 'react'
import { Navigate, createFileRoute } from '@tanstack/react-router'
import ProtectedRoute from '@/components/ProtectedRoute'
import { MyResultsPage } from '@/components/reports/MyResultsPage'
import useAuth from '@/hooks/useAuth'

export const Route = createFileRoute('/ket-qua')({
	component: RouteComponent
})

// Staff have the class report instead; only students see their own result.
function StudentOnly({ children }: { children: ReactNode }) {
	const { isStudent } = useAuth()
	if (!isStudent) return <Navigate to='/' replace />
	return <>{children}</>
}

function RouteComponent() {
	return (
		<ProtectedRoute>
			<StudentOnly>
				<MyResultsPage />
			</StudentOnly>
		</ProtectedRoute>
	)
}
```

- [ ] **Step 7: Sidebar link for students**

In `src/components/app-sidebar.tsx`: add `GraduationCap` to the `lucide-react` import list; change `const { hasElevatedAccess, isAdmin, isManager, role } = useAuth()` to also destructure `isStudent`; and replace the `baseNav` general group items:

```tsx
				items: [{ title: t('nav.home'), url: '/', icon: Home }]
```

with:

```tsx
				items: [
					{ title: t('nav.home'), url: '/', icon: Home },
					...(isStudent
						? [
								{
									title: t('report.link.myResults'),
									url: '/ket-qua',
									icon: GraduationCap
								}
							]
						: [])
				]
```

- [ ] **Step 8: Link from the student dashboard**

In `src/components/student/dashboard.tsx` add imports:

```tsx
import { Link } from '@tanstack/react-router'
import { GraduationCap } from 'lucide-react'
import { Button } from '@repo/ui/components/ui/button'
```

and replace the page header block

```tsx
			<div className='space-y-2'>
				<h2 className='text-3xl font-bold text-foreground'>
					{t('dashboard.student.title')}
				</h2>
				<p className='text-muted-foreground'>
					{t('dashboard.student.subtitle')}
				</p>
			</div>
```

with:

```tsx
			<div className='flex flex-wrap items-start justify-between gap-4'>
				<div className='space-y-2'>
					<h2 className='text-3xl font-bold text-foreground'>
						{t('dashboard.student.title')}
					</h2>
					<p className='text-muted-foreground'>
						{t('dashboard.student.subtitle')}
					</p>
				</div>
				<Button asChild variant='outline'>
					<Link to='/ket-qua'>
						<GraduationCap />
						{t('report.link.myResults')}
					</Link>
				</Button>
			</div>
```

- [ ] **Step 9: Regenerate the route tree, type check, test**

Run: `cd /home/hadius/Workspace/monorepo/turborepo/unamed-repo && pnpm --filter sms-web build 2>&1 | tail -8; cd apps/sms-web && pnpm exec tsc --noEmit 2>&1 | grep -E "src/(lib/report|components/reports|components/app-sidebar|components/student/dashboard|api/reports|routes)"; pnpm exec vitest run; echo done`
Expected: build succeeds; no type errors listed; whole suite PASS (existing tests included).

- [ ] **Step 10: Commit** (only if asked)

```bash
git add apps/sms-web/src/components/reports apps/sms-web/src/routes/ket-qua.tsx apps/sms-web/src/components/app-sidebar.tsx apps/sms-web/src/components/student/dashboard.tsx apps/sms-web/src/routeTree.gen.ts
git commit -m "feat(sms-web): student results page"
```

---

### Task 11: End-to-end check against the synthetic class

The dev Moodle already has the synthetic class (category id 72, idnumber `TEST.RPT`, students TST0001–TST0006, courses `TST-GP`, `TST-SL`, `TST-KT`, `TST-OLD`, four stored conduct scores) and the deployed plugin. If it was cleaned up, recreate it with `php seed_reports.php` from the session scratchpad (see the backend plan, Task 9).

**Files:** none changed unless a defect is found.

- [ ] **Step 1: Start the stack**

Run `encore run` in `apps/sms-api` (the app's `Local` base URL is `http://localhost:4000`; if another Encore app holds that port, stop it first) and `pnpm --filter sms-web dev` (port 3000).

- [ ] **Step 2: Staff flow (dev Moodle admin account; the user supplies credentials)**

Log in, open the class `TEST.RPT` from the sidebar, click **Kết quả lớp**. Check:
1. URL is `/khoa-hoc/TEST.RPT/ket-qua`; reload the page and it still loads (category resolved from `/categories`).
2. Semester tab: the table matches `GET /reports/classes/72/years/1/semesters/1` (An 7.33, Bình 9.00, …); failing scores are circled; 9+ cells are green, 5–6.99 amber; missing scores show `—`.
3. Type `9,5` into a student's rèn luyện, press Enter: toast "Đã lưu điểm rèn luyện", the label column updates; type `11`: red invalid state and no request; clear the field: the score is deleted.
4. Switch the year tab: per-semester ĐTB and rèn luyện next to the year totals; year rèn luyện is empty when a semester has none.
5. Warnings banner lists the unassigned `TST-OLD` course.
6. **Tải Excel** downloads `Ket_qua_hoc_tap_HK1_Nam1_TEST_RPT.xlsx`; open it in a spreadsheet: numbers are right-aligned numeric cells, merged headers, legend, two signature blocks, and the `Tổng hợp` sheet. Repeat for the year tab.
7. Sign in as a teacher: `/khoa-hoc/TEST.RPT/ket-qua` redirects to `/`.

- [ ] **Step 3: Student flow**

Sign in as a synthetic student (mint a token with the scratchpad `mint.py`, or use a Moodle student account enrolled in category 72). Check: the sidebar and the dashboard show **Kết quả học tập**; `/ket-qua` shows only the student's own card (ĐTB, xếp loại, `Hạng x/y trong lớp`, rèn luyện, per-course scores); the year tab shows the year card and one card per semester; no other student's name appears in the page or in the network responses; a staff account visiting `/ket-qua` is redirected to `/`.

- [ ] **Step 4: Empty and error states**

Stop `sms-api` and reload a report page: the error card with the server or network message and **Thử lại**; restart the API and click it: the report loads. Open a class without any course that has `year` and `semester`: the "chưa có học phần nào gắn năm học và học kỳ" message.

- [ ] **Step 5: Final automated run**

Run: `cd apps/sms-web && pnpm exec vitest run && pnpm exec tsc --noEmit 2>&1 | grep -E "src/(lib/report|components/reports|api/reports|routes)"; cd ../sms-api && ENV=test encore test ./... 2>&1 | tail -15`
Expected: web tests PASS, no type errors in the touched files, Go tests PASS.

- [ ] **Step 6: Report** what was verified and what was not (for instance, the Excel file opened in a real spreadsheet application, performance on a real class such as Y53 with 33 courses).

---

## Self-review (spec coverage)

- §7 Web: staff route with tabs (Task 9), sticky name column, group headers, colour bands, summary panel with stacked distribution bar and top 3 (Tasks 5–7), inline rèn luyện input saving through `PUT …/conduct` and read-only year value (Tasks 4, 5, 6, 9), semester pickers from `…/periods` (Tasks 2, 9), student route `/ket-qua` linked from sidebar and dashboard (Task 10), deep-link category resolution (Tasks 2, 9), all copy in `vi.json` (Task 2), loading/empty/incomplete/error states (Tasks 7, 9, 10), files under `components/reports` and `lib/report` with types only (no maths).
- §8 Export: browser-side `exceljs`, landscape A4 fit-to-width, merged group headers, fills, legend, place/date and two signature blocks, second summary sheet, numeric cells with formats, button on the page for the selected semester or year (Tasks 8, 9). Deviation, stated in Global Constraints: 2-decimal formats instead of the spec's one-decimal wording, so the file equals the screen.
- §9 Web tests: table rendering (six colour tones are covered by the three tone classes plus the circled failing case), conduct input, export builder (headers, merges, numeric cell types, row order) using shared fixtures.
- Gap found and closed: a student had no way to list periods, so Task 1 adds `GET /reports/me/periods` to the backend.
- Not in this plan (by decision): dashboard/grade-table and Moodle plugin alignment (spec §12 steps 7–8) goes in a separate plan, because the teacher grade table needs a per-course results endpoint that does not exist yet.

**Type consistency check:** `ConductEntry` (Task 2) is what `ReportApi.saveConduct` (Task 3) and `useSaveConduct` (Task 3) take and what `SemesterReportView` (Task 9) builds; `PeriodKey` (Task 2) is the value type of `PeriodPicker` (Task 9) and the props of `MySemesterView` (Task 10); `exportReport` (Task 8) is used by `ReportExportButton` (Task 9); `Dash` and `ScoreCell` (Task 5) are reused in Tasks 6, 7, 10.
