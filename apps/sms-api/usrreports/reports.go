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
