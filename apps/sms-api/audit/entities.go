package audit

import (
	"encoding/json"
	"fmt"
	"time"
)

// =====================
// Domain enums
// =====================

// EventType classifies a significant state-changing or security-relevant
// action in the SMS application. Only events in this list are audited —
// read-only queries (GET categories, GET courses, etc.) are intentionally
// excluded to keep the log meaningful and low-noise.
type EventType string

const (
	// ── Authentication ────────────────────────────────────────────────────────
	// Login via Moodle OAuth2 callback.
	EventLogin EventType = "auth.login"
	// Successful refresh-token exchange that issues a new access token.
	EventTokenRefresh EventType = "auth.token_refresh"
	// A request was rejected because the token was missing, invalid, or expired.
	EventAuthDenied EventType = "auth.denied"

	// ── Grades ────────────────────────────────────────────────────────────────
	// Teacher submits updated grade values for one or more students.
	EventUpdateGrades EventType = "grade.update"

	// ── Grade export ──────────────────────────────────────────────────────────
	// A grade sheet is generated and downloaded by a teacher / manager.
	EventExportGrades EventType = "export.grades"

	// ── Export templates ──────────────────────────────────────────────────────
	// Admin or manager uploads a new DOCX/XLSX export template.
	EventUploadTemplate EventType = "template.upload"
	// Admin or manager deletes an existing export template.
	EventDeleteTemplate EventType = "template.delete"

	// ── Language pack ─────────────────────────────────────────────────────────
	// Admin saves a new application-level language pack.
	EventSetLangPack EventType = "config.langpack_set"
	// Admin removes the active language pack (reverts to defaults).
	EventDeleteLangPack EventType = "config.langpack_delete"

	// ── Audit log management ──────────────────────────────────────────────────
	// Admin manually purges old audit log entries via the REST endpoint.
	EventAuditPurge EventType = "audit.purge"
)

// Outcome describes whether an operation succeeded, failed, or was denied.
type Outcome string

const (
	OutcomeSuccess Outcome = "success"
	OutcomeFailure Outcome = "failure"
	OutcomeDenied  Outcome = "denied"
)

// =====================
// Audit Entry
// =====================

// Entry is a single immutable audit log record.
type Entry struct {
	ID        string          `json:"id"         db:"id"`
	Timestamp time.Time       `json:"timestamp"  db:"timestamp"`
	EventType EventType       `json:"event_type" db:"event_type"`
	ActorID   int64           `json:"actor_id"   db:"actor_id"`
	ActorRole string          `json:"actor_role" db:"actor_role"`
	Outcome   Outcome         `json:"outcome"    db:"outcome"`
	Service   string          `json:"service"    db:"service"`
	Endpoint  string          `json:"endpoint"   db:"endpoint"`
	IPAddress string          `json:"ip_address" db:"ip_address"`
	Details   json.RawMessage `json:"details"    db:"details"`
	ErrorMsg  string          `json:"error_msg"  db:"error_msg"`
}

// =====================
// List request / response
// =====================

// ListRequest is the query shape for GET /audit/logs.
// All fields are optional filters; omitting them returns all entries.
type ListRequest struct {
	// Pagination
	Page  int `json:"page"  query:"page"`
	Limit int `json:"limit" query:"limit"`

	// Use a slice so Encore can serialise an absent value as nil.
	ActorID []int64 `json:"actor_id,omitempty" query:"actor_id"`

	// Use plain strings so Encore doesn't need to know about the custom types.
	EventType string `json:"event_type,omitempty" query:"event_type"`
	Outcome   string `json:"outcome,omitempty"    query:"outcome"`

	From time.Time `json:"from,omitempty" query:"from"`
	To   time.Time `json:"to,omitempty"   query:"to"`

	Search string `json:"search,omitempty" query:"search"`
}

// GetActorID returns the first actor_id filter value, or nil when absent.
func (r *ListRequest) GetActorID() *int64 {
	if len(r.ActorID) == 0 {
		return nil
	}
	return &r.ActorID[0]
}

// GetEventType converts the raw string to a typed EventType pointer.
func (r *ListRequest) GetEventType() *EventType {
	if r.EventType == "" {
		return nil
	}
	et := EventType(r.EventType)
	return &et
}

// GetOutcome converts the raw string to a typed Outcome pointer.
func (r *ListRequest) GetOutcome() *Outcome {
	if r.Outcome == "" {
		return nil
	}
	o := Outcome(r.Outcome)
	return &o
}

func (r *ListRequest) HasFrom() bool { return !r.From.IsZero() }
func (r *ListRequest) HasTo() bool   { return !r.To.IsZero() }

// Validate rejects unknown EventType and Outcome values early.
func (r *ListRequest) Validate() error {
	if r.EventType != "" {
		switch EventType(r.EventType) {
		case EventLogin,
			EventTokenRefresh,
			EventAuthDenied,
			EventUpdateGrades,
			EventExportGrades,
			EventUploadTemplate,
			EventDeleteTemplate,
			EventSetLangPack,
			EventDeleteLangPack,
			EventAuditPurge:
			// valid
		default:
			return fmt.Errorf("invalid event_type: %q", r.EventType)
		}
	}

	if r.Outcome != "" {
		switch Outcome(r.Outcome) {
		case OutcomeSuccess, OutcomeFailure, OutcomeDenied:
			// valid
		default:
			return fmt.Errorf("invalid outcome: %q", r.Outcome)
		}
	}

	return nil
}

// =====================
// Responses
// =====================

type ListResponse struct {
	Data       []Entry `json:"data"`
	Total      int64   `json:"total"`
	Page       int     `json:"page"`
	Limit      int     `json:"limit"`
	TotalPages int     `json:"total_pages"`
}

type StatsResponse struct {
	TotalEvents   int64            `json:"total_events"`
	TodayEvents   int64            `json:"today_events"`
	FailureCount  int64            `json:"failure_count"`
	DeniedCount   int64            `json:"denied_count"`
	TopEventTypes []EventTypeCount `json:"top_event_types"`
	RecentActors  []ActorActivity  `json:"recent_actors"`
}

type EventTypeCount struct {
	EventType EventType `json:"event_type" db:"event_type"`
	Count     int64     `json:"count"      db:"cnt"`
}

type ActorActivity struct {
	ActorID   int64  `json:"actor_id"   db:"actor_id"`
	ActorRole string `json:"actor_role" db:"actor_role"`
	Count     int64  `json:"count"      db:"cnt"`
}
