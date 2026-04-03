package audit

import (
	"encoding/json"
	"fmt"
	"time"
)

// =====================
// Domain enums (UNCHANGED)
// =====================

type EventType string

const (
	EventLogin           EventType = "auth.login"
	EventTokenRefresh    EventType = "auth.token_refresh"
	EventGetUserInfo     EventType = "user.get_info"
	EventGetCategories   EventType = "category.list"
	EventGetCourses      EventType = "course.list"
	EventGetCourseDetail EventType = "course.get_detail"
	EventUpdateGrades    EventType = "grade.update"
	EventGetUserGrades   EventType = "grade.get_user"
	EventSetLangPack     EventType = "config.langpack_set"
	EventDeleteLangPack  EventType = "config.langpack_delete"
	EventGetLangPack     EventType = "config.langpack_get"
	EventAdminAction     EventType = "admin.action"
	EventAuditPurge      EventType = "audit.purge"
)

type Outcome string

const (
	OutcomeSuccess Outcome = "success"
	OutcomeFailure Outcome = "failure"
	OutcomeDenied  Outcome = "denied"
)

// =====================
// Audit Entry (UNCHANGED)
// =====================

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
// REQUEST (FIXED)
// =====================

type ListRequest struct {
	// Pagination
	Page  int `json:"page"  query:"page"`
	Limit int `json:"limit" query:"limit"`

	// ✅ Use slice to represent optional
	ActorID []int64 `json:"actor_id,omitempty" query:"actor_id"`

	// ✅ Use string instead of custom type
	EventType string `json:"event_type,omitempty" query:"event_type"`
	Outcome   string `json:"outcome,omitempty"    query:"outcome"`

	From time.Time `json:"from,omitempty" query:"from"`
	To   time.Time `json:"to,omitempty"   query:"to"`

	Search string `json:"search,omitempty" query:"search"`
}

// =====================
// HELPERS (IMPORTANT)
// =====================

// Optional ActorID
func (r *ListRequest) GetActorID() *int64 {
	if len(r.ActorID) == 0 {
		return nil
	}
	return &r.ActorID[0]
}

// Optional EventType (convert to domain type)
func (r *ListRequest) GetEventType() *EventType {
	if r.EventType == "" {
		return nil
	}
	et := EventType(r.EventType)
	return &et
}

// Optional Outcome (convert to domain type)
func (r *ListRequest) GetOutcome() *Outcome {
	if r.Outcome == "" {
		return nil
	}
	o := Outcome(r.Outcome)
	return &o
}

// Optional time filters
func (r *ListRequest) HasFrom() bool {
	return !r.From.IsZero()
}

func (r *ListRequest) HasTo() bool {
	return !r.To.IsZero()
}

// =====================
// VALIDATION (OPTIONAL BUT RECOMMENDED)
// =====================

func (r *ListRequest) Validate() error {
	// Validate EventType
	if r.EventType != "" {
		switch EventType(r.EventType) {
		case EventLogin,
			EventTokenRefresh,
			EventGetUserInfo,
			EventGetCategories,
			EventGetCourses,
			EventGetCourseDetail,
			EventUpdateGrades,
			EventGetUserGrades,
			EventSetLangPack,
			EventDeleteLangPack,
			EventGetLangPack,
			EventAdminAction,
			EventAuditPurge:
			// valid
		default:
			return fmt.Errorf("invalid event_type")
		}
	}

	// Validate Outcome
	if r.Outcome != "" {
		switch Outcome(r.Outcome) {
		case OutcomeSuccess, OutcomeFailure, OutcomeDenied:
			// valid
		default:
			return fmt.Errorf("invalid outcome")
		}
	}

	return nil
}

// =====================
// RESPONSE (UNCHANGED)
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
