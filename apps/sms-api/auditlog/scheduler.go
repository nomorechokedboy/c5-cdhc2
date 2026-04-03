package auditlog

import (
	"context"
	"fmt"
	"time"

	"encore.app/audit"
	"encore.app/internal/config"
	"encore.app/internal/logger"
)

// runScheduler blocks forever, waking up at the configured purge time each day
// to delete audit entries older than RetentionDays. Run it in a goroutine.
func runScheduler(cfg config.AuditConfig, repo audit.Repository, al *audit.Logger) {
	for {
		next := nextRunTime(cfg.PurgeTime)
		logger.Info("audit: scheduler waiting for next purge",
			"next_run", next.Format(time.RFC3339),
			"retention_days", cfg.RetentionDays,
		)

		select {
		case <-time.After(time.Until(next)):
			runPurge(cfg, repo, al)
		}
	}
}

// runPurge executes a single purge cycle.
func runPurge(cfg config.AuditConfig, repo audit.Repository, al *audit.Logger) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Minute)
	defer cancel()

	before := time.Now().UTC().AddDate(0, 0, -cfg.RetentionDays)
	n, err := repo.Purge(ctx, before)
	if err != nil {
		logger.ErrorContext(ctx, "audit: scheduled purge error", "err", err)
		return
	}

	logger.InfoContext(ctx, "audit: scheduled purge complete",
		"removed", n,
		"retention_days", cfg.RetentionDays,
		"cutoff", before.Format(time.RFC3339),
	)

	// Emit an audit entry for the purge itself so admins can see it happened.
	al.LogSuccess(ctx, audit.EventAuditPurge, 0, "system", "scheduler",
		map[string]any{
			"purged_count":   n,
			"retention_days": cfg.RetentionDays,
			"cutoff":         before.Format(time.RFC3339),
		},
	)
}

// nextRunTime computes the next UTC wall-clock moment matching purgeTime
// (format "HH:MM"). If that time has already passed today, it returns
// tomorrow's occurrence.
func nextRunTime(purgeTime string) time.Time {
	hour, minute := parsePurgeTime(purgeTime)
	now := time.Now().UTC()

	candidate := time.Date(
		now.Year(), now.Month(), now.Day(),
		hour, minute, 0, 0, time.UTC,
	)

	// If we're already past today's window, schedule for tomorrow.
	if !candidate.After(now) {
		candidate = candidate.Add(24 * time.Hour)
	}
	return candidate
}

// parsePurgeTime parses "HH:MM" and returns (hour, minute).
// Falls back to 02:00 on any parse error.
func parsePurgeTime(s string) (hour, minute int) {
	var h, m int
	if _, err := fmt.Sscanf(s, "%d:%d", &h, &m); err != nil {
		logger.Warn("audit: invalid AUDIT_PURGE_TIME, defaulting to 02:00", "value", s)
		return 2, 0
	}
	if h < 0 || h > 23 || m < 0 || m > 59 {
		logger.Warn("audit: AUDIT_PURGE_TIME out of range, defaulting to 02:00", "value", s)
		return 2, 0
	}
	return h, m
}
