# Class Results Reports — Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `apps/sms-api` serves semester and year class-results reports (per-course ĐMH, credit-weighted ĐTB, rank, classification, rèn luyện) to admins and managers, and each student's own result and rank to that student.

**Architecture:** A pure Go package `reporting` holds every calculation (exact-decimal, no I/O). A `classreport` package reads a class's courses and grades from Moodle through the existing `mdlapi` providers, reads rèn luyện scores from sms-api's own `sms_conduct` table (`conduct` package), and feeds `reporting`. A new Encore service `usrreports` exposes it. One small additive change to the Moodle `local_coursegrades` plugin sends a per-grade `graded` flag (Moodle reports a blank grade as 0, which would break the retake rule) and the student `idnumber` (Mã HV).

**Tech Stack:** Go 1.24 (module `encore.app`), Encore v1.58, `pocketbase/dbx` for MySQL, `golang-migrate` (embedded SQL), PHP (Moodle plugin).

**Spec:** `docs/superpowers/specs/2026-09-21-class-results-reports-design.md` (read it first). This is plan 1 of 2. Plan 2 (sms-web: pages, xlsx export, alignment of the student dashboard and the Moodle `customgradeexport` calculators) is written after this backend is stable.

## Global Constraints

- **ĐMH** = 0.4·ĐTBKT + 0.6·ĐKTM, 2 decimals. ĐTBKT = (ΣKTTX + 2·ΣKTĐK) / (nKTTX + 2·nKTĐK) using the actual number of configured items (never assume equal counts). KTTX = exam type `15P`, KTĐK = `1T`, ĐKTM = `Thi`.
- A blank test or exam counts as 0 (and still counts in the denominator). Retake: the latest graded `Thi` item replaces the earlier one; never averaged.
- Six study bands: Xuất sắc ≥ 9, Giỏi 8–8.99, Khá 7–7.99, Trung bình khá 6–6.99, Trung bình 5–5.99, Yếu < 5.
- Semester ĐTB and year ĐTB are credit-weighted over ALL courses, 2 decimals (year = all courses of all its semesters, not the mean of semester ĐTBs). The `*` exclusion of GDTC and QS applies only to the graduation score, which is out of scope.
- Rank is competition ranking (1,2,2,4) on the 2-decimal ĐTB.
- Rèn luyện is a numeric 0–10 score (one decimal) per student and semester, stored in `sms_conduct`. Year value = mean of that year's semester scores, empty if any semester of the year has none. It is **not** part of the classification. Labels: Xuất sắc ≥ 9, Tốt 8–8.99, Khá 6.5–7.99, Trung bình 5–6.49, Yếu 3.5–4.99, Kém < 3.5.
- Rounding is half-up on exact decimals (`math/big`), never `float64` `math.Round` on a computed value.
- A year has any number of semesters; a period is the pair (`year`, `semester`) read from the Moodle course custom fields `year`, `semester`, `credit`. Never hardcode two semesters.
- Access: admin and manager see any class; a student sees only their own row and rank (no other student's name or score in the response). Teachers have no access.
- JSON maps are keyed by strings (Encore-safe). Report rows are ordered by student number, then id.
- Tests: packages that do not import `mdlapi`/`config` (`reporting`, `conduct`) run with plain `go test`. Packages that import them (`mdlapi`, `classreport`, and everything else) need `ENV=test encore test <pkg>` (the config reads `.env` unless `ENV` is not `dev`; plain `go test` panics in the logger). Do not pass `-race` under `encore test` (the Encore runtime crashes with it).
- Run all commands from `apps/sms-api` unless a path says otherwise. Do not touch the unrelated dirty files in the working tree (`apps/api/local.db`, `apps/web/...`, `apps/sms-web/routeTree.gen.ts`, the untracked zips and docs).
- Commit steps: run them only if the user has asked for commits (project rule: the user commits when they ask). Commit messages end with the trailer `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>`.

## File Structure

| File | Responsibility |
|---|---|
| `internal/reporting/decimal.go` | Exact-decimal helpers: `decimal`, `roundHalfUp`, `round2`, `hundredths`. |
| `internal/reporting/course.go` | `Item`, `ExamType`, `CourseScore` (ĐMH of one student in one course). |
| `internal/reporting/bands.go` | Six study bands and the conduct labels. |
| `internal/reporting/aggregate.go` | Credit-weighted `GPA`, `Mean`, competition `Rank`. |
| `internal/reporting/report.go` | `BuildSemester`: rows, summary, warnings. |
| `internal/reporting/year.go` | `BuildYear`: year ĐTB over all courses, year conduct. |
| `internal/mdlapi/coursegrades.go`, `metadata.go` | `Grade.Graded`/`IsGraded`, `Student.IDNumber`, lenient `CourseMetadata`. |
| `packages/coursegrades/.../get_course_data.php` | Send `graded` per grade and `idnumber` per student. |
| `internal/conduct/*` | `sms_conduct` table: migration, validation, dbx repository. |
| `internal/classreport/*` | Moodle data → `reporting` input; period listing; student projection; class resolver. |
| `usrreports/reports.go` | Encore service: class and student endpoints. |
| `audit/entities.go`, `middleware/audit.go` | Audit `conduct.save`. |

---

### Task 1: Exact decimals and the course score (ĐMH)

**Files:**
- Create: `apps/sms-api/internal/reporting/decimal.go`, `apps/sms-api/internal/reporting/course.go`
- Test: `apps/sms-api/internal/reporting/decimal_test.go`, `apps/sms-api/internal/reporting/course_test.go`

**Interfaces:**
- Produces: `type ExamType string` with `ExamRegular="15P"`, `ExamPeriodic="1T"`, `ExamFinal="Thi"`; `type Item struct{ Type ExamType; Grade float64; Graded bool }`; `func CourseScore(items []Item) (score float64, ok bool)` (`ok=false` when there is no item of a known type); `func round2(f float64) float64`; `func hundredths(f float64) int`. The test helpers `g(t ExamType, v float64) Item` (graded) and `blank(t ExamType) Item` live in `course_test.go` and are used by later tests.

- [ ] **Step 1: Create the tests**


`apps/sms-api/internal/reporting/decimal_test.go`

```go
package reporting

import "testing"

func TestRound2IsHalfUpOnExactDecimals(t *testing.T) {
	cases := []struct{ in, want float64 }{
		{7.845, 7.85}, // a float64 multiply-and-round would give 7.84
		{2.675, 2.68},
		{6.805, 6.81},
		{5, 5},
		{4.994, 4.99},
		{4.995, 5},
		{0, 0},
	}
	for _, c := range cases {
		if got := round2(c.in); got != c.want {
			t.Errorf("round2(%v) = %v, want %v", c.in, got, c.want)
		}
	}
}

func TestHundredths(t *testing.T) {
	if got := hundredths(8.99); got != 899 {
		t.Errorf("hundredths(8.99) = %d, want 899", got)
	}
	if got := hundredths(7.28); got != 728 {
		t.Errorf("hundredths(7.28) = %d, want 728", got)
	}
}
```

`apps/sms-api/internal/reporting/course_test.go`

```go
package reporting

import "testing"

func g(t ExamType, v float64) Item { return Item{Type: t, Grade: v, Graded: true} }
func blank(t ExamType) Item        { return Item{Type: t} }

func TestCourseScore(t *testing.T) {
	cases := []struct {
		name  string
		items []Item
		want  float64
		ok    bool
	}{
		{
			name: "two regular, two periodic, one exam",
			// ĐTBKT = (14 + 2·16) / (2 + 2·2) = 46/6; ĐMH = 0.4·46/6 + 0.6·8 = 7.8667
			items: []Item{g(ExamRegular, 8), g(ExamRegular, 6), g(ExamPeriodic, 7), g(ExamPeriodic, 9), g(ExamFinal, 8)},
			want:  7.87, ok: true,
		},
		{
			name: "unequal counts are weighted by count, not by (avg15P + 2·avg1T)/3",
			// ĐTBKT = (10 + 2·10) / (1 + 2·2) = 6.0; ĐMH = 2.4 + 4.2 = 6.6 (the old formula gives 6.87)
			items: []Item{g(ExamRegular, 10), g(ExamPeriodic, 4), g(ExamPeriodic, 6), g(ExamFinal, 7)},
			want:  6.60, ok: true,
		},
		{
			name: "a blank test counts as 0 and still counts in the denominator",
			// ĐTBKT = (8 + 0 + 2·6) / (2 + 2·1) = 5.0; ĐMH = 2.0 + 3.0
			items: []Item{g(ExamRegular, 8), blank(ExamRegular), g(ExamPeriodic, 6), g(ExamFinal, 5)},
			want:  5.00, ok: true,
		},
		{
			name: "a retake replaces the first exam grade",
			// ĐTBKT = 5; ĐKTM = 6.4 (not 3.7, not the average 5.05); ĐMH = 2.0 + 3.84
			items: []Item{g(ExamRegular, 5), g(ExamPeriodic, 5), g(ExamFinal, 3.7), g(ExamFinal, 6.4)},
			want:  5.84, ok: true,
		},
		{
			name: "an empty retake item leaves the first exam grade in place",
			// ĐTBKT = 10; ĐKTM = 7.5; ĐMH = 4.0 + 4.5
			items: []Item{g(ExamRegular, 10), g(ExamPeriodic, 10), g(ExamFinal, 7.5), blank(ExamFinal)},
			want:  8.50, ok: true,
		},
		{
			name:  "no exam grade at all counts as 0",
			items: []Item{g(ExamRegular, 10), g(ExamPeriodic, 10), blank(ExamFinal)},
			want:  4.00, ok: true,
		},
		{
			name: "the result rounds half up to 2 decimals",
			// ĐTBKT = (10.1 + 2·21) / 8 = 6.5125; 0.4·6.5125 + 0.6·7 = 6.805 -> 6.81
			items: []Item{g(ExamRegular, 5), g(ExamRegular, 5.1), g(ExamPeriodic, 7), g(ExamPeriodic, 7), g(ExamPeriodic, 7), g(ExamFinal, 7)},
			want:  6.81, ok: true,
		},
		{
			name: "test scores round to 1 decimal first (7.25 -> 7.3)",
			// ĐTBKT = (7.3 + 2·7.3) / 3 = 7.3; ĐMH = 2.92 + 4.38
			items: []Item{g(ExamRegular, 7.25), g(ExamPeriodic, 7.25), g(ExamFinal, 7.3)},
			want:  7.30, ok: true,
		},
		{name: "no items is not scored", items: nil, want: 0, ok: false},
		{name: "items of unknown type are ignored", items: []Item{g("Bonus", 10)}, want: 0, ok: false},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			got, ok := CourseScore(c.items)
			if ok != c.ok || got != c.want {
				t.Fatalf("CourseScore = (%v, %v), want (%v, %v)", got, ok, c.want, c.ok)
			}
		})
	}
}
```

- [ ] **Step 2: Run them and see them fail**


Run: `go test ./internal/reporting/`
Expected: FAIL to compile (`undefined: round2`, `undefined: CourseScore`, ...).

- [ ] **Step 3: Create the implementation**


`apps/sms-api/internal/reporting/decimal.go`

```go
package reporting

import (
	"math"
	"math/big"
	"strconv"
)

// decimal converts a float64 to the exact decimal it prints as (7.85 becomes
// 785/100, not the nearest binary fraction), so sums and rounding are exact.
func decimal(f float64) *big.Rat {
	r, ok := new(big.Rat).SetString(strconv.FormatFloat(f, 'f', -1, 64))
	if !ok {
		return new(big.Rat)
	}
	return r
}

// roundHalfUp rounds a non-negative value to the given number of decimal
// places, halves going up (6.805 -> 6.81).
func roundHalfUp(r *big.Rat, places int) *big.Rat {
	scale := new(big.Int).Exp(big.NewInt(10), big.NewInt(int64(places)), nil)
	x := new(big.Rat).Mul(r, new(big.Rat).SetInt(scale))
	x.Add(x, big.NewRat(1, 2))
	floor := new(big.Int).Div(x.Num(), x.Denom())
	return new(big.Rat).SetFrac(floor, scale)
}

func toFloat(r *big.Rat) float64 {
	f, _ := r.Float64()
	return f
}

// round2 rounds a float64 to 2 decimal places, half up, through exact decimals.
func round2(f float64) float64 {
	return toFloat(roundHalfUp(decimal(f), 2))
}

// hundredths returns the value in hundredths (7.85 -> 785). Band and rank
// comparisons use it so they never depend on float representation.
func hundredths(f float64) int {
	return int(math.Round(f * 100))
}
```

`apps/sms-api/internal/reporting/course.go`

```go
package reporting

import "math/big"

// ExamType is the kind of a graded item in a course.
type ExamType string

const (
	// ExamRegular is a regular test (kiểm tra thường xuyên, weight 1).
	ExamRegular ExamType = "15P"
	// ExamPeriodic is a periodic test (kiểm tra định kỳ, weight 2).
	ExamPeriodic ExamType = "1T"
	// ExamFinal is the end-of-course exam; a retake is a later item of this type.
	ExamFinal ExamType = "Thi"
)

// Item is one configured grade item of a course, for one student.
// Graded is false when the teacher has not entered a grade; the item then
// counts as 0 (Điều 10.5, 11.2.c).
type Item struct {
	Type   ExamType
	Grade  float64
	Graded bool
}

// CourseScore returns the course score ĐMH (Điều 11):
//
//	ĐMH   = 0.4·ĐTBKT + 0.6·ĐKTM
//	ĐTBKT = (ΣKTTX + 2·ΣKTĐK) / (nKTTX + 2·nKTĐK)
//
// n is the number of configured items of that type, so a blank grade lowers
// the average instead of shrinking it. ĐKTM is the last graded ExamFinal item
// in course order: a retake replaces the earlier value, it is never averaged.
// Test scores are rounded to 1 decimal (Điều 10.4); the result to 2 decimals.
// ok is false when the course has no items of a known type.
func CourseScore(items []Item) (score float64, ok bool) {
	var sumRegular, sumPeriodic, final big.Rat
	nRegular, nPeriodic, known := 0, 0, 0

	for _, it := range items {
		switch it.Type {
		case ExamRegular:
			nRegular++
			known++
			if it.Graded {
				sumRegular.Add(&sumRegular, roundHalfUp(decimal(it.Grade), 1))
			}
		case ExamPeriodic:
			nPeriodic++
			known++
			if it.Graded {
				sumPeriodic.Add(&sumPeriodic, roundHalfUp(decimal(it.Grade), 1))
			}
		case ExamFinal:
			known++
			if it.Graded {
				final = *decimal(it.Grade)
			}
		}
	}
	if known == 0 {
		return 0, false
	}

	avgTests := new(big.Rat)
	if den := nRegular + 2*nPeriodic; den > 0 {
		num := new(big.Rat).Add(&sumRegular, new(big.Rat).Mul(big.NewRat(2, 1), &sumPeriodic))
		avgTests.Quo(num, big.NewRat(int64(den), 1))
	}

	total := new(big.Rat).Mul(big.NewRat(2, 5), avgTests)
	total.Add(total, new(big.Rat).Mul(big.NewRat(3, 5), &final))
	return toFloat(roundHalfUp(total, 2)), true
}
```

- [ ] **Step 4: Run the tests and see them pass**


Run: `gofmt -l internal/reporting && go vet ./internal/reporting/ && go test ./internal/reporting/`
Expected: no gofmt output, `ok  encore.app/internal/reporting`.

- [ ] **Step 5: Commit**


```bash
git add apps/sms-api/internal/reporting/decimal.go apps/sms-api/internal/reporting/course.go apps/sms-api/internal/reporting/decimal_test.go apps/sms-api/internal/reporting/course_test.go
git commit -m "feat(sms-api): reporting - exact decimals and course score" \
  -m "Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

### Task 2: Bands, conduct labels, GPA, mean and rank

**Files:**
- Create: `apps/sms-api/internal/reporting/bands.go`, `apps/sms-api/internal/reporting/aggregate.go`
- Test: `apps/sms-api/internal/reporting/bands_test.go`, `apps/sms-api/internal/reporting/aggregate_test.go`

**Interfaces:**
- Consumes: `round2`, `hundredths`, `decimal`, `roundHalfUp` (Task 1).
- Produces: `type Band string` (`BandExcellent`, `BandGood`, `BandFair`, `BandAboveAverage`, `BandAverage`, `BandWeak`) with `var Bands []Band` (best first) and `Classify(score float64) Band`; `type ConductLabel string` (`ConductExcellent`, `ConductGood`, `ConductFair`, `ConductAverage`, `ConductWeak`, `ConductPoor`) and `ClassifyConduct(score float64) ConductLabel`; `type CourseResult struct{ Score float64; Credits int }`; `GPA(results []CourseResult) (float64, bool)`; `Mean(values []float64) (float64, bool)`; `Rank(values []*float64) []int` (nil → 0).

- [ ] **Step 1: Create the tests**


`apps/sms-api/internal/reporting/bands_test.go`

```go
package reporting

import "testing"

func TestClassifyEdges(t *testing.T) {
	cases := []struct {
		score float64
		want  Band
	}{
		{10, BandExcellent}, {9.00, BandExcellent}, {8.99, BandGood},
		{8.00, BandGood}, {7.99, BandFair},
		{7.00, BandFair}, {6.99, BandAverageUp},
		{6.00, BandAverageUp}, {5.99, BandAverage},
		{5.00, BandAverage}, {4.99, BandWeak}, {0, BandWeak},
	}
	for _, c := range cases {
		if got := Classify(c.score); got != c.want {
			t.Errorf("Classify(%v) = %s, want %s", c.score, got, c.want)
		}
	}
}

func TestClassifyConductEdges(t *testing.T) {
	cases := []struct {
		score float64
		want  ConductLabel
	}{
		{10, ConductExcellent}, {9.0, ConductExcellent}, {8.9, ConductGood},
		{8.0, ConductGood}, {7.9, ConductFair},
		{6.5, ConductFair}, {6.4, ConductAverage},
		{5.0, ConductAverage}, {4.9, ConductWeak},
		{3.5, ConductWeak}, {3.4, ConductPoor}, {0, ConductPoor},
	}
	for _, c := range cases {
		if got := ClassifyConduct(c.score); got != c.want {
			t.Errorf("ClassifyConduct(%v) = %s, want %s", c.score, got, c.want)
		}
	}
}
```

`apps/sms-api/internal/reporting/aggregate_test.go`

```go
package reporting

import "testing"

func TestGPAWeightsByCredits(t *testing.T) {
	// Chu Việt Anh, HK1: GP, SL, CN M-LN, VSKST plus GDTC and QS (all six count).
	got, ok := GPA([]CourseResult{
		{5.8, 4}, {7.9, 3}, {7.7, 4}, {8.7, 3}, {6.2, 2}, {7.4, 2},
	})
	if !ok || got != 7.28 { // 131.0 / 18 = 7.2777...
		t.Fatalf("GPA = (%v, %v), want (7.28, true)", got, ok)
	}
}

func TestGPARoundsHalfUp(t *testing.T) {
	// (7.8·1 + 7.89·1) / 2 = 7.845 -> 7.85
	got, _ := GPA([]CourseResult{{7.8, 1}, {7.89, 1}})
	if got != 7.85 {
		t.Fatalf("GPA = %v, want 7.85", got)
	}
}

func TestGPANoCredits(t *testing.T) {
	if _, ok := GPA(nil); ok {
		t.Fatal("GPA of nothing must not be ok")
	}
	if _, ok := GPA([]CourseResult{{9, 0}}); ok {
		t.Fatal("GPA with zero credits must not be ok")
	}
}

func TestMean(t *testing.T) {
	if got, ok := Mean([]float64{8.5, 7.0, 6.4}); !ok || got != 7.30 {
		t.Fatalf("Mean = (%v, %v), want (7.3, true)", got, ok)
	}
	if _, ok := Mean(nil); ok {
		t.Fatal("Mean of nothing must not be ok")
	}
}

func fp(v float64) *float64 { return &v }

func TestRankCompetition(t *testing.T) {
	// 8.7, 8.6, six students on 8.5, then 8.4: ranks 1, 2, 3 x6, 9.
	values := []*float64{fp(8.4), fp(8.5), fp(8.7), fp(8.5), fp(8.6), fp(8.5), fp(8.5), fp(8.5), fp(8.5), nil}
	want := []int{9, 3, 1, 3, 2, 3, 3, 3, 3, 0}
	got := Rank(values)
	for i := range want {
		if got[i] != want[i] {
			t.Errorf("rank[%d] = %d, want %d (all: %v)", i, got[i], want[i], got)
		}
	}
}
```

- [ ] **Step 2: Run them and see them fail**


Run: `go test ./internal/reporting/`
Expected: FAIL to compile (`undefined: Classify`, `undefined: GPA`, ...).

- [ ] **Step 3: Create the implementation**


`apps/sms-api/internal/reporting/bands.go`

```go
package reporting

// Band is a study classification (Điều 11 for a course, Điều 14 for a period).
type Band string

const (
	BandExcellent Band = "xuat_sac"       // Xuất sắc
	BandGood      Band = "gioi"           // Giỏi
	BandFair      Band = "kha"            // Khá
	BandAverageUp Band = "trung_binh_kha" // Trung bình khá
	BandAverage   Band = "trung_binh"     // Trung bình
	BandWeak      Band = "yeu"            // Yếu
)

// Bands lists every band from best to worst.
var Bands = []Band{BandExcellent, BandGood, BandFair, BandAverageUp, BandAverage, BandWeak}

// Classify returns the band of a course score or an ĐTB (both already rounded
// to 2 decimals): ≥9 · 8–8.99 · 7–7.99 · 6–6.99 · 5–5.99 · <5.
func Classify(score float64) Band {
	switch h := hundredths(score); {
	case h >= 900:
		return BandExcellent
	case h >= 800:
		return BandGood
	case h >= 700:
		return BandFair
	case h >= 600:
		return BandAverageUp
	case h >= 500:
		return BandAverage
	default:
		return BandWeak
	}
}

// ConductLabel is the label of a rèn luyện score. Its thresholds are their own
// table, separate from the study bands.
type ConductLabel string

const (
	ConductExcellent ConductLabel = "xuat_sac"
	ConductGood      ConductLabel = "tot"
	ConductFair      ConductLabel = "kha"
	ConductAverage   ConductLabel = "trung_binh"
	ConductWeak      ConductLabel = "yeu"
	ConductPoor      ConductLabel = "kem"
)

// ClassifyConduct labels a rèn luyện score: ≥9 · 8–8.99 · 6.5–7.99 · 5–6.49 · 3.5–4.99 · <3.5.
// The ranges below Xuất sắc are working values; change them here only.
func ClassifyConduct(score float64) ConductLabel {
	switch h := hundredths(score); {
	case h >= 900:
		return ConductExcellent
	case h >= 800:
		return ConductGood
	case h >= 650:
		return ConductFair
	case h >= 500:
		return ConductAverage
	case h >= 350:
		return ConductWeak
	default:
		return ConductPoor
	}
}
```

`apps/sms-api/internal/reporting/aggregate.go`

```go
package reporting

import "math/big"

// CourseResult is a scored course with its credits.
type CourseResult struct {
	Score   float64
	Credits int
}

// GPA returns the ĐTB (Điều 14): Σ(score·credits) / Σcredits, 2 decimals, half
// up. ok is false when there are no credits to weigh by.
func GPA(results []CourseResult) (gpa float64, ok bool) {
	sum, credits := new(big.Rat), 0
	for _, r := range results {
		sum.Add(sum, new(big.Rat).Mul(decimal(r.Score), big.NewRat(int64(r.Credits), 1)))
		credits += r.Credits
	}
	if credits == 0 {
		return 0, false
	}
	sum.Quo(sum, big.NewRat(int64(credits), 1))
	return toFloat(roundHalfUp(sum, 2)), true
}

// Mean returns the simple mean of values to 2 decimals, half up. ok is false
// for an empty slice. Used for class ĐTB and for the year rèn luyện.
func Mean(values []float64) (mean float64, ok bool) {
	if len(values) == 0 {
		return 0, false
	}
	sum := new(big.Rat)
	for _, v := range values {
		sum.Add(sum, decimal(v))
	}
	sum.Quo(sum, big.NewRat(int64(len(values)), 1))
	return toFloat(roundHalfUp(sum, 2)), true
}

// Rank gives each value its competition rank (1, 2, 3, 3, 3, 3, 3, 3, 9 ...):
// one plus the number of strictly greater values, compared at 2 decimals. A nil
// value has no rank (0).
func Rank(values []*float64) []int {
	ranks := make([]int, len(values))
	for i, v := range values {
		if v == nil {
			continue
		}
		ranks[i] = 1
		for j, w := range values {
			if j != i && w != nil && hundredths(*w) > hundredths(*v) {
				ranks[i]++
			}
		}
	}
	return ranks
}
```

- [ ] **Step 4: Run the tests and see them pass**


Run: `gofmt -l internal/reporting && go vet ./internal/reporting/ && go test ./internal/reporting/`
Expected: `ok  encore.app/internal/reporting`.

- [ ] **Step 5: Commit**


```bash
git add apps/sms-api/internal/reporting/bands.go apps/sms-api/internal/reporting/aggregate.go apps/sms-api/internal/reporting/bands_test.go apps/sms-api/internal/reporting/aggregate_test.go
git commit -m "feat(sms-api): reporting - bands, conduct labels, GPA and rank" \
  -m "Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

### Task 3: Semester report

**Files:**
- Create: `apps/sms-api/internal/reporting/report.go`
- Test: `apps/sms-api/internal/reporting/report_test.go`

**Interfaces:**
- Consumes: everything from Tasks 1–2, and the test helpers `g`/`blank` from `course_test.go`.
- Produces (used by Tasks 4, 7, 8): input types `Class{ID int; Name, IDNumber string}`, `Course{ID int; ShortName, FullName string; Credits int}`, `Student{ID int; IDNumber, FullName string}`, `CourseInput{Course Course; Items map[int][]Item}` (items keyed by student id), `PeriodInput{Year, Semester int; Courses []CourseInput; Conduct map[int]float64}`; output types `Conduct`, `Warning{Code string; CourseID int}` with codes `WarnNoGradeItems`, `WarnExamNotHeld`, `WarnTestCountMismatch`, `StudentRow`, `CourseStats`, `TopEntry`, `Summary`, `SemesterReport`; `BuildSemester(class Class, students []Student, in PeriodInput) SemesterReport`. Unexported helpers reused by Task 4: `scoreCourses`, `semesterReport`, `summarize`, `summaryRow`, `sortStudents`, `scoredCourse`.

Behaviour worth knowing: a course whose enrolled students have no scorable item is left out of the report and raises `course_no_grade_items`; a course whose test counts differ from Điều 10.4 (1+1 tests for ≤ 2 credits, 2+2 for 3–4, 3+3 for ≥ 5) raises `test_count_mismatch`; a course with an exam item that nobody has a grade for raises `exam_not_held`. Warnings inform; they never change a score.

- [ ] **Step 1: Create the test**


`apps/sms-api/internal/reporting/report_test.go`

```go
package reporting

import (
	"testing"
)

// flat builds the items of a course where every test and the exam equal x, so
// the course score is exactly x. nRegular and nPeriodic set the test counts.
func flat(x float64, nRegular, nPeriodic int) []Item {
	var items []Item
	for i := 0; i < nRegular; i++ {
		items = append(items, g(ExamRegular, x))
	}
	for i := 0; i < nPeriodic; i++ {
		items = append(items, g(ExamPeriodic, x))
	}
	return append(items, g(ExamFinal, x))
}

var (
	testClass = Class{ID: 12, Name: "Y sĩ K12", IDNumber: "Y53"}
	stuA      = Student{ID: 1, IDNumber: "2301010001", FullName: "An"}
	stuB      = Student{ID: 2, IDNumber: "2301010002", FullName: "Bình"}
	stuC      = Student{ID: 3, IDNumber: "2301010003", FullName: "Chi"}
	gp        = Course{ID: 5, ShortName: "GP", FullName: "Giải phẫu", Credits: 4}
	sl        = Course{ID: 6, ShortName: "SL", FullName: "Sinh lý", Credits: 2}
)

// semester1: GP (4 credits, 2+2 tests) and SL (2 credits, 1+1 tests).
func semester1() PeriodInput {
	return PeriodInput{
		Year: 1, Semester: 1,
		Courses: []CourseInput{
			{Course: gp, Items: map[int][]Item{1: flat(8, 2, 2), 2: flat(9, 2, 2), 3: flat(5, 2, 2)}},
			{Course: sl, Items: map[int][]Item{1: flat(6, 1, 1), 2: flat(9, 1, 1), 3: flat(5, 1, 1)}},
		},
		Conduct: map[int]float64{1: 8.5, 3: 3.0},
	}
}

func TestBuildSemesterRowsRankAndClassification(t *testing.T) {
	r := BuildSemester(testClass, []Student{stuC, stuA, stuB}, semester1())

	if r.TotalCredits != 6 || len(r.Courses) != 2 {
		t.Fatalf("credits = %d, courses = %d; want 6 and 2", r.TotalCredits, len(r.Courses))
	}
	if len(r.Warnings) != 0 {
		t.Fatalf("unexpected warnings: %+v", r.Warnings)
	}
	// Rows are ordered by student number regardless of input order.
	if r.Students[0].ID != 1 || r.Students[1].ID != 2 || r.Students[2].ID != 3 {
		t.Fatalf("row order = %d,%d,%d", r.Students[0].ID, r.Students[1].ID, r.Students[2].ID)
	}
	a, b, c := r.Students[0], r.Students[1], r.Students[2]

	// A: (8·4 + 6·2) / 6 = 7.33; B: 9.00; C: 5.00.
	if *a.GPA != 7.33 || *b.GPA != 9.00 || *c.GPA != 5.00 {
		t.Fatalf("gpa = %v, %v, %v", *a.GPA, *b.GPA, *c.GPA)
	}
	if *a.Classification != BandFair || *b.Classification != BandExcellent || *c.Classification != BandAverage {
		t.Fatalf("classification = %s, %s, %s", *a.Classification, *b.Classification, *c.Classification)
	}
	if *a.Rank != 2 || *b.Rank != 1 || *c.Rank != 3 {
		t.Fatalf("rank = %d, %d, %d", *a.Rank, *b.Rank, *c.Rank)
	}
	if *a.Scores["5"] != 8 || *a.Scores["6"] != 6 {
		t.Fatalf("scores of A = %v, %v", *a.Scores["5"], *a.Scores["6"])
	}
}

func TestBuildSemesterConductIsIndependentOfClassification(t *testing.T) {
	r := BuildSemester(testClass, []Student{stuA, stuB, stuC}, semester1())
	a, b, c := r.Students[0], r.Students[1], r.Students[2]

	if a.Conduct == nil || a.Conduct.Score != 8.5 || a.Conduct.Label != ConductGood {
		t.Fatalf("conduct of A = %+v", a.Conduct)
	}
	if b.Conduct != nil {
		t.Fatalf("B has no conduct score, got %+v", b.Conduct)
	}
	// C's conduct is Kém (3.0) but the classification still follows the ĐTB.
	if c.Conduct.Label != ConductPoor || *c.Classification != BandAverage {
		t.Fatalf("C = conduct %+v, classification %s", c.Conduct, *c.Classification)
	}
}

func TestBuildSemesterSummary(t *testing.T) {
	s := BuildSemester(testClass, []Student{stuA, stuB, stuC}, semester1()).Summary

	if s.Headcount != 3 {
		t.Fatalf("headcount = %d", s.Headcount)
	}
	if *s.ClassGPA != 7.11 || *s.MaxGPA != 9.00 { // (7.33 + 9 + 5) / 3 = 7.1099
		t.Fatalf("classGpa = %v, maxGpa = %v", *s.ClassGPA, *s.MaxGPA)
	}
	if s.ByClassification["xuat_sac"] != 1 || s.ByClassification["kha"] != 1 ||
		s.ByClassification["trung_binh"] != 1 || s.ByClassification["yeu"] != 0 {
		t.Fatalf("byClassification = %v", s.ByClassification)
	}
	gpStats := s.PerCourse["5"]
	if gpStats.Bands["xuat_sac"] != 1 || gpStats.Bands["gioi"] != 1 || gpStats.Bands["trung_binh"] != 1 {
		t.Fatalf("GP bands = %v", gpStats.Bands)
	}
	if *gpStats.Mean != 7.33 {
		t.Fatalf("GP mean = %v", *gpStats.Mean)
	}
	if len(s.Top) != 3 || s.Top[0].FullName != "Bình" || s.Top[0].Rank != 1 || s.Top[2].FullName != "Chi" {
		t.Fatalf("top = %+v", s.Top)
	}
}

func TestBuildSemesterWarningsAndExcludedCourses(t *testing.T) {
	empty := Course{ID: 7, ShortName: "QS", FullName: "Quân sự", Credits: 2}
	notHeld := Course{ID: 8, ShortName: "DL", FullName: "Dược lý", Credits: 2}
	in := PeriodInput{Year: 1, Semester: 1, Courses: []CourseInput{
		{Course: gp, Items: map[int][]Item{1: flat(8, 1, 1)}}, // 4 credits expect 2+2: mismatch
		{Course: empty, Items: map[int][]Item{1: nil}},        // no grade items: excluded
		{Course: notHeld, Items: map[int][]Item{1: { // exam configured, nobody graded
			g(ExamRegular, 7), g(ExamPeriodic, 7), blank(ExamFinal),
		}}},
	}}
	r := BuildSemester(testClass, []Student{stuA}, in)

	if len(r.Courses) != 2 || r.TotalCredits != 6 {
		t.Fatalf("courses = %d, credits = %d; want 2 and 6", len(r.Courses), r.TotalCredits)
	}
	want := map[string]int{WarnNoGradeItems: 7, WarnTestCountMismatch: 5, WarnExamNotHeld: 8}
	got := map[string]int{}
	for _, w := range r.Warnings {
		got[w.Code] = w.CourseID
	}
	for code, courseID := range want {
		if got[code] != courseID {
			t.Errorf("warning %s: course %d, want %d (all: %+v)", code, got[code], courseID, r.Warnings)
		}
	}
}

func TestBuildSemesterStudentNotEnrolledInACourseHasNoScoreThere(t *testing.T) {
	in := PeriodInput{Year: 1, Semester: 1, Courses: []CourseInput{
		{Course: gp, Items: map[int][]Item{1: flat(8, 2, 2), 2: flat(9, 2, 2)}},
		{Course: sl, Items: map[int][]Item{1: flat(6, 1, 1)}}, // B not enrolled in SL
	}}
	r := BuildSemester(testClass, []Student{stuA, stuB}, in)
	b := r.Students[1]
	if b.Scores["6"] != nil {
		t.Fatalf("B should have no SL score, got %v", *b.Scores["6"])
	}
	if *b.GPA != 9.00 { // only GP counts for B
		t.Fatalf("B gpa = %v", *b.GPA)
	}
}
```

- [ ] **Step 2: Run it and see it fail**


Run: `go test ./internal/reporting/`
Expected: FAIL to compile (`undefined: BuildSemester`, `undefined: PeriodInput`, ...).

- [ ] **Step 3: Create the implementation**


`apps/sms-api/internal/reporting/report.go`

```go
package reporting

import (
	"sort"
	"strconv"
)

// ── Inputs ───────────────────────────────────────────────────────────────────

// Class is a Moodle category.
type Class struct {
	ID       int    `json:"id"`
	Name     string `json:"name"`
	IDNumber string `json:"idnumber"`
}

// Course is a học phần with its credits.
type Course struct {
	ID        int    `json:"id"`
	ShortName string `json:"shortname"`
	FullName  string `json:"fullname"`
	Credits   int    `json:"credits"`
}

// Student is a member of the class.
type Student struct {
	ID       int    `json:"id"`
	IDNumber string `json:"idnumber"`
	FullName string `json:"fullname"`
}

// CourseInput holds the grade items of every enrolled student of a course, in
// course order. A student who is not enrolled has no entry.
type CourseInput struct {
	Course Course
	Items  map[int][]Item
}

// PeriodInput is one semester of one year: its courses and the rèn luyện
// scores entered for it (student id -> score).
type PeriodInput struct {
	Year     int
	Semester int
	Courses  []CourseInput
	Conduct  map[int]float64
}

// ── Outputs ──────────────────────────────────────────────────────────────────

// Conduct is a rèn luyện score with its label.
type Conduct struct {
	Score float64      `json:"score"`
	Label ConductLabel `json:"label"`
}

// Warning flags a data problem the reader should know about.
type Warning struct {
	Code     string `json:"code"`
	CourseID int    `json:"courseId,omitempty"`
}

// Warning codes.
const (
	WarnNoGradeItems      = "course_no_grade_items"
	WarnExamNotHeld       = "exam_not_held"
	WarnTestCountMismatch = "test_count_mismatch"
)

// StudentRow is one student of a semester report. Scores is keyed by course id
// (as a string, so it is a plain JSON object); a course the student has no
// score in is null.
type StudentRow struct {
	ID             int                 `json:"id"`
	IDNumber       string              `json:"idnumber"`
	FullName       string              `json:"fullname"`
	Scores         map[string]*float64 `json:"scores"`
	GPA            *float64            `json:"gpa"`
	Classification *Band               `json:"classification"`
	Rank           *int                `json:"rank"`
	Conduct        *Conduct            `json:"conduct"`
}

// CourseStats is the distribution of one course's scores.
type CourseStats struct {
	Bands map[string]int `json:"bands"`
	Mean  *float64       `json:"mean"`
}

// TopEntry is a student in the top three ranks (ties can make it longer).
type TopEntry struct {
	Rank     int     `json:"rank"`
	FullName string  `json:"fullname"`
	GPA      float64 `json:"gpa"`
}

// Summary is the class-level block under the table.
type Summary struct {
	Headcount        int                    `json:"headcount"`
	ClassGPA         *float64               `json:"classGpa"`
	MaxGPA           *float64               `json:"maxGpa"`
	ByClassification map[string]int         `json:"byClassification"`
	PerCourse        map[string]CourseStats `json:"perCourse,omitempty"`
	Top              []TopEntry             `json:"top"`
}

// SemesterReport is the result of one semester of a class.
type SemesterReport struct {
	Class        Class        `json:"class"`
	Year         int          `json:"year"`
	Semester     int          `json:"semester"`
	TotalCredits int          `json:"totalCredits"`
	Courses      []Course     `json:"courses"`
	Students     []StudentRow `json:"students"`
	Summary      Summary      `json:"summary"`
	Warnings     []Warning    `json:"warnings"`
}

// ── Building ─────────────────────────────────────────────────────────────────

type scoredCourse struct {
	course Course
	scores map[int]float64 // student id -> ĐMH; only students who have one
}

// BuildSemester computes the report of one semester.
func BuildSemester(class Class, students []Student, in PeriodInput) SemesterReport {
	scored, warnings := scoreCourses(in.Courses)
	return semesterReport(class, sortStudents(students), in, scored, warnings)
}

func semesterReport(class Class, students []Student, in PeriodInput, scored []scoredCourse, warnings []Warning) SemesterReport {
	report := SemesterReport{
		Class:    class,
		Year:     in.Year,
		Semester: in.Semester,
		Courses:  []Course{},
		Warnings: warnings,
	}
	for _, sc := range scored {
		report.Courses = append(report.Courses, sc.course)
		report.TotalCredits += sc.course.Credits
	}

	gpas := make([]*float64, len(students))
	report.Students = make([]StudentRow, len(students))
	for i, s := range students {
		row := StudentRow{ID: s.ID, IDNumber: s.IDNumber, FullName: s.FullName, Scores: map[string]*float64{}}
		var results []CourseResult
		for _, sc := range scored {
			key := strconv.Itoa(sc.course.ID)
			if score, ok := sc.scores[s.ID]; ok {
				v := score
				row.Scores[key] = &v
				results = append(results, CourseResult{Score: score, Credits: sc.course.Credits})
			} else {
				row.Scores[key] = nil
			}
		}
		if gpa, ok := GPA(results); ok {
			row.GPA, gpas[i] = &gpa, &gpa
			band := Classify(gpa)
			row.Classification = &band
		}
		if score, ok := in.Conduct[s.ID]; ok {
			row.Conduct = &Conduct{Score: score, Label: ClassifyConduct(score)}
		}
		report.Students[i] = row
	}
	for i, rank := range Rank(gpas) {
		if rank > 0 {
			r := rank
			report.Students[i].Rank = &r
		}
	}

	rows := make([]summaryRow, len(students))
	for i, s := range report.Students {
		rows[i] = summaryRow{name: s.FullName, gpa: s.GPA, rank: s.Rank}
	}
	report.Summary = summarize(rows, scored)
	return report
}

// scoreCourses scores every course for every enrolled student and reports the
// courses that cannot be scored or look unfinished. Courses with no grade items
// at all are left out.
func scoreCourses(courses []CourseInput) ([]scoredCourse, []Warning) {
	scored := []scoredCourse{}
	warnings := []Warning{}
	for _, ci := range courses {
		sc := scoredCourse{course: ci.Course, scores: map[int]float64{}}
		for studentID, items := range ci.Items {
			if score, ok := CourseScore(items); ok {
				sc.scores[studentID] = score
			}
		}
		if len(sc.scores) == 0 {
			warnings = append(warnings, Warning{Code: WarnNoGradeItems, CourseID: ci.Course.ID})
			continue
		}
		scored = append(scored, sc)
		warnings = append(warnings, courseWarnings(ci)...)
	}
	return scored, warnings
}

// expectedTests is the number of regular and of periodic tests Điều 10.4
// expects for a course of the given credits.
func expectedTests(credits int) int {
	switch {
	case credits <= 2:
		return 1
	case credits <= 4:
		return 2
	default:
		return 3
	}
}

func courseWarnings(ci CourseInput) []Warning {
	var warnings []Warning
	nRegular, nPeriodic, hasFinal, finalGraded := 0, 0, false, false
	counted := false
	for _, items := range ci.Items {
		for _, it := range items {
			if !counted { // every enrolled student has the same items; count once
				switch it.Type {
				case ExamRegular:
					nRegular++
				case ExamPeriodic:
					nPeriodic++
				case ExamFinal:
					hasFinal = true
				}
			}
			if it.Type == ExamFinal && it.Graded {
				finalGraded = true
			}
		}
		counted = true
	}
	want := expectedTests(ci.Course.Credits)
	if nRegular != want || nPeriodic != want {
		warnings = append(warnings, Warning{Code: WarnTestCountMismatch, CourseID: ci.Course.ID})
	}
	if hasFinal && !finalGraded {
		warnings = append(warnings, Warning{Code: WarnExamNotHeld, CourseID: ci.Course.ID})
	}
	return warnings
}

type summaryRow struct {
	name string
	gpa  *float64
	rank *int
}

func summarize(rows []summaryRow, scored []scoredCourse) Summary {
	s := Summary{Headcount: len(rows), ByClassification: map[string]int{}, Top: []TopEntry{}}
	for _, b := range Bands {
		s.ByClassification[string(b)] = 0
	}

	var gpas []float64
	for _, r := range rows {
		if r.gpa == nil {
			continue
		}
		gpas = append(gpas, *r.gpa)
		s.ByClassification[string(Classify(*r.gpa))]++
		if r.rank != nil && *r.rank <= 3 {
			s.Top = append(s.Top, TopEntry{Rank: *r.rank, FullName: r.name, GPA: *r.gpa})
		}
	}
	if mean, ok := Mean(gpas); ok {
		s.ClassGPA = &mean
		max := gpas[0]
		for _, g := range gpas {
			if hundredths(g) > hundredths(max) {
				max = g
			}
		}
		s.MaxGPA = &max
	}
	sort.SliceStable(s.Top, func(i, j int) bool {
		if s.Top[i].Rank != s.Top[j].Rank {
			return s.Top[i].Rank < s.Top[j].Rank
		}
		return s.Top[i].FullName < s.Top[j].FullName
	})

	if scored != nil {
		s.PerCourse = map[string]CourseStats{}
		for _, sc := range scored {
			stats := CourseStats{Bands: map[string]int{}}
			for _, b := range Bands {
				stats.Bands[string(b)] = 0
			}
			var scores []float64
			for _, score := range sc.scores {
				stats.Bands[string(Classify(score))]++
				scores = append(scores, score)
			}
			if mean, ok := Mean(scores); ok {
				stats.Mean = &mean
			}
			s.PerCourse[strconv.Itoa(sc.course.ID)] = stats
		}
	}
	return s
}

func sortStudents(students []Student) []Student {
	sorted := append([]Student(nil), students...)
	sort.SliceStable(sorted, func(i, j int) bool {
		if sorted[i].IDNumber != sorted[j].IDNumber {
			return sorted[i].IDNumber < sorted[j].IDNumber
		}
		return sorted[i].ID < sorted[j].ID
	})
	return sorted
}
```

- [ ] **Step 4: Run the tests and see them pass**


Run: `gofmt -l internal/reporting && go vet ./internal/reporting/ && go test ./internal/reporting/`
Expected: `ok  encore.app/internal/reporting`.

- [ ] **Step 5: Commit**


```bash
git add apps/sms-api/internal/reporting/report.go apps/sms-api/internal/reporting/report_test.go
git commit -m "feat(sms-api): reporting - semester report" \
  -m "Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

### Task 4: Year report

**Files:**
- Create: `apps/sms-api/internal/reporting/year.go`
- Test: `apps/sms-api/internal/reporting/year_test.go`

**Interfaces:**
- Consumes: `semesterReport`, `scoreCourses`, `summarize`, `summaryRow`, `sortStudents`, `PeriodInput`, `SemesterReport`, `GPA`, `Mean`, `Rank`, `Classify`, `ClassifyConduct`, and the fixtures (`testClass`, `stuA`, `stuB`, `gp`, `flat`) from `report_test.go`.
- Produces: `YearRow`, `YearReport`, `BuildYear(class Class, students []Student, year int, periods []PeriodInput) YearReport`.

Year ĐTB is credit-weighted over every course of every semester, so a 4-credit semester 1 and a 2-credit semester 2 weigh 4:2 (the test asserts 7.33, not the mean of the two semester values). Year rèn luyện is the mean of the semester scores and is empty when any semester of the year has none.

- [ ] **Step 1: Create the test**


`apps/sms-api/internal/reporting/year_test.go`

```go
package reporting

import "testing"

// year 1 = semester 1 (GP, 4 credits) + semester 2 (KT, 2 credits).
func yearPeriods() []PeriodInput {
	kt := Course{ID: 9, ShortName: "KT", FullName: "Kiểm tra", Credits: 2}
	return []PeriodInput{
		{Year: 1, Semester: 1,
			Courses: []CourseInput{{Course: gp, Items: map[int][]Item{1: flat(8, 2, 2), 2: flat(9, 2, 2)}}},
			Conduct: map[int]float64{1: 8.0, 2: 9.0}},
		{Year: 1, Semester: 2,
			Courses: []CourseInput{{Course: kt, Items: map[int][]Item{1: flat(6, 1, 1), 2: flat(9, 1, 1)}}},
			Conduct: map[int]float64{1: 7.0}}, // B has no conduct for semester 2
	}
}

func TestBuildYearWeightsByCreditsAcrossSemesters(t *testing.T) {
	r := BuildYear(testClass, []Student{stuA, stuB}, 1, yearPeriods())

	if len(r.Periods) != 2 || r.TotalCredits != 6 {
		t.Fatalf("periods = %d, credits = %d", len(r.Periods), r.TotalCredits)
	}
	a, b := r.Students[0], r.Students[1]
	// A: (8·4 + 6·2) / 6 = 7.33 (not the mean of 8.00 and 6.00); B: 9.00.
	if *a.GPA != 7.33 || *b.GPA != 9.00 {
		t.Fatalf("year gpa = %v, %v", *a.GPA, *b.GPA)
	}
	if *a.Classification != BandFair || *a.Rank != 2 || *b.Rank != 1 {
		t.Fatalf("A = %s rank %d; B rank %d", *a.Classification, *a.Rank, *b.Rank)
	}
	if r.Summary.Headcount != 2 || *r.Summary.ClassGPA != 8.17 || r.Summary.PerCourse != nil {
		t.Fatalf("summary = %+v", r.Summary)
	}
}

func TestBuildYearConductIsTheMeanOfSemesters(t *testing.T) {
	r := BuildYear(testClass, []Student{stuA, stuB}, 1, yearPeriods())
	a, b := r.Students[0], r.Students[1]

	// A: (8.0 + 7.0) / 2 = 7.50 -> Khá.
	if a.Conduct == nil || a.Conduct.Score != 7.5 || a.Conduct.Label != ConductFair {
		t.Fatalf("A conduct = %+v", a.Conduct)
	}
	// B has no semester 2 score, so there is no year conduct.
	if b.Conduct != nil {
		t.Fatalf("B conduct = %+v, want none", b.Conduct)
	}
}

func TestBuildYearWithASingleSemester(t *testing.T) {
	r := BuildYear(testClass, []Student{stuA, stuB}, 3, yearPeriods()[:1])
	if len(r.Periods) != 1 || *r.Students[0].GPA != 8.00 {
		t.Fatalf("periods = %d, A gpa = %v", len(r.Periods), *r.Students[0].GPA)
	}
	if r.Students[0].Conduct.Score != 8.0 {
		t.Fatalf("A conduct = %+v", r.Students[0].Conduct)
	}
}
```

- [ ] **Step 2: Run it and see it fail**


Run: `go test ./internal/reporting/`
Expected: FAIL to compile (`undefined: BuildYear`).

- [ ] **Step 3: Create the implementation**


`apps/sms-api/internal/reporting/year.go`

```go
package reporting

// YearRow is one student of a year report.
type YearRow struct {
	ID             int      `json:"id"`
	IDNumber       string   `json:"idnumber"`
	FullName       string   `json:"fullname"`
	GPA            *float64 `json:"gpa"`
	Classification *Band    `json:"classification"`
	Rank           *int     `json:"rank"`
	Conduct        *Conduct `json:"conduct"`
}

// YearReport is the result of a whole year: every semester plus year totals.
type YearReport struct {
	Class        Class            `json:"class"`
	Year         int              `json:"year"`
	TotalCredits int              `json:"totalCredits"`
	Periods      []SemesterReport `json:"periods"`
	Students     []YearRow        `json:"students"`
	Summary      Summary          `json:"summary"`
	Warnings     []Warning        `json:"warnings"`
}

// BuildYear computes the report of a year from its semesters. The year ĐTB is
// credit-weighted over every course of every semester; the year rèn luyện is
// the mean of the semester scores and is empty if a semester has none.
func BuildYear(class Class, students []Student, year int, periods []PeriodInput) YearReport {
	students = sortStudents(students)
	report := YearReport{Class: class, Year: year, Periods: []SemesterReport{}, Warnings: []Warning{}}

	all := map[int][]CourseResult{} // student id -> results across the year
	conduct := map[int][]float64{}
	for _, p := range periods {
		scored, warnings := scoreCourses(p.Courses)
		sem := semesterReport(class, students, p, scored, warnings)
		report.Periods = append(report.Periods, sem)
		report.TotalCredits += sem.TotalCredits
		report.Warnings = append(report.Warnings, sem.Warnings...)
		for _, sc := range scored {
			for id, score := range sc.scores {
				all[id] = append(all[id], CourseResult{Score: score, Credits: sc.course.Credits})
			}
		}
		for id, score := range p.Conduct {
			conduct[id] = append(conduct[id], score)
		}
	}

	gpas := make([]*float64, len(students))
	report.Students = make([]YearRow, len(students))
	for i, s := range students {
		row := YearRow{ID: s.ID, IDNumber: s.IDNumber, FullName: s.FullName}
		if gpa, ok := GPA(all[s.ID]); ok {
			row.GPA, gpas[i] = &gpa, &gpa
			band := Classify(gpa)
			row.Classification = &band
		}
		if len(periods) > 0 && len(conduct[s.ID]) == len(periods) {
			if mean, ok := Mean(conduct[s.ID]); ok {
				row.Conduct = &Conduct{Score: mean, Label: ClassifyConduct(mean)}
			}
		}
		report.Students[i] = row
	}
	for i, rank := range Rank(gpas) {
		if rank > 0 {
			r := rank
			report.Students[i].Rank = &r
		}
	}

	rows := make([]summaryRow, len(students))
	for i, s := range report.Students {
		rows[i] = summaryRow{name: s.FullName, gpa: s.GPA, rank: s.Rank}
	}
	report.Summary = summarize(rows, nil)
	return report
}
```

- [ ] **Step 4: Run the tests and see them pass**


Run: `gofmt -l internal/reporting && go vet ./internal/reporting/ && go test ./internal/reporting/`
Expected: `ok  encore.app/internal/reporting`.

- [ ] **Step 5: Commit**


```bash
git add apps/sms-api/internal/reporting/year.go apps/sms-api/internal/reporting/year_test.go
git commit -m "feat(sms-api): reporting - year report" \
  -m "Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

### Task 5: Moodle data — `graded` flag, `idnumber`, lenient course metadata

**Why:** the Moodle plugin `local_coursegrades` casts a blank grade to `0.0`, so "blank" and "graded 0" are indistinguishable, which breaks the retake rule (a blank retake must not replace the first attempt) and the exam-not-held warning. It also does not send the student `idnumber` (Mã HV). Separately, `CourseMetadata.Value` is an `int`, so one course whose custom field is an empty string (for example the new `year` field on a course that has not been filled in) would make the whole category response fail to decode.

**Files:**
- Modify: `packages/coursegrades/classes/external/get_course_data.php`
- Modify: `apps/sms-api/internal/mdlapi/coursegrades.go`
- Create: `apps/sms-api/internal/mdlapi/metadata.go`
- Test: `apps/sms-api/internal/mdlapi/coursegrades_test.go`, `apps/sms-api/internal/mdlapi/metadata_test.go`

**Interfaces:**
- Produces: `mdlapi.Student.IDNumber string` (`json:"idnumber"`, empty from an old plugin); `mdlapi.Grade.Graded *int` (`json:"graded"`, nil from an old plugin) and `func (g Grade) IsGraded() bool` (with `Graded` nil, a non-zero grade counts as graded); `CourseMetadata` decodes a number, a numeric string, `""`, `null` or text without error (non-numbers become 0).
- Compatible both ways: the Go side works with an old plugin (falls back), and the new plugin fields are optional in the Moodle return definition.

- [ ] **Step 1: Create the Go tests**


`apps/sms-api/internal/mdlapi/coursegrades_test.go`

```go
package mdlapi

import (
	"encoding/json"
	"testing"
)

func TestGradeIsGraded(t *testing.T) {
	one, zero := 1, 0
	cases := []struct {
		name  string
		grade Grade
		want  bool
	}{
		{"flag says graded, even with a zero", Grade{Grade: 0, Graded: &one}, true},
		{"flag says blank, even with a value", Grade{Grade: 7, Graded: &zero}, false},
		{"old plugin, non-zero grade", Grade{Grade: 6.5}, true},
		{"old plugin, zero grade reads as blank", Grade{Grade: 0}, false},
	}
	for _, c := range cases {
		if got := c.grade.IsGraded(); got != c.want {
			t.Errorf("%s: IsGraded() = %v, want %v", c.name, got, c.want)
		}
	}
}

func TestCourseGradesResponseReadsNewFields(t *testing.T) {
	body := `{"students":[{"id":5,"fullname":"An","username":"an","idnumber":"2301010001",
		"grades":[{"moduleid":9,"grade":0,"graded":0,"examtype":"Thi"}]}]}`
	var resp GetCourseGradesResponse
	if err := json.Unmarshal([]byte(body), &resp); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}
	st := resp.Students[0]
	if st.IDNumber != "2301010001" {
		t.Fatalf("idnumber = %q", st.IDNumber)
	}
	if st.Grades[0].IsGraded() {
		t.Fatal("a blank Thi grade must not read as graded")
	}
}
```

`apps/sms-api/internal/mdlapi/metadata_test.go`

```go
package mdlapi

import (
	"encoding/json"
	"testing"
)

func TestCourseMetadataValueIsLenient(t *testing.T) {
	cases := []struct {
		name string
		json string
		want int
	}{
		{"number", `{"name":"credit","value":4}`, 4},
		{"numeric string", `{"name":"credit","value":"3"}`, 3},
		{"decimal string", `{"name":"credit","value":"2.0"}`, 2},
		{"empty string", `{"name":"year","value":""}`, 0},
		{"null", `{"name":"year","value":null}`, 0},
		{"text", `{"name":"year","value":"n/a"}`, 0},
		{"missing", `{"name":"year"}`, 0},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			var m CourseMetadata
			if err := json.Unmarshal([]byte(c.json), &m); err != nil {
				t.Fatalf("unmarshal: %v", err)
			}
			if m.Value != c.want {
				t.Fatalf("value = %d, want %d", m.Value, c.want)
			}
		})
	}
}

func TestCourseCategoryResponseSurvivesAnEmptyField(t *testing.T) {
	body := `{"courses":[{"id":1,"metadata":[{"name":"credit","value":3},{"name":"year","value":""}]}]}`
	var resp GetCategoryCoursesResponse
	if err := json.Unmarshal([]byte(body), &resp); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}
	md := resp.Courses[0].Metadata
	if len(md) != 2 || md[0].Value != 3 || md[1].Value != 0 {
		t.Fatalf("metadata = %+v", md)
	}
}
```

- [ ] **Step 2: Run them and see them fail**


Run: `ENV=test encore test ./internal/mdlapi/`
Expected: FAIL to compile (`unknown field IDNumber`, `undefined: Grade.IsGraded`, ...).

- [ ] **Step 3: Change the Go structs and add the lenient metadata decoder**


Apply this diff to `apps/sms-api/internal/mdlapi/coursegrades.go`:

```diff
diff --git a/apps/sms-api/internal/mdlapi/coursegrades.go b/apps/sms-api/internal/mdlapi/coursegrades.go
index 15d559f..caa4dbc 100644
--- a/apps/sms-api/internal/mdlapi/coursegrades.go
+++ b/apps/sms-api/internal/mdlapi/coursegrades.go
@@ -104,7 +104,10 @@ type Student struct {
 	Firstname string  `json:"firstname"`
 	Lastname  string  `json:"lastname"`
 	Email     string  `json:"email"`
-	Grades    []Grade `json:"grades"`
+	// IDNumber is the student's Moodle idnumber (Mã HV). Empty when the
+	// plugin predates the field.
+	IDNumber string  `json:"idnumber"`
+	Grades   []Grade `json:"grades"`
 }
 
 type Grade struct {
@@ -116,6 +119,18 @@ type Grade struct {
 	ItemNumber   int       `json:"itemnumber"`
 	ModuleID     int       `json:"moduleid"`
 	ModuleName   string    `json:"modulename"`
+	// Graded is 1 when a grade was entered for the item and 0 when it is
+	// blank. Nil when the plugin predates the field.
+	Graded *int `json:"graded"`
+}
+
+// IsGraded reports whether a grade was entered. Plugins that do not send
+// "graded" report a blank grade as 0, so 0 is then read as blank.
+func (g Grade) IsGraded() bool {
+	if g.Graded != nil {
+		return *g.Graded == 1
+	}
+	return g.Grade != 0
 }
 
 type LocalCourseGrades interface {
```

`apps/sms-api/internal/mdlapi/metadata.go`

```go
package mdlapi

import (
	"encoding/json"
	"strconv"
	"strings"
)

// UnmarshalJSON reads the "value" of a course custom field leniently. Moodle
// sends it as a number, a numeric string, an empty string (field not set on the
// course) or null. A number becomes Value; anything else leaves Value at 0, so
// one course with an empty field cannot fail the whole category response.
func (m *CourseMetadata) UnmarshalJSON(data []byte) error {
	var raw struct {
		Name  string          `json:"name"`
		Value json.RawMessage `json:"value"`
	}
	if err := json.Unmarshal(data, &raw); err != nil {
		return err
	}
	m.Name = raw.Name
	m.Value = 0

	s := strings.Trim(strings.TrimSpace(string(raw.Value)), `"`)
	if s == "" || s == "null" {
		return nil
	}
	if f, err := strconv.ParseFloat(s, 64); err == nil {
		m.Value = int(f)
	}
	return nil
}
```

- [ ] **Step 4: Run the Go tests and see them pass**


Run: `gofmt -l internal/mdlapi && ENV=test encore test ./internal/mdlapi/`
Expected: `ok  encore.app/internal/mdlapi`.

- [ ] **Step 5: Change the Moodle plugin**


Edit `packages/coursegrades/classes/external/get_course_data.php`. All changes are additive.

1. Enrolled users query (about line 100) — also select `idnumber`:

```php
$students = get_enrolled_users($context, 'moodle/grade:view', 0, 'u.id, u.firstname, u.lastname, u.email, u.username, u.idnumber');
```

2. In the `$gradesData[] = [...]` entry (about line 118), after `'itemnumber' => $item['itemnumber'],` add:

```php
'graded' => is_numeric($item['graderaw'] ?? null) ? 1 : 0,
```

3. In the `$studentList[$s->id] = [...]` entry (about line 145), after `'email' => $s->email,` add:

```php
'idnumber' => (string)($s->idnumber ?? ''),
```

4. In the `$studentList[...]['grades'][] = [...]` entry (about line 165), after `'grade' => (float)$g['finalgrade'],` add:

```php
'graded' => (int)$g['graded'],
```

5. In the returns definition (about line 318), add the student field after `'email' => new external_value(PARAM_TEXT, 'Email'),`:

```php
'idnumber' => new external_value(PARAM_TEXT, 'Student idnumber (Ma HV)', VALUE_OPTIONAL),
```

and the grade field after `'grade' => new external_value(PARAM_FLOAT, 'Final grade'),`:

```php
'graded' => new external_value(PARAM_INT, '1 if a grade was entered, 0 if the grade is blank', VALUE_OPTIONAL),
```

Then: `php -l packages/coursegrades/classes/external/get_course_data.php` (expected `No syntax errors detected`) if PHP is installed.

Deploy note: after the plugin is deployed, purge Moodle caches (Site administration → Development → Purge caches) so the new return definition is read. The Go side keeps working before and after.

- [ ] **Step 6: Commit**


```bash
git add packages/coursegrades/classes/external/get_course_data.php \
  apps/sms-api/internal/mdlapi/coursegrades.go apps/sms-api/internal/mdlapi/metadata.go \
  apps/sms-api/internal/mdlapi/coursegrades_test.go apps/sms-api/internal/mdlapi/metadata_test.go
