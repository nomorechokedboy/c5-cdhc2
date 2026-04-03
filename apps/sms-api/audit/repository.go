package audit

import (
	"context"
	"time"
)

// Repository is the persistence contract for audit log entries.
// The MySQL implementation satisfies this; tests can swap in a fake.
type Repository interface {
	// Save persists a single entry. Called from background worker goroutines.
	Save(ctx context.Context, entry *Entry) error

	// List returns a paginated, filtered slice of entries. When req.Search is
	// non-empty it uses FULLTEXT search on (error_msg, details_text) and may
	// be combined freely with all structured filters.
	List(ctx context.Context, req *ListRequest) (*ListResponse, error)

	// Stats returns aggregate counts for the admin dashboard.
	Stats(ctx context.Context) (*StatsResponse, error)

	// Purge deletes all entries whose timestamp is before `before`.
	// Returns the number of rows deleted.
	Purge(ctx context.Context, before time.Time) (int64, error)
}
