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
