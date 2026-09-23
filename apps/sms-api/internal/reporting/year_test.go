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