git commit -m "feat(sms-api): read graded flag, idnumber and lenient course fields from Moodle" \
  -m "Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

### Task 6: Rèn luyện storage (`internal/conduct`)

**Files:**
- Create: `apps/sms-api/internal/conduct/conduct.go`, `migration.go`, `mysql_repo.go`, `migrations/000001_create_sms_conduct.up.sql`, `migrations/000001_create_sms_conduct.down.sql`
- Test: `apps/sms-api/internal/conduct/conduct_test.go`, `mysql_repo_test.go`

**Interfaces:**
- Produces: `type Score struct{ StudentID int64; Year, Semester int; Score float64 }`; `type Entry struct{ StudentID int64; Year, Semester int; Score *float64 }` (JSON `studentId`, `year`, `semester`, `score`; a nil score deletes); `type Repository interface{ List(ctx, categoryID int64) ([]Score, error); Save(ctx, categoryID, updatedBy int64, entries []Entry) error }`; `NewMySQLRepository(*dbx.DB) Repository`; `RunMigrations(*dbx.DB) error`; `ValidateScore(float64) error`, `ValidateEntries([]Entry) error`, `ErrInvalid`, `MaxEntries = 500`.
- The package must not import `encore.app/internal/logger` or `config`, so it stays testable with plain `go test`. The migration tracks its version in its own table `sms_conduct_schema_migrations` (the audit migrations use `sms_schema_migrations`).
- `Save` is one transaction: all entries or none.

