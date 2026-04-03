package audit

import (
	"embed"
	"errors"
	"fmt"

	"encore.app/internal/logger"
	"github.com/golang-migrate/migrate/v4"
	"github.com/golang-migrate/migrate/v4/database/mysql"
	"github.com/golang-migrate/migrate/v4/source/iofs"
	dbxlib "github.com/pocketbase/dbx"
)

// migrations is embedded from the sub-directory alongside this file.
// go:embed only allows paths within the same module tree — no ../
//
//go:embed migrations/*.sql
var migrationFiles embed.FS

// RunMigrations applies all pending UP migrations for the audit log table.
// It is safe to call on every service startup — golang-migrate is idempotent.
func RunMigrations(db *dbxlib.DB) error {
	// Extract the underlying *sql.DB from dbx.
	sqlDB := db.DB()

	driver, err := mysql.WithInstance(sqlDB, &mysql.Config{
		// Dedicated tracking table — keeps audit migrations separate from
		// any schema migration tooling Moodle itself may use.
		MigrationsTable: "sms_schema_migrations",
	})
	if err != nil {
		return fmt.Errorf("audit: migrate driver: %w", err)
	}

	// "migrations" must match the directory name inside the embed.FS.
	src, err := iofs.New(migrationFiles, "migrations")
	if err != nil {
		return fmt.Errorf("audit: migrate source: %w", err)
	}

	m, err := migrate.NewWithInstance("iofs", src, "mysql", driver)
	if err != nil {
		return fmt.Errorf("audit: migrate instance: %w", err)
	}

	if err := m.Up(); err != nil && !errors.Is(err, migrate.ErrNoChange) {
		return fmt.Errorf("audit: migrate up: %w", err)
	}

	logger.Info("audit: migrations applied successfully")
	return nil
}
