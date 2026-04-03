package audit

import (
	"context"
	"encoding/json"
	"fmt"
	"math"
	"strings"
	"time"

	"encore.app/internal/logger"
	"github.com/pocketbase/dbx"
)

const table = "sms_audit_logs"

type mysqlRepository struct {
	db *dbx.DB
}

// NewMySQLRepository returns a Repository backed by the provided dbx connection.
func NewMySQLRepository(db *dbx.DB) Repository {
	return &mysqlRepository{db: db}
}

// ── Save ──────────────────────────────────────────────────────────────────────

func (r *mysqlRepository) Save(ctx context.Context, entry *Entry) error {
	// Nullable columns: pass nil when empty so MySQL stores NULL cleanly.
	var detailsVal, errMsgVal, ipVal interface{}
	if len(entry.Details) > 0 && string(entry.Details) != "null" {
		detailsVal = string(entry.Details)
	}
	if entry.ErrorMsg != "" {
		errMsgVal = entry.ErrorMsg
	}
	if entry.IPAddress != "" {
		ipVal = entry.IPAddress
	}

	_, err := r.db.WithContext(ctx).
		Insert(table, dbx.Params{
			"id":         entry.ID,
			"timestamp":  entry.Timestamp.UTC().Format("2006-01-02 15:04:05.000"),
			"event_type": string(entry.EventType),
			"actor_id":   entry.ActorID,
			"actor_role": entry.ActorRole,
			"outcome":    string(entry.Outcome),
			"service":    entry.Service,
			"endpoint":   entry.Endpoint,
			"ip_address": ipVal,
			"details":    detailsVal,
			"error_msg":  errMsgVal,
		}).Execute()
	if err != nil {
		return fmt.Errorf("audit: insert: %w", err)
	}
	return nil
}

// ── List ──────────────────────────────────────────────────────────────────────

func (r *mysqlRepository) List(ctx context.Context, req *ListRequest) (*ListResponse, error) {
	page := req.Page
	if page < 1 {
		page = 1
	}
	limit := req.Limit
	if limit < 1 || limit > 200 {
		limit = 50
	}

	qb := newQB()

	// Full-text search on (error_msg, details_text) using Boolean mode so
	// callers can use +/- prefix operators if needed.
	if req.Search != "" {
		qb.addFullText(req.Search)
	}

	// Structured filters — each maps to a MySQL index.
	if req.GetActorID() != nil {
		qb.addEq("actor_id", req.GetActorID())
	}
	if req.EventType != "" {
		qb.addEq("event_type", string(req.EventType))
	}
	if req.Outcome != "" {
		qb.addEq("outcome", string(req.Outcome))
	}
	if !req.From.IsZero() {
		qb.addGte("timestamp", req.From.UTC().Format("2006-01-02 15:04:05.000"))
	}
	if !req.To.IsZero() {
		qb.addLte("timestamp", req.To.UTC().Format("2006-01-02 15:04:05.000"))
	}

	where := qb.where()

	// COUNT for pagination metadata.
	var total int64
	if err := r.db.WithContext(ctx).
		NewQuery(fmt.Sprintf("SELECT COUNT(*) FROM %s %s", table, where)).
		Bind(qb.params).
		Row(&total); err != nil {
		return nil, fmt.Errorf("audit: count: %w", err)
	}

	totalPages := int(math.Ceil(float64(total) / float64(limit)))
	offset := (page - 1) * limit

	// Fetch the requested page, newest first.
	// details_text is a generated column — exclude it from SELECT to avoid
	// confusion; callers read the JSON `details` field instead.
	selectSQL := fmt.Sprintf(
		"SELECT id, timestamp, event_type, actor_id, actor_role, outcome,"+
			" service, endpoint,"+
			" COALESCE(ip_address, '') AS ip_address,"+
			" COALESCE(CAST(details AS CHAR), '') AS details,"+
			" COALESCE(error_msg, '') AS error_msg"+
			" FROM %s %s ORDER BY timestamp DESC LIMIT %d OFFSET %d",
		table, where, limit, offset,
	)

	rows := []dbxEntry{}
	if err := r.db.WithContext(ctx).
		NewQuery(selectSQL).
		Bind(qb.params).
		All(&rows); err != nil {
		return nil, fmt.Errorf("audit: select: %w", err)
	}

	entries := make([]Entry, 0, len(rows))
	for _, row := range rows {
		entries = append(entries, row.toEntry())
	}

	return &ListResponse{
		Data:       entries,
		Total:      total,
		Page:       page,
		Limit:      limit,
		TotalPages: totalPages,
	}, nil
}

// ── Stats ─────────────────────────────────────────────────────────────────────