- [ ] **Step 1: Create the tests**


`apps/sms-api/internal/conduct/conduct_test.go`

```go
package conduct

import (
	"errors"
	"testing"
)

func ptr(f float64) *float64 { return &f }

func TestValidateScore(t *testing.T) {
	ok := []float64{0, 3.5, 8, 8.5, 9.9, 10}
	for _, s := range ok {
		if err := ValidateScore(s); err != nil {
			t.Errorf("ValidateScore(%v) = %v, want nil", s, err)
		}
	}
	bad := []float64{-0.1, 10.1, 7.25, 8.05}
	for _, s := range bad {
		if err := ValidateScore(s); !errors.Is(err, ErrInvalid) {
			t.Errorf("ValidateScore(%v) = %v, want ErrInvalid", s, err)
		}
	}
}

func TestValidateEntries(t *testing.T) {
	good := []Entry{{StudentID: 1, Year: 1, Semester: 2, Score: ptr(8.5)}, {StudentID: 2, Year: 1, Semester: 2}}
	if err := ValidateEntries(good); err != nil {
		t.Fatalf("good entries: %v", err)
	}

	cases := map[string][]Entry{
		"empty":         {},
		"no student":    {{Year: 1, Semester: 1, Score: ptr(8)}},
		"no year":       {{StudentID: 1, Semester: 1, Score: ptr(8)}},
		"no semester":   {{StudentID: 1, Year: 1, Score: ptr(8)}},
		"score too big": {{StudentID: 1, Year: 1, Semester: 1, Score: ptr(11)}},
		"too many":      make([]Entry, MaxEntries+1),
	}
	for name, entries := range cases {
		if err := ValidateEntries(entries); !errors.Is(err, ErrInvalid) {
			t.Errorf("%s: err = %v, want ErrInvalid", name, err)
		}
	}
}
```

