package middleware

import (
	"strings"

	"encore.app/audit"
	"encore.app/internal/entities"
	"encore.dev"
	"encore.dev/beta/auth"
	"encore.dev/middleware"
)

// auditWhitelist is the single source of truth for what gets audited.
//
// Key format: "ServiceName.EndpointName" (matches encore.CurrentRequest().Service
// and .Endpoint exactly — case-sensitive).
//
// Only meaningful write operations and security-relevant events appear here.
// Read-only endpoints (GET categories, GET courses, GET grades, health-checks,
// etc.) are intentionally absent — they produce no state change and would
// flood the log with noise.
//
// To add a new audited route: append one line here and, if a new EventType is
// needed, add the constant to audit/entities.go.
var auditWhitelist = map[string]audit.EventType{
	// ── Authentication ────────────────────────────────────────────────────
	// OAuth2 callback completes the login flow and issues JWT tokens.
	"authn.OAuth2Callback": audit.EventLogin,
	// Refresh-token exchange — user effectively re-authenticates silently.
	"authn.RefreshToken": audit.EventTokenRefresh,

	// ── Grade mutations ───────────────────────────────────────────────────
	// Teacher writes updated scores for one or more students.
	"usrcourses.UpdateCourseGrades": audit.EventUpdateGrades,

	// ── Grade export ──────────────────────────────────────────────────────
	// Teacher / manager generates and downloads a grade sheet.
	"usrexport.ExportCourseGrades": audit.EventExportGrades,

	// ── Export template management ────────────────────────────────────────
	// Admin / manager uploads a DOCX/XLSX template.
	"usrexport.UploadExportTemplate": audit.EventUploadTemplate,
	// Admin / manager removes an existing template.
	"usrexport.DeleteExportTemplate": audit.EventDeleteTemplate,

	// ── Language pack management ──────────────────────────────────────────
	// Admin installs or replaces the app-level UI language pack.
	"appconfig.SetLangPack": audit.EventSetLangPack,
	// Admin removes the custom pack and reverts all users to defaults.
	"appconfig.DeleteLangPack": audit.EventDeleteLangPack,

	// ── Audit log management ──────────────────────────────────────────────
	// Admin manually triggers a purge of old audit entries.
	"auditlog.PurgeAuditLogs": audit.EventAuditPurge,
}

// auditLoggerProvider is wired in by auditlog.initService to avoid a circular
// import between the middleware package and the auditlog service package.
var auditLoggerProvider func() *audit.Logger

// SetAuditLoggerProvider is called once during auditlog service initialisation.
func SetAuditLoggerProvider(fn func() *audit.Logger) {
	auditLoggerProvider = fn
}

// AuditMiddleware is a whitelist-only audit interceptor.
//
// It runs after next(req) so it always knows the final outcome before writing.
// Requests whose "Service.Endpoint" key is not in auditWhitelist pass through
// without any logging — no fallback generic events are created.
//
// Special case: any request that returns an unauthenticated / permission-denied
// error on a *whitelisted* route is recorded as OutcomeDenied, which gives
// security teams visibility into failed access attempts on sensitive operations.
//
//encore:middleware global target=all
func AuditMiddleware(req middleware.Request, next middleware.Next) middleware.Response {
	encoreReq := encore.CurrentRequest()

	// Only intercept real API calls — skip Encore-internal pub/sub, cron, etc.
	if encoreReq.Type != encore.APICall {
		return next(req)
	}

	// Fast-path: skip immediately if this route is not whitelisted.
	// This is the primary gate — the vast majority of requests exit here.
	routeKey := encoreReq.Service + "." + encoreReq.Endpoint
	eventType, shouldAudit := auditWhitelist[routeKey]
	if !shouldAudit {
		return next(req)
	}

	// Guard against the auditlog service not yet being initialised (e.g. during
	// startup before initService completes). In that window the request still
	// succeeds — we just can't write an audit record.
	if auditLoggerProvider == nil {
		return next(req)
	}
	al := auditLoggerProvider()
	if al == nil {
		return next(req)
	}

	// Execute the handler. We need the response before we can determine outcome.
	resp := next(req)

	// Resolve the authenticated actor. On public endpoints like OAuth2Callback
	// the payload will be nil — actorID stays 0 and actorRole stays "".
	var actorID int64
	var actorRole string
	if payload, ok := auth.Data().(*entities.TokenPayload); ok && payload != nil {
		actorID = payload.UserID
		actorRole = payload.Role
	}

	endpoint := encoreReq.Method + " " + encoreReq.Path

	// Classify the outcome.
	outcome := audit.OutcomeSuccess
	errMsg := ""
	if resp.Err != nil {
		errMsg = resp.Err.Error()
		// Encore encodes auth failures as "unauthenticated" or "permission_denied"
		// inside the error message string.
		if strings.Contains(errMsg, "permission_denied") ||
			strings.Contains(errMsg, "unauthenticated") {
			outcome = audit.OutcomeDenied
		} else {
			outcome = audit.OutcomeFailure
		}
	}

	// Write the entry asynchronously — never blocks the request path.
	al.Log(req.Context(), eventType, actorID, actorRole, outcome, endpoint, nil, errMsg)

	return resp
}
