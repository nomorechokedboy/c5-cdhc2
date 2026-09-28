package classreport

import (
	"time"

	"encore.app/internal/mdlapi"
	"encore.app/internal/reporting"
)

// Names of the Moodle course custom fields the reports read. Year is no
// longer one of them: it is derived from the course's Moodle start date
// instead of a separate customfield.
const (
	fieldCredit   = "credit"
	fieldSemester = "semester"
)

// courseMeta is a category course with its custom fields (and derived year)
// read out.
type courseMeta struct {
	course   mdlapi.CategoryCourse
	credits  int
	year     int
	semester int
}

func readMeta(c mdlapi.CategoryCourse) courseMeta {
	m := courseMeta{course: c}
	if c.Startdate > 0 {
		m.year = time.Unix(int64(c.Startdate), 0).Year()
	}
	for _, f := range c.Metadata {
		switch f.Name {
		case fieldCredit:
			m.credits = f.Value
		case fieldSemester:
			m.semester = f.Value
		}
	}
	return m
}

// assigned reports whether the course belongs to a period: a usable start
// date (to derive the year) and a semester customfield.
func (m courseMeta) assigned() bool { return m.year > 0 && m.semester > 0 }

func (m courseMeta) missing() []string {
	var out []string
	if m.year <= 0 {
		out = append(out, "year")
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
			list = append(
				list,
				reporting.Item{Type: m.typ, Grade: g.Grade, Graded: found && g.IsGraded()},
			)
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
			students = append(
				students,
				reporting.Student{ID: st.ID, IDNumber: studentNumber(st), FullName: st.Fullname},
			)
		}
	}
	return students
}