`apps/sms-api/internal/conduct/mysql_repo_test.go`

```go
package conduct

import (
	"context"
	"os"
	"testing"

	"github.com/pocketbase/dbx"
)

// The repository test needs a real MySQL. Point SMS_TEST_DSN at a scratch
// database (go-sql-driver DSN, parseTime=true); the test is skipped without it.
func TestMySQLRepositoryRoundTrip(t *testing.T) {
	dsn := os.Getenv("SMS_TEST_DSN")
	if dsn == "" {
		t.Skip("SMS_TEST_DSN not set")
	}
	db, err := dbx.MustOpen("mysql", dsn)
	if err != nil {
		t.Fatal(err)
	}
	if err := RunMigrations(db); err != nil {
		t.Fatal(err)
	}
	const category = 987654
	cleanup := func() { db.Delete("sms_conduct", dbx.HashExp{"category_id": category}).Execute() }
	cleanup()
	t.Cleanup(cleanup)

	repo := NewMySQLRepository(db)
	ctx := context.Background()

	if err := repo.Save(ctx, category, 1, []Entry{
		{StudentID: 10, Year: 1, Semester: 1, Score: ptr(8.5)},
		{StudentID: 11, Year: 1, Semester: 1, Score: ptr(7)},
	}); err != nil {
		t.Fatal(err)
	}
	// Overwrite one, delete the other.
	if err := repo.Save(ctx, category, 2, []Entry{
		{StudentID: 10, Year: 1, Semester: 1, Score: ptr(9)},
		{StudentID: 11, Year: 1, Semester: 1},
	}); err != nil {
		t.Fatal(err)
	}

	got, err := repo.List(ctx, category)
	if err != nil {
		t.Fatal(err)
	}
	if len(got) != 1 || got[0].StudentID != 10 || got[0].Score != 9 {
		t.Fatalf("scores = %+v, want one score of 9 for student 10", got)
	}
}
```

