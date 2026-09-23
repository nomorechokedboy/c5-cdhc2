package conduct

import (
	"embed"
	"errors"
	"fmt"

	"github.com/golang-migrate/migrate/v4"
	"github.com/golang-migrate/migrate/v4/database/mysql"
	"github.com/golang-migrate/migrate/v4/source/iofs"
	dbxlib "github.com/pocketbase/dbx"
)

//go:embed migrations/*.sql
var migrationFiles embed.FS

// RunMigrations creates the conduct table. It tracks its own version in
// sms_conduct_schema_migrations so it never collides with the audit
// migrations, which use sms_schema_migrations. Safe to run on every start.
func RunMigrations(db *dbxlib.DB) error {
	driver, err := mysql.WithInstance(db.DB(), &mysql.Config{
		MigrationsTable: "sms_conduct_schema_migrations",
	})
	if err != nil {
		return fmt.Errorf("conduct: migrate driver: %w", err)
	}
	src, err := iofs.New(migrationFiles, "migrations")
	if err != nil {
		return fmt.Errorf("conduct: migrate source: %w", err)
	}
	m, err := migrate.NewWithInstance("iofs", src, "mysql", driver)
	if err != nil {
		return fmt.Errorf("conduct: migrate instance: %w", err)
	}
	if err := m.Up(); err != nil && !errors.Is(err, migrate.ErrNoChange) {
		return fmt.Errorf("conduct: migrate up: %w", err)
	}
	return nil
}