func (r *mysqlRepository) Stats(ctx context.Context) (*StatsResponse, error) {
	var s StatsResponse

	if err := r.db.WithContext(ctx).
		NewQuery(fmt.Sprintf("SELECT COUNT(*) FROM %s", table)).
		Row(&s.TotalEvents); err != nil {
		return nil, fmt.Errorf("audit: stats total: %w", err)
	}

	today := time.Now().UTC().Truncate(24 * time.Hour).Format("2006-01-02 15:04:05.000")
	if err := r.db.WithContext(ctx).
		NewQuery(fmt.Sprintf(
			"SELECT COUNT(*) FROM %s WHERE timestamp >= {:t}", table)).
		Bind(dbx.Params{"t": today}).
		Row(&s.TodayEvents); err != nil {
		return nil, fmt.Errorf("audit: stats today: %w", err)
	}

	if err := r.db.WithContext(ctx).
		NewQuery(fmt.Sprintf(
			"SELECT COUNT(*) FROM %s WHERE outcome = 'failure'", table)).
		Row(&s.FailureCount); err != nil {
		return nil, fmt.Errorf("audit: stats failure: %w", err)
	}

	if err := r.db.WithContext(ctx).
		NewQuery(fmt.Sprintf(
			"SELECT COUNT(*) FROM %s WHERE outcome = 'denied'", table)).
		Row(&s.DeniedCount); err != nil {
		return nil, fmt.Errorf("audit: stats denied: %w", err)
	}

	if err := r.db.WithContext(ctx).
		NewQuery(fmt.Sprintf(
			"SELECT event_type, COUNT(*) AS cnt FROM %s"+
				" GROUP BY event_type ORDER BY cnt DESC LIMIT 5", table)).
		All(&s.TopEventTypes); err != nil {
		logger.ErrorContext(ctx, "audit: stats top events", "err", err)
	}

	if err := r.db.WithContext(ctx).
		NewQuery(fmt.Sprintf(
			"SELECT actor_id, actor_role, COUNT(*) AS cnt FROM %s"+
				" GROUP BY actor_id, actor_role ORDER BY cnt DESC LIMIT 5", table)).
		All(&s.RecentActors); err != nil {
		logger.ErrorContext(ctx, "audit: stats actors", "err", err)
	}

	return &s, nil
}

// ── Purge ─────────────────────────────────────────────────────────────────────

func (r *mysqlRepository) Purge(ctx context.Context, before time.Time) (int64, error) {
	res, err := r.db.WithContext(ctx).
		NewQuery(fmt.Sprintf(
			"DELETE FROM %s WHERE timestamp < {:b}", table)).
		Bind(dbx.Params{
			"b": before.UTC().Format("2006-01-02 15:04:05.000"),
		}).
		Execute()
	if err != nil {
		return 0, fmt.Errorf("audit: purge: %w", err)
	}
	n, _ := res.RowsAffected()
	return n, nil
}

// ── queryBuilder ──────────────────────────────────────────────────────────────

// queryBuilder accumulates WHERE fragments and named params for dbx.NewQuery.
// It generates unique parameter names (p0, p1, …) to avoid collisions.
type queryBuilder struct {
	parts  []string
	params dbx.Params
	idx    int
}

func newQB() *queryBuilder { return &queryBuilder{params: dbx.Params{}} }

func (q *queryBuilder) key() string {
	k := fmt.Sprintf("p%d", q.idx)
	q.idx++
	return k
}

func (q *queryBuilder) addEq(col string, val interface{}) {
	k := q.key()
	q.parts = append(q.parts, fmt.Sprintf("%s = {:%s}", col, k))
	q.params[k] = val
}

func (q *queryBuilder) addGte(col, val string) {
	k := q.key()
	q.parts = append(q.parts, fmt.Sprintf("%s >= {:%s}", col, k))
	q.params[k] = val
}

func (q *queryBuilder) addLte(col, val string) {
	k := q.key()
	q.parts = append(q.parts, fmt.Sprintf("%s <= {:%s}", col, k))
	q.params[k] = val
}

// addFullText appends a MATCH … AGAINST boolean-mode predicate.
// The search term is sanitised to prevent SQL injection — single quotes,
// double quotes and backslashes are stripped.
func (q *queryBuilder) addFullText(search string) {
	safe := sanitiseSearch(search)
	if safe == "" {
		return
	}
	k := q.key()
	q.parts = append(q.parts,
		fmt.Sprintf("MATCH(error_msg, details_text) AGAINST ({:%s} IN BOOLEAN MODE)", k))
	q.params[k] = safe
}

func (q *queryBuilder) where() string {
	if len(q.parts) == 0 {
		return ""
	}
	return "WHERE " + strings.Join(q.parts, " AND ")
}

// sanitiseSearch strips characters that could break the MySQL FULLTEXT query.
func sanitiseSearch(s string) string {
	var b strings.Builder
	for _, r := range s {
		switch r {
		case '\'', '"', '\\', ';', '\x00':
			// drop
		default:
			b.WriteRune(r)
		}
	}
	return strings.TrimSpace(b.String())
}

// ── scan type ─────────────────────────────────────────────────────────────────

type dbxEntry struct {
	ID        string    `db:"id"`
	Timestamp time.Time `db:"timestamp"`
	EventType string    `db:"event_type"`
	ActorID   int64     `db:"actor_id"`
	ActorRole string    `db:"actor_role"`
	Outcome   string    `db:"outcome"`
	Service   string    `db:"service"`
	Endpoint  string    `db:"endpoint"`
	IPAddress string    `db:"ip_address"`
	Details   string    `db:"details"`
	ErrorMsg  string    `db:"error_msg"`
}

func (e *dbxEntry) toEntry() Entry {
	entry := Entry{
		ID:        e.ID,
		Timestamp: e.Timestamp,
		EventType: EventType(e.EventType),
		ActorID:   e.ActorID,
		ActorRole: e.ActorRole,
		Outcome:   Outcome(e.Outcome),
		Service:   e.Service,
		Endpoint:  e.Endpoint,
		IPAddress: e.IPAddress,
		ErrorMsg:  e.ErrorMsg,
	}
	if e.Details != "" {
		entry.Details = json.RawMessage(e.Details)
	}
	return entry
}
