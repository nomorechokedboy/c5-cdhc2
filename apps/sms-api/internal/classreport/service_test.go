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