- [ ] **Step 2: Run them and see them fail**


Run: `go test ./internal/conduct/`
Expected: FAIL to compile (`undefined: ValidateScore`, `undefined: NewMySQLRepository`, ...).

- [ ] **Step 3: Create the implementation**


`apps/sms-api/internal/conduct/conduct.go`

```go
// Package conduct stores rèn luyện (conduct) scores. They are not a Moodle
// grade: sms-api keeps one score per student and semester of a class.
package conduct

import (
	"context"
	"errors"
	"fmt"
	"math"
)

// MaxEntries caps how many scores one save may carry.
const MaxEntries = 500

// Score is a stored conduct score.
type Score struct {
	StudentID int64
	Year      int
	Semester  int
	Score     float64
}

// Entry is one requested change. A nil Score deletes the stored score.
type Entry struct {
	StudentID int64    `json:"studentId"`
	Year      int      `json:"year"`
	Semester  int      `json:"semester"`
	Score     *float64 `json:"score"`
}

// Repository keeps conduct scores per class (Moodle category).
type Repository interface {
	List(ctx context.Context, categoryID int64) ([]Score, error)
	Save(ctx context.Context, categoryID, updatedBy int64, entries []Entry) error
}

// ErrInvalid marks a request the caller can fix.
var ErrInvalid = errors.New("invalid conduct entries")

// ValidateScore accepts 0 to 10 with at most one decimal.
func ValidateScore(score float64) error {
	if math.IsNaN(score) || score < 0 || score > 10 {
		return fmt.Errorf("%w: score %v is outside 0-10", ErrInvalid, score)
	}
	if math.Abs(score*10-math.Round(score*10)) > 1e-9 {
		return fmt.Errorf("%w: score %v has more than one decimal", ErrInvalid, score)
	}
	return nil
}

// ValidateEntries checks a whole request before anything is written.
func ValidateEntries(entries []Entry) error {
	if len(entries) == 0 {
		return fmt.Errorf("%w: no entries", ErrInvalid)
	}
	if len(entries) > MaxEntries {
		return fmt.Errorf("%w: more than %d entries", ErrInvalid, MaxEntries)
	}
	for i, e := range entries {
		if e.StudentID <= 0 || e.Year < 1 || e.Semester < 1 {
			return fmt.Errorf("%w: entry %d needs a student, a year and a semester", ErrInvalid, i)
		}
		if e.Score != nil {
			if err := ValidateScore(*e.Score); err != nil {
				return fmt.Errorf("entry %d: %w", i, err)
			}
		}
	}
	return nil
}
```

`apps/sms-api/internal/conduct/migration.go`

```go
package conduct

import (
	"embed"
	"errors"
	"fmt"

	"github.com/golang-migrate/migrate/v4"
	"github.com/golang-migrate/migrate/v4/database/mysql"
	"github.com/golang-migrate/migrate/v4/source/iofs"
	dbxlib "github.com/pocketbase/dbx"
)

//go:embed migrations/*.sql
var migrationFiles embed.FS

// RunMigrations creates the conduct table. It tracks its own version in
// sms_conduct_schema_migrations so it never collides with the audit
// migrations, which use sms_schema_migrations. Safe to run on every start.
func RunMigrations(db *dbxlib.DB) error {
	driver, err := mysql.WithInstance(db.DB(), &mysql.Config{
		MigrationsTable: "sms_conduct_schema_migrations",
	})
	if err != nil {
		return fmt.Errorf("conduct: migrate driver: %w", err)
	}
	src, err := iofs.New(migrationFiles, "migrations")
	if err != nil {
		return fmt.Errorf("conduct: migrate source: %w", err)
	}
	m, err := migrate.NewWithInstance("iofs", src, "mysql", driver)
	if err != nil {
		return fmt.Errorf("conduct: migrate instance: %w", err)
	}
	if err := m.Up(); err != nil && !errors.Is(err, migrate.ErrNoChange) {
		return fmt.Errorf("conduct: migrate up: %w", err)
	}
	return nil
}
```

`apps/sms-api/internal/conduct/mysql_repo.go`

```go
package conduct

import (
	"context"
	"time"

	"github.com/pocketbase/dbx"
)

type mysqlRepository struct {
	db *dbx.DB
}

// NewMySQLRepository returns a Repository backed by the sms_conduct table.
func NewMySQLRepository(db *dbx.DB) Repository {
	return &mysqlRepository{db: db}
}

func (r *mysqlRepository) List(ctx context.Context, categoryID int64) ([]Score, error) {
	var rows []struct {
		StudentID int64   `db:"student_id"`
		Year      int     `db:"year"`
		Semester  int     `db:"semester"`
		Score     float64 `db:"score"`
	}
	err := r.db.WithContext(ctx).
		Select("student_id", "year", "semester", "score").
		From("sms_conduct").
		Where(dbx.HashExp{"category_id": categoryID}).
		All(&rows)
	if err != nil {
		return nil, err
	}
	scores := make([]Score, len(rows))
	for i, row := range rows {
		scores[i] = Score{StudentID: row.StudentID, Year: row.Year, Semester: row.Semester, Score: row.Score}
	}
	return scores, nil
}

const upsertSQL = "INSERT INTO sms_conduct " +
	"(category_id, student_id, `year`, semester, score, updated_by, updated_at) " +
	"VALUES ({:category}, {:student}, {:year}, {:semester}, {:score}, {:by}, {:at}) " +
	"ON DUPLICATE KEY UPDATE score = VALUES(score), updated_by = VALUES(updated_by), updated_at = VALUES(updated_at)"

// Save applies every entry in one transaction: all of them or none.
func (r *mysqlRepository) Save(ctx context.Context, categoryID, updatedBy int64, entries []Entry) error {
	now := time.Now().UTC()
	return r.db.WithContext(ctx).TransactionalContext(ctx, nil, func(tx *dbx.Tx) error {
		for _, e := range entries {
			if e.Score == nil {
				_, err := tx.Delete("sms_conduct", dbx.HashExp{
					"category_id": categoryID,
					"student_id":  e.StudentID,
					"year":        e.Year,
					"semester":    e.Semester,
				}).Execute()
				if err != nil {
					return err
				}
				continue
			}
			_, err := tx.NewQuery(upsertSQL).Bind(dbx.Params{
				"category": categoryID,
				"student":  e.StudentID,
				"year":     e.Year,
				"semester": e.Semester,
				"score":    *e.Score,
				"by":       updatedBy,
				"at":       now,
			}).Execute()
			if err != nil {
				return err
			}
		}
		return nil
	})
}
```

`apps/sms-api/internal/conduct/migrations/000001_create_sms_conduct.up.sql`

```sql
CREATE TABLE IF NOT EXISTS sms_conduct (
    category_id BIGINT       NOT NULL,
    student_id  BIGINT       NOT NULL,
    year        INT          NOT NULL,
    semester    INT          NOT NULL,
    score       DECIMAL(3,1) NOT NULL,
    updated_by  BIGINT       NOT NULL,
    updated_at  DATETIME(3)  NOT NULL,
    PRIMARY KEY (category_id, student_id, year, semester),
    INDEX idx_class_period (category_id, year, semester)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

`apps/sms-api/internal/conduct/migrations/000001_create_sms_conduct.down.sql`

```sql
DROP TABLE IF EXISTS sms_conduct;
```

- [ ] **Step 4: Run the tests (the repository test is skipped without a database)**


Run: `gofmt -l internal/conduct && go vet ./internal/conduct/ && go test ./internal/conduct/ -v`
Expected: `TestValidateScore` and `TestValidateEntries` PASS; `TestMySQLRepositoryRoundTrip` SKIP (`SMS_TEST_DSN not set`).

- [ ] **Step 5: Run the repository test against a throwaway MariaDB**


Never point it at the Moodle dev database. Use a disposable container:

```bash
docker run -d --rm --name sms-conduct-scratch -e ALLOW_EMPTY_PASSWORD=yes -e MARIADB_DATABASE=scratch -p 3399:3306 bitnami/mariadb:latest
until docker exec sms-conduct-scratch mysqladmin ping -h 127.0.0.1 --silent; do sleep 2; done
SMS_TEST_DSN='root@tcp(127.0.0.1:3399)/scratch?parseTime=true' go test ./internal/conduct/ -v
docker rm -f sms-conduct-scratch
```

Expected: `TestMySQLRepositoryRoundTrip` PASS (migration applies, upsert overwrites, a nil score deletes).

- [ ] **Step 6: Commit**


```bash
git add apps/sms-api/internal/conduct
git commit -m "feat(sms-api): store conduct scores in sms-api" \
  -m "Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

### Task 7: Report service (`internal/classreport`)

**Files:**
- Create: `apps/sms-api/internal/classreport/convert.go`, `service.go`, `me.go`, `classes_repo.go`
- Test: `apps/sms-api/internal/classreport/service_test.go`

**Interfaces:**
- Consumes: `reporting.*` (Tasks 1–4), `mdlapi.Grade.IsGraded`, `mdlapi.Student.IDNumber`, lenient `CourseMetadata` (Task 5), `conduct.Repository` (Task 6), `mdlapi.LocalTeacherProvider` (`GetAllCategories`, `GetAllCategoryCoursesForAdmin`), `mdlapi.LocalCourseGrades` (`GetCourseDetails`).
- Produces: `classreport.New(teacher, grades, conductRepo, classes) *Service`; `(*Service).Periods(ctx, categoryID int) (*PeriodsResponse, error)`, `.Semester(ctx, categoryID, year, semester int) (*reporting.SemesterReport, error)`, `.Year(ctx, categoryID, year int) (*reporting.YearReport, error)`, `.SaveConduct(ctx, categoryID int, updatedBy int64, entries []conduct.Entry) error`, `.MySemester(ctx, userID int64, year, semester int) (*MySemester, error)`, `.MyYear(ctx, userID int64, year int) (*MyYear, error)`; `ClassResolver` interface and `NewClassResolver(*dbx.DB)`; `ErrNotFound`; `WarnNoCredits`.
- A course is in a period only when its custom fields `year` and `semester` are both > 0 (`credit` may be missing: it then raises `course_no_credits` and does not weigh in). Every module with an exam type is an item for every enrolled student; a student with no entry for a module gets a blank item. Course fetches from Moodle run with a bound of 4. A student's own result is cut from the class report by `ProjectSemester`/`ProjectYear`, so it can never carry another student's data.
- Assumptions to confirm against real data in Task 9: `Module` order in the Moodle response is the course order (the retake rule uses it); a category holds only its own courses; the enrolled-users list holds students only.

- [ ] **Step 1: Create the test**


`apps/sms-api/internal/classreport/service_test.go`

