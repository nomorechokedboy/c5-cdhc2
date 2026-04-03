package audit

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"encore.app/internal/helper"
	"encore.app/internal/logger"
)

const (
	channelSize   = 4096
	mysqlWorkers  = 4
	workerTimeout = 5 * time.Second
	// maxRetries is how many times a failed INSERT is retried before dropping.
	maxRetries = 1
)

// Logger is the facade callers use throughout the SMS application.
// All writes are non-blocking — entries are queued and flushed by background
// goroutines so the request path is never blocked by DB latency.
type Logger struct {
	repo    Repository
	queue   chan *Entry
	quit    chan struct{}
	service string
}

// NewLogger starts background MySQL workers and returns a ready Logger.
func NewLogger(repo Repository, service string) *Logger {
	al := &Logger{
		repo:    repo,
		queue:   make(chan *Entry, channelSize),
		quit:    make(chan struct{}),
		service: service,
	}
	for i := 0; i < mysqlWorkers; i++ {
		go al.worker()
	}
	return al
}

// Shutdown drains any remaining queue entries with a hard 5-second deadline,
// then returns. Call this from the Encore service Shutdown hook.
func (al *Logger) Shutdown(ctx context.Context) {
	close(al.quit)
	deadline := time.After(5 * time.Second)
	for {
		select {
		case e := <-al.queue:
			saveCtx, cancel := context.WithTimeout(context.Background(), workerTimeout)
			if err := al.repo.Save(saveCtx, e); err != nil {
				logger.ErrorContext(saveCtx, "audit: shutdown flush error", "err", err, "id", e.ID)
			}
			cancel()
		case <-deadline:
			return
		default:
			return
		}
	}
}

// ── Public logging API ────────────────────────────────────────────────────────

// Log queues an audit entry asynchronously. It never blocks the caller.
// If the channel is full (buffer of 4096) the entry is dropped and a warning
// is emitted — audit logging must never degrade the user-facing request path.
func (al *Logger) Log(
	ctx context.Context,
	event EventType,
	actorID int64,
	actorRole string,
	outcome Outcome,
	endpoint string,
	details any,
	errMsg string,
) {
	var raw json.RawMessage
	if details != nil {
		if b, err := json.Marshal(details); err == nil {
			raw = b
		}
	}

	entry := &Entry{
		ID:        helper.UUIDStr(),
		Timestamp: time.Now().UTC(),
		EventType: event,
		ActorID:   actorID,
		ActorRole: actorRole,
		Outcome:   outcome,
		Service:   al.service,
		Endpoint:  endpoint,
		Details:   raw,
		ErrorMsg:  errMsg,
	}

	select {
	case al.queue <- entry:
	default:
		logger.Warn("audit: channel full, dropping entry",
			"event_type", string(event),
			"actor_id", fmt.Sprint(actorID),
		)
	}
}

// LogSuccess is a convenience wrapper for successful operations.
func (al *Logger) LogSuccess(
	ctx context.Context,
	event EventType,
	actorID int64,
	actorRole, endpoint string,
	details any,
) {
	al.Log(ctx, event, actorID, actorRole, OutcomeSuccess, endpoint, details, "")
}

// LogFailure is a convenience wrapper for failed operations.
func (al *Logger) LogFailure(
	ctx context.Context,
	event EventType,
	actorID int64,
	actorRole, endpoint string,
	details any,
	err error,
) {
	msg := ""
	if err != nil {
		msg = err.Error()
	}
	al.Log(ctx, event, actorID, actorRole, OutcomeFailure, endpoint, details, msg)
}

// LogDenied is a convenience wrapper for authorisation denials.
func (al *Logger) LogDenied(
	ctx context.Context,
	event EventType,
	actorID int64,
	actorRole, endpoint string,
) {
	al.Log(ctx, event, actorID, actorRole, OutcomeDenied, endpoint, nil, "permission denied")
}

// ── background worker ─────────────────────────────────────────────────────────

func (al *Logger) worker() {
	for {
		select {
		case entry, ok := <-al.queue:
			if !ok {
				return
			}
			al.saveWithRetry(entry)
		case <-al.quit:
			return
		}
	}
}

func (al *Logger) saveWithRetry(entry *Entry) {
	for attempt := 0; attempt <= maxRetries; attempt++ {
		ctx, cancel := context.WithTimeout(context.Background(), workerTimeout)
		err := al.repo.Save(ctx, entry)
		cancel()

		if err == nil {
			return
		}
		logger.Error("audit: save error",
			"err", err,
			"id", entry.ID,
			"attempt", attempt+1,
		)
		if attempt < maxRetries {
			time.Sleep(200 * time.Millisecond)
		}
	}
	logger.Error("audit: dropping entry after retries", "id", entry.ID)
}
