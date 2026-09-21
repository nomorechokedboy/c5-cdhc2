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