```go
package classreport

import (
	"context"
	"encoding/json"
	"errors"
	"strings"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"encore.app/internal/conduct"
	"encore.app/internal/mdlapi"
	"encore.app/internal/reporting"
)

// ── fakes ────────────────────────────────────────────────────────────────────

type fakeTeacher struct {
	mdlapi.LocalTeacherProvider // the methods a test does not use stay nil
	categories                  []mdlapi.Category
	courses                     []mdlapi.CategoryCourse
}

func (f fakeTeacher) GetAllCategories(context.Context, *mdlapi.GetAllCategoriesRequest) (*mdlapi.GetCategoriesResponse, error) {
	return &mdlapi.GetCategoriesResponse{Categories: f.categories}, nil
}

func (f fakeTeacher) GetAllCategoryCoursesForAdmin(context.Context, *mdlapi.GetCategoryCoursesRequest) (*mdlapi.GetCategoryCoursesResponse, error) {
	return &mdlapi.GetCategoryCoursesResponse{Courses: f.courses}, nil
}

type fakeGrades struct {
	responses map[int64]*mdlapi.GetCourseGradesResponse
	failOn    int64
	delay     time.Duration
	inflight  atomic.Int32
	peak      atomic.Int32
}

func (f *fakeGrades) GetCourseDetails(_ context.Context, req *mdlapi.GetCourseGradesRequest) (*mdlapi.GetCourseGradesResponse, error) {
	n := f.inflight.Add(1)
	defer f.inflight.Add(-1)
	for {
		peak := f.peak.Load()
		if n <= peak || f.peak.CompareAndSwap(peak, n) {
			break
		}
	}
	time.Sleep(f.delay)
	if req.CourseId == f.failOn {
		return nil, errors.New("moodle is down")
	}
	return f.responses[req.CourseId], nil
}

type fakeConduct struct {
	mu     sync.Mutex
	scores []conduct.Score
	saved  []conduct.Entry
}

func (f *fakeConduct) List(context.Context, int64) ([]conduct.Score, error) { return f.scores, nil }
func (f *fakeConduct) Save(_ context.Context, _, _ int64, entries []conduct.Entry) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.saved = append(f.saved, entries...)
	return nil
}

type fakeClasses struct{ id int }

func (f fakeClasses) ClassOf(context.Context, int64) (int, error) {
	if f.id == 0 {
		return 0, ErrNotFound
	}
	return f.id, nil
}

// ── fixtures ─────────────────────────────────────────────────────────────────

func et(t mdlapi.ExamType) *mdlapi.ExamType { return &t }

func meta(fields map[string]int) []mdlapi.CourseMetadata {
	var out []mdlapi.CourseMetadata
	for k, v := range fields {
		out = append(out, mdlapi.CourseMetadata{Name: k, Value: v})
	}
	return out
}

// modules lists nTests 15P items, nTests 1T items and one Thi, ids from base.
func modules(base, nTests int) []mdlapi.Module {
	var out []mdlapi.Module
	for i := 0; i < nTests; i++ {
		out = append(out, mdlapi.Module{ID: base + i, ExamType: et(mdlapi.Exam15M)})
	}
	for i := 0; i < nTests; i++ {
		out = append(out, mdlapi.Module{ID: base + 10 + i, ExamType: et(mdlapi.Exam45M)})
	}
	return append(out, mdlapi.Module{ID: base + 20, ExamType: et(mdlapi.ExamFinal)})
}

// student has every item of the course graded with the same value v.
func student(id int, idnumber, name string, mods []mdlapi.Module, v float64) mdlapi.Student {
	one := 1
	st := mdlapi.Student{ID: id, IDNumber: idnumber, Fullname: name}
	for _, m := range mods {
		st.Grades = append(st.Grades, mdlapi.Grade{ModuleID: m.ID, Grade: v, Graded: &one})
	}
	return st
}

func course(mods []mdlapi.Module, students ...mdlapi.Student) *mdlapi.GetCourseGradesResponse {
	return &mdlapi.GetCourseGradesResponse{Modules: mods, Students: students}
}

// fixture: class 12 with GP (4 cr) and SL (2 cr) in year 1 semester 1, KT
// (2 cr) in year 1 semester 2, and OLD, which has no year.
func fixture() (*Service, *fakeGrades, *fakeConduct) {
	gpMods, slMods, ktMods := modules(100, 2), modules(200, 1), modules(300, 1)
	teacher := fakeTeacher{
		categories: []mdlapi.Category{{ID: 12, Name: "Y sĩ K12", IdNumber: "Y53"}},
		courses: []mdlapi.CategoryCourse{
			{ID: 5, Shortname: "GP", Fullname: "Giải phẫu", Metadata: meta(map[string]int{"credit": 4, "year": 1, "semester": 1})},
			{ID: 6, Shortname: "SL", Fullname: "Sinh lý", Metadata: meta(map[string]int{"credit": 2, "year": 1, "semester": 1})},
			{ID: 7, Shortname: "KT", Fullname: "Kiểm tra", Metadata: meta(map[string]int{"credit": 2, "year": 1, "semester": 2})},
			{ID: 8, Shortname: "OLD", Fullname: "Cũ", Metadata: meta(map[string]int{"credit": 2, "semester": 1})},
		},
	}
	grades := &fakeGrades{responses: map[int64]*mdlapi.GetCourseGradesResponse{
		5: course(gpMods, student(1, "2301010001", "An", gpMods, 8), student(2, "2301010002", "Bình", gpMods, 9)),
		6: course(slMods, student(1, "2301010001", "An", slMods, 6), student(2, "2301010002", "Bình", slMods, 9)),
		7: course(ktMods, student(1, "2301010001", "An", ktMods, 7), student(2, "2301010002", "Bình", ktMods, 9)),
	}}
	repo := &fakeConduct{scores: []conduct.Score{
		{StudentID: 1, Year: 1, Semester: 1, Score: 8.5},
		{StudentID: 1, Year: 1, Semester: 2, Score: 7.5},
		{StudentID: 2, Year: 1, Semester: 1, Score: 9},
	}}
	svc := New(teacher, grades, repo, fakeClasses{id: 12})
	return svc, grades, repo
}

var ctx = context.Background()

// ── tests ────────────────────────────────────────────────────────────────────

func TestPeriodsGroupsCoursesAndListsUnassigned(t *testing.T) {
	svc, _, _ := fixture()
	resp, err := svc.Periods(ctx, 12)
	if err != nil {
		t.Fatal(err)
	}
	if resp.Class.IDNumber != "Y53" {
		t.Fatalf("class = %+v", resp.Class)
	}
	want := []Period{{Year: 1, Semester: 1, Courses: 2}, {Year: 1, Semester: 2, Courses: 1}}
	if len(resp.Periods) != 2 || resp.Periods[0] != want[0] || resp.Periods[1] != want[1] {
		t.Fatalf("periods = %+v, want %+v", resp.Periods, want)
	}
	if len(resp.Unassigned) != 1 || resp.Unassigned[0].ShortName != "OLD" ||
		len(resp.Unassigned[0].Missing) != 1 || resp.Unassigned[0].Missing[0] != "year" {
		t.Fatalf("unassigned = %+v", resp.Unassigned)
	}
}

func TestSemesterReport(t *testing.T) {
	svc, _, _ := fixture()
	r, err := svc.Semester(ctx, 12, 1, 1)
	if err != nil {
		t.Fatal(err)
	}
	if r.TotalCredits != 6 || len(r.Courses) != 2 || len(r.Warnings) != 0 {
		t.Fatalf("credits = %d, courses = %d, warnings = %+v", r.TotalCredits, len(r.Courses), r.Warnings)
	}
	an, binh := r.Students[0], r.Students[1]
	if an.FullName != "An" || an.IDNumber != "2301010001" {
		t.Fatalf("first row = %+v", an)
	}
	// An: (8·4 + 6·2) / 6 = 7.33.  Bình: 9.00.
	if *an.GPA != 7.33 || *binh.GPA != 9.00 || *an.Rank != 2 || *binh.Rank != 1 {
		t.Fatalf("gpa/rank = %v/%d, %v/%d", *an.GPA, *an.Rank, *binh.GPA, *binh.Rank)
	}
	if an.Conduct == nil || an.Conduct.Score != 8.5 {
		t.Fatalf("An conduct = %+v", an.Conduct)
	}
}

func TestYearReportUsesEverySemesterOfTheYear(t *testing.T) {
	svc, _, _ := fixture()
	r, err := svc.Year(ctx, 12, 1)
	if err != nil {
		t.Fatal(err)
	}
	if len(r.Periods) != 2 || r.TotalCredits != 8 {
		t.Fatalf("periods = %d, credits = %d", len(r.Periods), r.TotalCredits)
	}
	an, binh := r.Students[0], r.Students[1]
	// An: (8·4 + 6·2 + 7·2) / 8 = 7.25.  Bình: 9.00.
	if *an.GPA != 7.25 || *binh.GPA != 9.00 {
		t.Fatalf("year gpa = %v, %v", *an.GPA, *binh.GPA)
	}
	// An has both semesters (8.5, 7.5 -> 8.0); Bình lacks semester 2.
	if an.Conduct == nil || an.Conduct.Score != 8.0 || binh.Conduct != nil {
		t.Fatalf("conduct = %+v / %+v", an.Conduct, binh.Conduct)
	}
}

func TestMissingItemsBecomeBlank(t *testing.T) {
	mods := modules(100, 1) // 100 = 15P, 110 = 1T, 120 = Thi
	one := 1
	resp := course(mods, mdlapi.Student{ID: 1, Grades: []mdlapi.Grade{
		{ModuleID: 100, Grade: 7, Graded: &one},
		// no entry for 110; 120 present but blank
		{ModuleID: 120, Grade: 0, Graded: new(int)},
	}})
	in := courseInput(courseMeta{}, resp)

	items := in.Items[1]
	if len(items) != 3 {
		t.Fatalf("items = %+v", items)
	}
	if !items[0].Graded || items[1].Graded || items[2].Graded {
		t.Fatalf("graded = %v %v %v, want true false false", items[0].Graded, items[1].Graded, items[2].Graded)
	}
	if items[0].Type != reporting.ExamRegular || items[1].Type != reporting.ExamPeriodic || items[2].Type != reporting.ExamFinal {
		t.Fatalf("types = %v %v %v", items[0].Type, items[1].Type, items[2].Type)
	}
}

func TestModulesWithoutAnExamTypeAreIgnored(t *testing.T) {
	mods := append(modules(100, 1), mdlapi.Module{ID: 999}) // no exam type
	resp := course(mods, student(1, "1", "An", mods, 8))
	if n := len(courseInput(courseMeta{}, resp).Items[1]); n != 3 {
		t.Fatalf("items = %d, want 3", n)
	}
}

func TestStudentNumberFallsBackToUsername(t *testing.T) {
	u := "hv001"
	if got := studentNumber(mdlapi.Student{IDNumber: "2301", Username: &u}); got != "2301" {
		t.Fatalf("got %q", got)
	}
	if got := studentNumber(mdlapi.Student{Username: &u}); got != "hv001" {
		t.Fatalf("got %q", got)
	}
	if got := studentNumber(mdlapi.Student{}); got != "" {
		t.Fatalf("got %q", got)
	}
}

func TestCourseWithoutCreditsIsFlagged(t *testing.T) {
	svc, _, _ := fixture()
	svc.teacher = fakeTeacher{
		categories: []mdlapi.Category{{ID: 12}},
		courses: []mdlapi.CategoryCourse{
			{ID: 5, Metadata: meta(map[string]int{"credit": 4, "year": 1, "semester": 1})},
			{ID: 6, Metadata: meta(map[string]int{"year": 1, "semester": 1})}, // no credit
		},
	}
	r, err := svc.Semester(ctx, 12, 1, 1)
	if err != nil {
		t.Fatal(err)
	}
	found := false
	for _, w := range r.Warnings {
		found = found || (w.Code == WarnNoCredits && w.CourseID == 6)
	}
	if !found {
		t.Fatalf("warnings = %+v, want %s for course 6", r.Warnings, WarnNoCredits)
	}
	// SL has no credits, so it cannot weigh in: An's ĐTB is just GP's 8.00.
	if *r.Students[0].GPA != 8.00 {
		t.Fatalf("An gpa = %v", *r.Students[0].GPA)
	}
}

func TestNotFound(t *testing.T) {
	svc, _, _ := fixture()
	if _, err := svc.Semester(ctx, 99, 1, 1); !errors.Is(err, ErrNotFound) {
		t.Fatalf("unknown class: %v", err)
	}
	if _, err := svc.Semester(ctx, 12, 1, 5); !errors.Is(err, ErrNotFound) {
		t.Fatalf("unknown semester: %v", err)
	}
	if _, err := svc.Year(ctx, 12, 9); !errors.Is(err, ErrNotFound) {
		t.Fatalf("unknown year: %v", err)
	}
}

func TestMoodleFailureFailsTheReport(t *testing.T) {
	svc, grades, _ := fixture()
	grades.failOn = 6
	if _, err := svc.Semester(ctx, 12, 1, 1); err == nil || !strings.Contains(err.Error(), "moodle is down") {
		t.Fatalf("err = %v", err)
	}
}

func TestCourseFetchesAreBounded(t *testing.T) {
	svc, grades, _ := fixture()
	var courses []mdlapi.CategoryCourse
	grades.responses = map[int64]*mdlapi.GetCourseGradesResponse{}
	for id := 1; id <= 12; id++ {
		courses = append(courses, mdlapi.CategoryCourse{ID: id, Metadata: meta(map[string]int{"credit": 2, "year": 1, "semester": 1})})
		grades.responses[int64(id)] = course(nil)
	}
	svc.teacher = fakeTeacher{categories: []mdlapi.Category{{ID: 12}}, courses: courses}
	grades.delay = 15 * time.Millisecond
	svc.concurrency = 3

	if _, err := svc.Semester(ctx, 12, 1, 1); err != nil {
		t.Fatal(err)
	}
	if peak := grades.peak.Load(); peak > 3 || peak < 2 {
		t.Fatalf("peak concurrent fetches = %d, want 2 or 3", peak)
	}
}

func TestMySemesterShowsOnlyTheStudentsOwnRow(t *testing.T) {
	svc, _, _ := fixture()
	mine, err := svc.MySemester(ctx, 1, 1, 1)
	if err != nil {
		t.Fatal(err)
	}
	if mine.Row.FullName != "An" || *mine.Row.Rank != 2 || mine.Ranked != 2 {
		t.Fatalf("row = %+v, ranked = %d", mine.Row, mine.Ranked)
	}
	body, _ := json.Marshal(mine)
	if strings.Contains(string(body), "Bình") {
		t.Fatalf("another student leaked into the response: %s", body)
	}

	if _, err := svc.MySemester(ctx, 77, 1, 1); !errors.Is(err, ErrNotFound) {
		t.Fatalf("a user who is not in the class: %v", err)
	}
	svc.classes = fakeClasses{} // student enrolled nowhere
	if _, err := svc.MySemester(ctx, 1, 1, 1); !errors.Is(err, ErrNotFound) {
		t.Fatalf("no class: %v", err)
	}
}

func TestMyYearHasEachSemester(t *testing.T) {
	svc, _, _ := fixture()
	mine, err := svc.MyYear(ctx, 2, 1)
	if err != nil {
		t.Fatal(err)
	}
	if *mine.Row.GPA != 9.00 || *mine.Row.Rank != 1 || len(mine.Periods) != 2 {
		t.Fatalf("year = %+v, periods = %d", mine.Row, len(mine.Periods))
	}
	body, _ := json.Marshal(mine)
	if strings.Contains(string(body), "An\"") {
		t.Fatalf("another student leaked into the response: %s", body)
	}
}

func TestSaveConduct(t *testing.T) {
	svc, _, repo := fixture()
	score := 8.0

	if err := svc.SaveConduct(ctx, 12, 3, []conduct.Entry{{StudentID: 1, Year: 1, Semester: 1, Score: &score}}); err != nil {
		t.Fatal(err)
	}
	if len(repo.saved) != 1 {
		t.Fatalf("saved = %+v", repo.saved)
	}

	bad := 11.0
	err := svc.SaveConduct(ctx, 12, 3, []conduct.Entry{{StudentID: 1, Year: 1, Semester: 1, Score: &bad}})
	if !errors.Is(err, conduct.ErrInvalid) || len(repo.saved) != 1 {
		t.Fatalf("invalid score: err = %v, saved = %d", err, len(repo.saved))
	}
	err = svc.SaveConduct(ctx, 99, 3, []conduct.Entry{{StudentID: 1, Year: 1, Semester: 1, Score: &score}})
	if !errors.Is(err, ErrNotFound) {
		t.Fatalf("unknown class: %v", err)
	}
}
```

- [ ] **Step 2: Run it and see it fail**


Run: `ENV=test encore test ./internal/classreport/`
Expected: FAIL to compile (`undefined: New`, `undefined: courseInput`, ...).

- [ ] **Step 3: Create the implementation**


`apps/sms-api/internal/classreport/convert.go`

```go
package classreport

import (
	"encore.app/internal/mdlapi"
	"encore.app/internal/reporting"
)

// Names of the Moodle course custom fields the reports read.
const (
	fieldCredit   = "credit"
	fieldSemester = "semester"
	fieldYear     = "year"
)

// courseMeta is a category course with its custom fields read out.
type courseMeta struct {
	course   mdlapi.CategoryCourse
	credits  int
	year     int
	semester int
}

func readMeta(c mdlapi.CategoryCourse) courseMeta {
	m := courseMeta{course: c}
	for _, f := range c.Metadata {
		switch f.Name {
		case fieldCredit:
			m.credits = f.Value
		case fieldSemester:
			m.semester = f.Value
		case fieldYear:
			m.year = f.Value
		}
	}
	return m
}

// assigned reports whether the course belongs to a period.
func (m courseMeta) assigned() bool { return m.year > 0 && m.semester > 0 }

func (m courseMeta) missing() []string {
	var out []string
	if m.year <= 0 {
		out = append(out, fieldYear)
	}
	if m.semester <= 0 {
		out = append(out, fieldSemester)
	}
	return out
}

func (m courseMeta) reportingCourse() reporting.Course {
	return reporting.Course{
		ID:        m.course.ID,
		ShortName: m.course.Shortname,
		FullName:  m.course.Fullname,
		Credits:   m.credits,
	}
}

func reportingExamType(t mdlapi.ExamType) (reporting.ExamType, bool) {
	switch t {
	case mdlapi.Exam15M:
		return reporting.ExamRegular, true
	case mdlapi.Exam45M:
		return reporting.ExamPeriodic, true
	case mdlapi.ExamFinal:
		return reporting.ExamFinal, true
	}
	return "", false
}

// courseInput turns a Moodle course into scoring input. Every graded module
// with a known exam type is an item for every enrolled student, in the order
// Moodle lists the modules; a student with no entry for a module gets a blank
// item, which the scoring counts as 0.
func courseInput(meta courseMeta, resp *mdlapi.GetCourseGradesResponse) reporting.CourseInput {
	type module struct {
		id  int
		typ reporting.ExamType
	}
	var modules []module
	for _, m := range resp.Modules {
		if m.ExamType == nil {
			continue
		}
		if typ, ok := reportingExamType(*m.ExamType); ok {
			modules = append(modules, module{id: m.ID, typ: typ})
		}
	}

	items := make(map[int][]reporting.Item, len(resp.Students))
	for _, st := range resp.Students {
		byModule := make(map[int]mdlapi.Grade, len(st.Grades))
		for _, g := range st.Grades {
			byModule[g.ModuleID] = g
		}
		list := make([]reporting.Item, 0, len(modules))
		for _, m := range modules {
			g, found := byModule[m.id]
			list = append(list, reporting.Item{Type: m.typ, Grade: g.Grade, Graded: found && g.IsGraded()})
		}
		items[st.ID] = list
	}
	return reporting.CourseInput{Course: meta.reportingCourse(), Items: items}
}

// studentNumber is the student's Mã HV: the Moodle idnumber, falling back to
// the username for plugins that do not send it.
func studentNumber(st mdlapi.Student) string {
	if st.IDNumber != "" {
		return st.IDNumber
	}
	if st.Username != nil {
		return *st.Username
	}
	return ""
}

// studentsOf lists the students of every response once.
func studentsOf(responses []*mdlapi.GetCourseGradesResponse) []reporting.Student {
	seen := map[int]bool{}
	var students []reporting.Student
	for _, resp := range responses {
		for _, st := range resp.Students {
			if seen[st.ID] {
				continue
			}
			seen[st.ID] = true
			students = append(students, reporting.Student{ID: st.ID, IDNumber: studentNumber(st), FullName: st.Fullname})
		}
	}
	return students
}
```

