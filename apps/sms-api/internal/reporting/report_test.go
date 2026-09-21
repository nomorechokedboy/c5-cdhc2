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
