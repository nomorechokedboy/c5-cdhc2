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