`apps/sms-api/internal/classreport/service.go`

```go
// Package classreport builds the class results reports: it reads a class's
// courses and grades from Moodle, its conduct scores from sms-api's own table,
// and hands them to the pure calculations in package reporting.
package classreport

import (
	"context"
	"errors"
	"fmt"
	"sort"
	"sync"

	"encore.app/internal/conduct"
	"encore.app/internal/mdlapi"
	"encore.app/internal/reporting"
)

// ErrNotFound means the class, the period or the student does not exist.
var ErrNotFound = errors.New("not found")

// WarnNoCredits flags a course with no credit value: it cannot weigh in a
// score, so it is left out of the ĐTB.
const WarnNoCredits = "course_no_credits"

const defaultConcurrency = 4

// Service builds reports for a class (a Moodle category).
type Service struct {
	teacher     mdlapi.LocalTeacherProvider
	grades      mdlapi.LocalCourseGrades
	conduct     conduct.Repository
	classes     ClassResolver
	concurrency int
}

// ClassResolver finds the class (category id) a student belongs to.
type ClassResolver interface {
	ClassOf(ctx context.Context, userID int64) (int, error)
}

func New(
	teacher mdlapi.LocalTeacherProvider,
	grades mdlapi.LocalCourseGrades,
	conductRepo conduct.Repository,
	classes ClassResolver,
) *Service {
	return &Service{
		teacher:     teacher,
		grades:      grades,
		conduct:     conductRepo,
		classes:     classes,
		concurrency: defaultConcurrency,
	}
}

// Period is a (year, semester) pair a class has courses in.
type Period struct {
	Year     int `json:"year"`
	Semester int `json:"semester"`
	Courses  int `json:"courses"`
}

// UnassignedCourse is a course missing the year or semester field, so it is in
// no report.
type UnassignedCourse struct {
	ID        int      `json:"id"`
	ShortName string   `json:"shortname"`
	Missing   []string `json:"missing"`
}

type PeriodsResponse struct {
	Class      reporting.Class    `json:"class"`
	Periods    []Period           `json:"periods"`
	Unassigned []UnassignedCourse `json:"unassigned"`
}

// Periods lists the periods of a class, oldest first.
func (s *Service) Periods(ctx context.Context, categoryID int) (*PeriodsResponse, error) {
	class, metas, err := s.load(ctx, categoryID)
	if err != nil {
		return nil, err
	}
	resp := &PeriodsResponse{Class: class, Periods: []Period{}, Unassigned: []UnassignedCourse{}}
	counts := map[[2]int]int{}
	for _, m := range metas {
		if !m.assigned() {
			resp.Unassigned = append(resp.Unassigned, UnassignedCourse{
				ID: m.course.ID, ShortName: m.course.Shortname, Missing: m.missing(),
			})
			continue
		}
		counts[[2]int{m.year, m.semester}]++
	}
	for key, n := range counts {
		resp.Periods = append(resp.Periods, Period{Year: key[0], Semester: key[1], Courses: n})
	}
	sort.Slice(resp.Periods, func(i, j int) bool {
		a, b := resp.Periods[i], resp.Periods[j]
		if a.Year != b.Year {
			return a.Year < b.Year
		}
		return a.Semester < b.Semester
	})
	return resp, nil
}

// Semester builds the report of one semester of one year.
func (s *Service) Semester(ctx context.Context, categoryID, year, semester int) (*reporting.SemesterReport, error) {
	class, metas, err := s.load(ctx, categoryID)
	if err != nil {
		return nil, err
	}
	inPeriod := filterPeriod(metas, year, semester)
	if len(inPeriod) == 0 {
		return nil, fmt.Errorf("%w: no courses in year %d semester %d", ErrNotFound, year, semester)
	}
	responses, err := s.fetch(ctx, inPeriod)
	if err != nil {
		return nil, err
	}
	scores, err := s.conduct.List(ctx, int64(categoryID))
	if err != nil {
		return nil, err
	}

	report := reporting.BuildSemester(
		class,
		studentsOf(responsesOf(inPeriod, responses)),
		periodInput(year, semester, inPeriod, responses, conductByPeriod(scores)[[2]int{year, semester}]),
	)
	report.Warnings = append(report.Warnings, creditWarnings(inPeriod)...)
	return &report, nil
}

// Year builds the report of a whole year: every semester it has courses in.
func (s *Service) Year(ctx context.Context, categoryID, year int) (*reporting.YearReport, error) {
	class, metas, err := s.load(ctx, categoryID)
	if err != nil {
		return nil, err
	}
	var inYear []courseMeta
	semesters := map[int]bool{}
	for _, m := range metas {
		if m.assigned() && m.year == year {
			inYear = append(inYear, m)
			semesters[m.semester] = true
		}
	}
	if len(inYear) == 0 {
		return nil, fmt.Errorf("%w: no courses in year %d", ErrNotFound, year)
	}
	responses, err := s.fetch(ctx, inYear)
	if err != nil {
		return nil, err
	}
	scores, err := s.conduct.List(ctx, int64(categoryID))
	if err != nil {
		return nil, err
	}
	byPeriod := conductByPeriod(scores)

	order := make([]int, 0, len(semesters))
	for sem := range semesters {
		order = append(order, sem)
	}
	sort.Ints(order)

	periods := make([]reporting.PeriodInput, 0, len(order))
	for _, sem := range order {
		periods = append(periods, periodInput(year, sem, filterPeriod(inYear, year, sem), responses, byPeriod[[2]int{year, sem}]))
	}
	report := reporting.BuildYear(class, studentsOf(responsesOf(inYear, responses)), year, periods)
	report.Warnings = append(report.Warnings, creditWarnings(inYear)...)
	return &report, nil
}

// SaveConduct validates and stores conduct scores of a class.
func (s *Service) SaveConduct(ctx context.Context, categoryID int, updatedBy int64, entries []conduct.Entry) error {
	if err := conduct.ValidateEntries(entries); err != nil {
		return err
	}
	if _, _, err := s.load(ctx, categoryID); err != nil {
		return err
	}
	return s.conduct.Save(ctx, int64(categoryID), updatedBy, entries)
}

// MySemester is one student's own result in a semester: their row and rank,
// never anyone else's.
func (s *Service) MySemester(ctx context.Context, userID int64, year, semester int) (*MySemester, error) {
	categoryID, err := s.classes.ClassOf(ctx, userID)
	if err != nil {
		return nil, err
	}
	report, err := s.Semester(ctx, categoryID, year, semester)
	if err != nil {
		return nil, err
	}
	mine, ok := ProjectSemester(report, int(userID))
	if !ok {
		return nil, fmt.Errorf("%w: student is not in this class report", ErrNotFound)
	}
	return mine, nil
}

// MyYear is one student's own result in a year.
func (s *Service) MyYear(ctx context.Context, userID int64, year int) (*MyYear, error) {
	categoryID, err := s.classes.ClassOf(ctx, userID)
	if err != nil {
		return nil, err
	}
	report, err := s.Year(ctx, categoryID, year)
	if err != nil {
		return nil, err
	}
	mine, ok := ProjectYear(report, int(userID))
	if !ok {
		return nil, fmt.Errorf("%w: student is not in this class report", ErrNotFound)
	}
	return mine, nil
}

// ── internals ────────────────────────────────────────────────────────────────

func (s *Service) load(ctx context.Context, categoryID int) (reporting.Class, []courseMeta, error) {
	cats, err := s.teacher.GetAllCategories(ctx, &mdlapi.GetAllCategoriesRequest{})
	if err != nil {
		return reporting.Class{}, nil, err
	}
	var class *reporting.Class
	for _, c := range cats.Categories {
		if c.ID == categoryID {
			class = &reporting.Class{ID: c.ID, Name: c.Name, IDNumber: c.IdNumber}
			break
		}
	}
	if class == nil {
		return reporting.Class{}, nil, fmt.Errorf("%w: class %d", ErrNotFound, categoryID)
	}

	courses, err := s.teacher.GetAllCategoryCoursesForAdmin(ctx, &mdlapi.GetCategoryCoursesRequest{CategoryID: categoryID})
	if err != nil {
		return reporting.Class{}, nil, err
	}
	metas := make([]courseMeta, len(courses.Courses))
	for i, c := range courses.Courses {
		metas[i] = readMeta(c)
	}
	return *class, metas, nil
}

// responsesOf lists the fetched responses in course order.
func responsesOf(metas []courseMeta, responses map[int]*mdlapi.GetCourseGradesResponse) []*mdlapi.GetCourseGradesResponse {
	out := make([]*mdlapi.GetCourseGradesResponse, len(metas))
	for i, m := range metas {
		out[i] = responses[m.course.ID]
	}
	return out
}

func filterPeriod(metas []courseMeta, year, semester int) []courseMeta {
	var out []courseMeta
	for _, m := range metas {
		if m.assigned() && m.year == year && m.semester == semester {
			out = append(out, m)
		}
	}
	return out
}

func periodInput(
	year, semester int,
	metas []courseMeta,
	responses map[int]*mdlapi.GetCourseGradesResponse,
	conductScores map[int]float64,
) reporting.PeriodInput {
	in := reporting.PeriodInput{Year: year, Semester: semester, Conduct: conductScores}
	for _, m := range metas {
		in.Courses = append(in.Courses, courseInput(m, responses[m.course.ID]))
	}
	return in
}

// conductByPeriod groups stored scores as (year, semester) -> student id -> score.
func conductByPeriod(scores []conduct.Score) map[[2]int]map[int]float64 {
	out := map[[2]int]map[int]float64{}
	for _, sc := range scores {
		key := [2]int{sc.Year, sc.Semester}
		if out[key] == nil {
			out[key] = map[int]float64{}
		}
		out[key][int(sc.StudentID)] = sc.Score
	}
	return out
}

func creditWarnings(metas []courseMeta) []reporting.Warning {
	var out []reporting.Warning
	for _, m := range metas {
		if m.credits <= 0 {
			out = append(out, reporting.Warning{Code: WarnNoCredits, CourseID: m.course.ID})
		}
	}
	return out
}

// fetch loads the grades of every course, a few at a time, so a big year does
// not flood Moodle. It stops at the first failure.
func (s *Service) fetch(ctx context.Context, metas []courseMeta) (map[int]*mdlapi.GetCourseGradesResponse, error) {
	ctx, cancel := context.WithCancel(ctx)
	defer cancel()

	limit := s.concurrency
	if limit < 1 {
		limit = defaultConcurrency
	}
	sem := make(chan struct{}, limit)
	out := make(map[int]*mdlapi.GetCourseGradesResponse, len(metas))
	var (
		mu       sync.Mutex
		wg       sync.WaitGroup
		firstErr error
	)
	for _, m := range metas {
		sem <- struct{}{}
		wg.Add(1)
		go func(id int) {
			defer wg.Done()
			defer func() { <-sem }()
			resp, err := s.grades.GetCourseDetails(ctx, &mdlapi.GetCourseGradesRequest{CourseId: int64(id)})
			mu.Lock()
			defer mu.Unlock()
			if err != nil {
				if firstErr == nil {
					firstErr = fmt.Errorf("course %d: %w", id, err)
					cancel()
				}
				return
			}
			out[id] = resp
		}(m.course.ID)
	}
	wg.Wait()
	if firstErr != nil {
		return nil, firstErr
	}
	return out, nil
}
```

`apps/sms-api/internal/classreport/me.go`

```go
package classreport

import "encore.app/internal/reporting"

// MySemester is a student's own semester result. It carries the student's row
// and how many students are ranked, never another student's name or score.
type MySemester struct {
	Class        reporting.Class      `json:"class"`
	Year         int                  `json:"year"`
	Semester     int                  `json:"semester"`
	TotalCredits int                  `json:"totalCredits"`
	Courses      []reporting.Course   `json:"courses"`
	Ranked       int                  `json:"ranked"`
	Row          reporting.StudentRow `json:"row"`
}

// MyYear is a student's own year result with each of its semesters.
type MyYear struct {
	Class        reporting.Class   `json:"class"`
	Year         int               `json:"year"`
	TotalCredits int               `json:"totalCredits"`
	Ranked       int               `json:"ranked"`
	Row          reporting.YearRow `json:"row"`
	Periods      []MySemester      `json:"periods"`
}

// ProjectSemester cuts a class report down to one student.
func ProjectSemester(r *reporting.SemesterReport, studentID int) (*MySemester, bool) {
	ranked := 0
	var row *reporting.StudentRow
	for i := range r.Students {
		if r.Students[i].Rank != nil {
			ranked++
		}
		if r.Students[i].ID == studentID {
			row = &r.Students[i]
		}
	}
	if row == nil {
		return nil, false
	}
	return &MySemester{
		Class:        r.Class,
		Year:         r.Year,
		Semester:     r.Semester,
		TotalCredits: r.TotalCredits,
		Courses:      r.Courses,
		Ranked:       ranked,
		Row:          *row,
	}, true
}

// ProjectYear cuts a class year report down to one student.
func ProjectYear(r *reporting.YearReport, studentID int) (*MyYear, bool) {
	ranked := 0
	var row *reporting.YearRow
	for i := range r.Students {
		if r.Students[i].Rank != nil {
			ranked++
		}
		if r.Students[i].ID == studentID {
			row = &r.Students[i]
		}
	}
	if row == nil {
		return nil, false
	}
	out := &MyYear{
		Class:        r.Class,
		Year:         r.Year,
		TotalCredits: r.TotalCredits,
		Ranked:       ranked,
		Row:          *row,
		Periods:      []MySemester{},
	}
	for i := range r.Periods {
		if p, ok := ProjectSemester(&r.Periods[i], studentID); ok {
			out.Periods = append(out.Periods, *p)
		}
	}
	return out, true
}
```

`apps/sms-api/internal/classreport/classes_repo.go`

```go
package classreport

import (
	"context"
	"database/sql"

	"github.com/pocketbase/dbx"
)

type mysqlClassResolver struct {
	db *dbx.DB
}

// NewClassResolver finds a student's class from their Moodle enrolments: the
// lowest category id among the courses they are actively enrolled in.
func NewClassResolver(db *dbx.DB) ClassResolver {
	return &mysqlClassResolver{db: db}
}

const classOfSQL = "SELECT MIN(c.category) " +
	"FROM mdl_user_enrolments ue " +
	"JOIN mdl_enrol e ON e.id = ue.enrolid " +
	"JOIN mdl_course c ON c.id = e.courseid " +
	"WHERE ue.userid = {:user} AND ue.status = 0 AND c.id <> 1"

func (r *mysqlClassResolver) ClassOf(ctx context.Context, userID int64) (int, error) {
	var category sql.NullInt64
	err := r.db.WithContext(ctx).NewQuery(classOfSQL).Bind(dbx.Params{"user": userID}).Row(&category)
	if err != nil {
		return 0, err
	}
	if !category.Valid {
		return 0, ErrNotFound
	}
	return int(category.Int64), nil
}
```

