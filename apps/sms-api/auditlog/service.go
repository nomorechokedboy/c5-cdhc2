package auditlog

import (
	"context"
	"fmt"
	"time"

	"encore.app/audit"
	"encore.app/internal/config"
	"encore.app/internal/db"
	"encore.app/internal/entities"
	"encore.app/internal/logger"
	"encore.app/middleware"
	"encore.dev/beta/auth"
	"encore.dev/beta/errs"
)

// svc holds the singleton so the middleware provider closure can reach it.
var svc *Service

//encore:service
type Service struct {
	repo audit.Repository
	al   *audit.Logger
}

func initService() (*Service, error) {
	cfg := config.GetConfig()

	// Reuse the existing MySQL connection pool.
	database, err := db.New(&cfg.DatabaseConfig)
	if err != nil {
		return nil, err
	}

	// Apply migrations before anything else.
	if err := audit.RunMigrations(database); err != nil {
		return nil, err
	}

	repo := audit.NewMySQLRepository(database)
	al := audit.NewLogger(repo, "sms-api")

	s := &Service{repo: repo, al: al}
	svc = s

	// Wire the logger into the global audit middleware.
	middleware.SetAuditLoggerProvider(func() *audit.Logger { return svc.al })

	// Start the nightly purge scheduler.
	go runScheduler(cfg.AuditConfig, repo, al)

	return s, nil
}

func (s *Service) Shutdown(ctx context.Context) {
	s.al.Shutdown(ctx)
}

// ── Admin REST endpoints ──────────────────────────────────────────────────────

// ListAuditLogs returns a paginated, filterable list of audit log entries.
// Supports structured filters and full-text search simultaneously.
// Admin only.
//
//encore:api auth method=GET path=/audit/logs
func (s *Service) ListAuditLogs(
	ctx context.Context,
	req *audit.ListRequest,
) (*audit.ListResponse, error) {
	if err := requireAdmin(ctx); err != nil {
		return nil, err
	}
	resp, err := s.repo.List(ctx, req)
	if err != nil {
		logger.ErrorContext(ctx, "audit: list error", "err", err)
		return nil, &errs.Error{Code: errs.Internal, Message: "failed to list audit logs"}
	}
	return resp, nil
}

// GetAuditStats returns aggregate counts for the admin dashboard.
// Admin only.
//
//encore:api auth method=GET path=/audit/stats
func (s *Service) GetAuditStats(ctx context.Context) (*audit.StatsResponse, error) {
	if err := requireAdmin(ctx); err != nil {
		return nil, err
	}
	stats, err := s.repo.Stats(ctx)
	if err != nil {
		logger.ErrorContext(ctx, "audit: stats error", "err", err)
		return nil, &errs.Error{Code: errs.Internal, Message: "failed to get audit stats"}
	}
	return stats, nil
}

// PurgeRequest specifies the minimum age of logs to delete.
type PurgeRequest struct {
	// DaysOld deletes entries older than this many days. Minimum: 7.
	DaysOld int `json:"days_old"`
}

// PurgeResponse reports how many rows were removed.
type PurgeResponse struct {
	Removed int64  `json:"removed"`
	Message string `json:"message"`
}

// PurgeAuditLogs deletes audit entries older than DaysOld days.
// Admin only.
//
//encore:api auth method=DELETE path=/audit/logs
func (s *Service) PurgeAuditLogs(
	ctx context.Context,
	req *PurgeRequest,
) (*PurgeResponse, error) {
	if err := requireAdmin(ctx); err != nil {
		return nil, err
	}
	if req.DaysOld < 7 {
		return nil, &errs.Error{
			Code:    errs.InvalidArgument,
			Message: "days_old must be at least 7",
		}
	}

	before := time.Now().UTC().AddDate(0, 0, -req.DaysOld)
	n, err := s.repo.Purge(ctx, before)
	if err != nil {
		return nil, &errs.Error{Code: errs.Internal, Message: "purge failed"}
	}

	// Audit the purge itself.
	s.al.LogSuccess(ctx, audit.EventAuditPurge,
		actorID(ctx), actorRole(ctx),
		"DELETE /audit/logs",
		map[string]any{"purged_count": n, "days_old": req.DaysOld},
	)

	logger.InfoContext(ctx, "audit: manual purge complete",
		"removed", n, "days_old", req.DaysOld)

	return &PurgeResponse{
		Removed: n,
		Message: fmt.Sprintf("purged %d entries older than %d days", n, req.DaysOld),
	}, nil
}

// ── helpers ───────────────────────────────────────────────────────────────────

func requireAdmin(ctx context.Context) error {
	payload, ok := auth.Data().(*entities.TokenPayload)
	if !ok || payload == nil {
		return &errs.Error{Code: errs.Unauthenticated, Message: "not authenticated"}
	}
	if payload.Role != entities.RoleAdmin {
		return &errs.Error{Code: errs.PermissionDenied, Message: "admin role required"}
	}
	return nil
}

func actorID(ctx context.Context) int64 {
	if p, ok := auth.Data().(*entities.TokenPayload); ok && p != nil {
		return p.UserID
	}
	return 0
}

func actorRole(ctx context.Context) string {
	if p, ok := auth.Data().(*entities.TokenPayload); ok && p != nil {
		return p.Role
	}
	return ""
}
