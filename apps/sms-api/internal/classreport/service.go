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