- [ ] **Step 4: Run the tests and see them pass**


Run: `gofmt -l internal/classreport && go vet ./internal/classreport/ && ENV=test encore test -count=1 -v ./internal/classreport/`
Expected: 13 tests PASS, `ok  encore.app/internal/classreport`.

- [ ] **Step 5: Commit**


```bash
git add apps/sms-api/internal/classreport
git commit -m "feat(sms-api): class report service" \
  -m "Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

### Task 8: `usrreports` Encore service and audit

**Files:**
- Create: `apps/sms-api/usrreports/reports.go`
- Modify: `apps/sms-api/audit/entities.go`, `apps/sms-api/middleware/audit.go`
- Modify: `apps/sms-web/src/components/admin/audit/options.ts`, `apps/sms-web/src/i18n/vi.json`

**Interfaces:**
- Consumes: `classreport.*` (Task 7), `conduct.RunMigrations`/`NewMySQLRepository` (Task 6).
- Produces the HTTP API (all `auth`):

| Method | Path | Roles | Body / result |
|---|---|---|---|
| GET | `/reports/classes/:categoryId/periods` | admin, manager | `PeriodsResponse` |
| GET | `/reports/classes/:categoryId/years/:year/semesters/:semester` | admin, manager | `reporting.SemesterReport` |
| GET | `/reports/classes/:categoryId/years/:year` | admin, manager | `reporting.YearReport` |
| PUT | `/reports/classes/:categoryId/conduct` | admin, manager | `{"entries":[{"studentId","year","semester","score"}]}` → `{"saved":n}`; `score: null` deletes |
| GET | `/reports/me/years/:year/semesters/:semester` | student | `classreport.MySemester` |
| GET | `/reports/me/years/:year` | student | `classreport.MyYear` |

- Errors: unknown class/period/student → `NotFound`; bad conduct entries → `InvalidArgument`; wrong role → `PermissionDenied`; anything else → `Internal` with a generic message (the cause is logged).
- The service builds its own dependencies in `initService` (own DB pool, own `mdlapi` client), like `auditlog`, so `authn`'s container is not touched. The `PUT` body is an object (`entries`), not a bare array, because Encore request bodies are structs. `PUT` is audited as `conduct.save`. There is no audit entry for the read endpoints (project rule: reads are not audited).
- Encore generates `encore.gen.go` per service; those files are git-ignored, do not add them.

- [ ] **Step 1: Create the service**


`apps/sms-api/usrreports/reports.go`

```go
// Package usrreports serves the class results reports: semester and year
// results of a class for admins and managers, and a student's own result.
package usrreports

import (
	"context"
	"errors"

	"encore.app/internal/classreport"
	"encore.app/internal/conduct"
	"encore.app/internal/config"
	"encore.app/internal/db"
	"encore.app/internal/entities"
	"encore.app/internal/logger"
	"encore.app/internal/mdlapi"
	"encore.app/internal/reporting"
	"encore.dev/beta/auth"
	"encore.dev/beta/errs"
)

//encore:service
type Service struct {
	reports *classreport.Service
}

func initService() (*Service, error) {
	cfg := config.GetConfig()

	database, err := db.New(&cfg.DatabaseConfig)
	if err != nil {
		return nil, err
	}
	if err := conduct.RunMigrations(database); err != nil {
		return nil, err
	}

	mdlApi := mdlapi.New(&cfg.MoodleApiConfig)
	return &Service{
		reports: classreport.New(
			mdlapi.NewLocalTeacherProvider(mdlApi),
			mdlapi.NewLocalCourseGradesProvider(mdlApi),
			conduct.NewMySQLRepository(database),
			classreport.NewClassResolver(database),
		),
	}, nil
}

// ── class reports (admin, manager) ───────────────────────────────────────────

// ListPeriods lists the (year, semester) pairs a class has courses in, and the
// courses that are in no period because they lack the year or semester field.
//
//encore:api auth method=GET path=/reports/classes/:categoryId/periods
func (s *Service) ListPeriods(ctx context.Context, categoryId int64) (*classreport.PeriodsResponse, error) {
	if _, err := requireStaff(); err != nil {
		return nil, err
	}
	resp, err := s.reports.Periods(ctx, int(categoryId))
	return resp, toAPIError(ctx, err)
}

// GetSemesterReport is the results of a class for one semester of one year.
//
//encore:api auth method=GET path=/reports/classes/:categoryId/years/:year/semesters/:semester
func (s *Service) GetSemesterReport(ctx context.Context, categoryId int64, year, semester int) (*reporting.SemesterReport, error) {
	if _, err := requireStaff(); err != nil {
		return nil, err
	}
	resp, err := s.reports.Semester(ctx, int(categoryId), year, semester)
	return resp, toAPIError(ctx, err)
}

// GetYearReport is the results of a class for a whole year.
//
//encore:api auth method=GET path=/reports/classes/:categoryId/years/:year
func (s *Service) GetYearReport(ctx context.Context, categoryId int64, year int) (*reporting.YearReport, error) {
	if _, err := requireStaff(); err != nil {
		return nil, err
	}
	resp, err := s.reports.Year(ctx, int(categoryId), year)
	return resp, toAPIError(ctx, err)
}

// SaveConductRequest carries rèn luyện scores. An entry without a score
// deletes the stored one.
type SaveConductRequest struct {
	Entries []conduct.Entry `json:"entries"`
}

type SaveConductResponse struct {
	Saved int `json:"saved"`
}

// SaveConduct stores rèn luyện scores (0 to 10, one decimal) of a class. All
// entries are saved or none.
//
//encore:api auth method=PUT path=/reports/classes/:categoryId/conduct
func (s *Service) SaveConduct(ctx context.Context, categoryId int64, req *SaveConductRequest) (*SaveConductResponse, error) {
	payload, err := requireStaff()
	if err != nil {
		return nil, err
	}
	if err := s.reports.SaveConduct(ctx, int(categoryId), payload.UserID, req.Entries); err != nil {
		return nil, toAPIError(ctx, err)
	}
	return &SaveConductResponse{Saved: len(req.Entries)}, nil
}

// ── a student's own result ───────────────────────────────────────────────────

// GetMySemesterResult is the caller's own result and rank for a semester.
//
//encore:api auth method=GET path=/reports/me/years/:year/semesters/:semester
func (s *Service) GetMySemesterResult(ctx context.Context, year, semester int) (*classreport.MySemester, error) {
	payload, err := requireStudent()
	if err != nil {
		return nil, err
	}
	resp, err := s.reports.MySemester(ctx, payload.UserID, year, semester)
	return resp, toAPIError(ctx, err)
}

// GetMyYearResult is the caller's own result and rank for a year.
//
//encore:api auth method=GET path=/reports/me/years/:year
func (s *Service) GetMyYearResult(ctx context.Context, year int) (*classreport.MyYear, error) {
	payload, err := requireStudent()
	if err != nil {
		return nil, err
	}
	resp, err := s.reports.MyYear(ctx, payload.UserID, year)
	return resp, toAPIError(ctx, err)
}

// ── helpers ──────────────────────────────────────────────────────────────────

func tokenPayload() (*entities.TokenPayload, error) {
	payload, ok := auth.Data().(*entities.TokenPayload)
	if !ok || payload == nil {
		return nil, &errs.Error{Code: errs.Unauthenticated, Message: "not authenticated"}
	}
	return payload, nil
}

func requireStaff() (*entities.TokenPayload, error) {
	payload, err := tokenPayload()
	if err != nil {
		return nil, err
	}
	if payload.Role != entities.RoleAdmin && payload.Role != entities.RoleManager {
		return nil, &errs.Error{Code: errs.PermissionDenied, Message: "admin or manager role required"}
	}
	return payload, nil
}

func requireStudent() (*entities.TokenPayload, error) {
	payload, err := tokenPayload()
	if err != nil {
		return nil, err
	}
	if payload.Role != entities.RoleStudent {
		return nil, &errs.Error{Code: errs.PermissionDenied, Message: "student role required"}
	}
	return payload, nil
}

// toAPIError maps the service errors to API errors and logs the unexpected
// ones. A nil error stays nil.
func toAPIError(ctx context.Context, err error) error {
	switch {
	case err == nil:
		return nil
	case errors.Is(err, classreport.ErrNotFound):
		return &errs.Error{Code: errs.NotFound, Message: err.Error()}
	case errors.Is(err, conduct.ErrInvalid):
		return &errs.Error{Code: errs.InvalidArgument, Message: err.Error()}
	default:
		logger.ErrorContext(ctx, "reports: request failed", "err", err)
		return &errs.Error{Code: errs.Internal, Message: "could not build the report"}
	}
}
```

- [ ] **Step 2: Add the audit event**


Apply these diffs:

```diff
diff --git a/apps/sms-api/audit/entities.go b/apps/sms-api/audit/entities.go
index 39b40a8..69f70aa 100644
--- a/apps/sms-api/audit/entities.go
+++ b/apps/sms-api/audit/entities.go
@@ -48,6 +48,10 @@ const (
 	// ── Audit log management ──────────────────────────────────────────────────
 	// Admin manually purges old audit log entries via the REST endpoint.
 	EventAuditPurge EventType = "audit.purge"
+
+	// ── Conduct scores ────────────────────────────────────────────────────────
+	// Admin / manager saves rèn luyện scores of a class.
+	EventSaveConduct EventType = "conduct.save"
 )
 
 // Outcome describes whether an operation succeeded, failed, or was denied.
@@ -144,7 +148,8 @@ func (r *ListRequest) Validate() error {
 			EventDeleteTemplate,
 			EventSetLangPack,
 			EventDeleteLangPack,
-			EventAuditPurge:
+			EventAuditPurge,
+			EventSaveConduct:
 			// valid
 		default:
 			return fmt.Errorf("invalid event_type: %q", r.EventType)
```

```diff
diff --git a/apps/sms-api/middleware/audit.go b/apps/sms-api/middleware/audit.go
index be839a0..4fa8693 100644
--- a/apps/sms-api/middleware/audit.go
+++ b/apps/sms-api/middleware/audit.go
@@ -49,6 +49,10 @@ var auditWhitelist = map[string]audit.EventType{
 	// Admin removes the custom pack and reverts all users to defaults.
 	"appconfig.DeleteLangPack": audit.EventDeleteLangPack,
 
+	// ── Conduct scores ────────────────────────────────────────────────────
+	// Admin / manager enters or changes rèn luyện scores of a class.
+	"usrreports.SaveConduct": audit.EventSaveConduct,
+
 	// ── Audit log management ──────────────────────────────────────────────
 	// Admin manually triggers a purge of old audit entries.
 	"auditlog.PurgeAuditLogs": audit.EventAuditPurge,
```

- [ ] **Step 3: Show the new event in the audit filter (web)**


In `apps/sms-web/src/components/admin/audit/options.ts`, add after the `audit.purge` line (add a comma to the previous line):

```ts
	{ value: 'audit.purge', labelKey: 'audit.eventTypes.audit.purge' },
	{ value: 'conduct.save', labelKey: 'audit.eventTypes.conduct.save' }
```

In `apps/sms-web/src/i18n/vi.json`, inside `audit.eventTypes` after `"audit.purge": "Xóa nhật ký"` (add a comma):

```json
"audit.purge": "Xóa nhật ký",
"conduct.save": "Cập nhật rèn luyện"
```

- [ ] **Step 4: Compile the whole app with Encore**


Run: `gofmt -l usrreports audit middleware && encore check`
Expected: `Compiling application source code done` and no compile or parse error. Encore then starts the app and may panic at `otel.newTraceProvider` with `conflicting Schema URL` and time out on `/__encore/healthz`: that is the otel init reading the config before any service code runs and is independent of this feature. If `encore check` fails earlier, at "Analyzing service topology" or "Compiling", the service is wrong: fix it.

Then run the web audit tests if any reference the option list: `cd ../sms-web && pnpm vitest run src/components/admin/audit` (skip if there are none).

- [ ] **Step 5: Commit**


```bash
git add apps/sms-api/usrreports/reports.go apps/sms-api/audit/entities.go apps/sms-api/middleware/audit.go \
  apps/sms-web/src/components/admin/audit/options.ts apps/sms-web/src/i18n/vi.json
git commit -m "feat(sms-api): class reports API and audited conduct save" \
  -m "Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

### Task 9: Final verification against real data

**Files:** none (verification only; fix what it finds in the file that owns it).

- [ ] **Step 1: Run every backend test**


```bash
go test ./internal/reporting/ ./internal/conduct/
ENV=test encore test -count=1 ./...
```

Expected: all `ok`. Any failure that is present without this feature (compare with `git stash`) is pre-existing: report it, do not fix it here.

- [ ] **Step 2: Prepare a Moodle class**


In the dev Moodle: give the courses of one class the custom fields `year`, `semester` and `credit` (the user is adding `year`), configure `15P`/`1T`/`Thi` on their quizzes and assignments, grade a few students, leave one exam blank, and deploy the Task 5 plugin change and purge caches. Include one course with `year` left empty to see it listed under `unassigned`.

- [ ] **Step 3: Smoke test the endpoints**


Start the API (`encore run`), sign in as an admin through the web app to get a token, then:

```bash
T=<access token>; B=http://localhost:4000; C=<category id>
curl -s -H "Authorization: Bearer $T" $B/reports/classes/$C/periods | jq .
curl -s -H "Authorization: Bearer $T" $B/reports/classes/$C/years/1/semesters/1 | jq ".students[0], .summary, .warnings"
curl -s -H "Authorization: Bearer $T" $B/reports/classes/$C/years/1 | jq ".students[0], .totalCredits"
curl -s -X PUT -H "Authorization: Bearer $T" -H "Content-Type: application/json" \
  -d '{"entries":[{"studentId":<id>,"year":1,"semester":1,"score":8.5}]}' $B/reports/classes/$C/conduct
```

Check, by hand against a spreadsheet of the same grades: ĐMH of one student per course (blank exam = 0; a retake replaces the first `Thi`), the credit-weighted ĐTB, the rank with a tie, the band edges, that the conduct score shows after the `PUT` and its year value is the mean, and that `score: 11` returns 400. Then sign in as a student and check `/reports/me/years/1/semesters/1` returns only their row (no other names), and that a teacher token gets 403 on every endpoint.

Confirm the three assumptions of Task 7: module order equals course order; the category holds only its own courses; the student list has no teachers (the plugin lists users with `moodle/grade:view`, which a teacher role can also hold: if teachers appear as students, filter them by role in the plugin as a follow-up and tell the user).

- [ ] **Step 4: Report**


Report the results honestly: what matched the spreadsheet, what did not, and any assumption that turned out false. Do not commit unless the user asks.

---

## Self-Review

- **Spec coverage:** §3 domain rules → Tasks 1–4 (formula, blanks as 0, retake, six bands, credit-weighted semester and year ĐTB, competition rank, conduct labels and year mean, half-up rounding); §5 data model → Task 6; §6 API → Task 8 (the `PUT` body is `{entries: [...]}` instead of a bare array, and `score: null` deletes, both additions to the spec); Moodle `graded` flag → Task 5; access rules → Tasks 7–8 (student projection, role checks); audit → Task 8. Not in this plan by design: web pages, xlsx export, the Moodle `customgradeexport`/web calculator alignment (Plan 2), graduation classification, promotion rules, the honour-student selection rule.
- **Placeholder scan:** no TBD/TODO; every code step embeds the verified file. The PHP edits (Task 5 step 5) are given as exact lines and anchors, not run in this environment.
- **Type consistency:** `reporting` names used by `classreport` (`Class`, `Course`, `Student`, `CourseInput`, `PeriodInput`, `SemesterReport`, `YearReport`, `Warning`, `StudentRow`, `YearRow`, `BuildSemester`, `BuildYear`) match Tasks 3–4; `conduct.Entry`/`Repository` match Task 6; service method names match the endpoints in Task 8.
- **Verified while drafting:** all `reporting`, `mdlapi`, `conduct` and `classreport` code and tests in this plan were run (`go test`, `ENV=test encore test`; the conduct repository against a throwaway MariaDB) and `encore check` compiled the app with the new service.
