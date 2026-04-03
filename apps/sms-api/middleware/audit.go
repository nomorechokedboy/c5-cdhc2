package middleware

import (
	"strings"

	"encore.app/audit"
	"encore.app/internal/entities"
	"encore.dev"
	"encore.dev/beta/auth"
	"encore.dev/middleware"
)

// auditEventMap maps "Service.Endpoint" to a typed EventType.
// Routes not listed here use a generic "service.endpoint" key so nothing
// is silently missed.
var auditEventMap = map[string]audit.EventType{
	"authn.Me":                          audit.EventGetUserInfo,
	"authn.OAuth2Callback":              audit.EventLogin,
	"authn.RefreshToken":                audit.EventTokenRefresh,
	"usrcategories.GetCategories":       audit.EventGetCategories,
	"usrcategories.GetCategoryCourses":  audit.EventGetCourses,
	"usrcourses.GetCourses":             audit.EventGetCourses,
	"usrcourses.GetCourseDetails":       audit.EventGetCourseDetail,
	"usrcourses.UpdateCourseGrades":     audit.EventUpdateGrades,
	"usrgrades.GetUserGrades":           audit.EventGetUserGrades,
	"appconfig.SetLangPack":             audit.EventSetLangPack,
	"appconfig.DeleteLangPack":          audit.EventDeleteLangPack,
	"appconfig.GetLangPack":             audit.EventGetLangPack,
	"auditlog.PurgeAuditLogs":           audit.EventAuditPurge,
}

// skipServices are noisy infrastructure services that should not be audited.
var skipServices = map[string]bool{
	"healthz":  true,
	"otlp":     true,
}

// auditLoggerProvider is set by the auditlog service on startup, avoiding a
// circular import between middleware ↔ auditlog.
var auditLoggerProvider func() *audit.Logger

// SetAuditLoggerProvider is called once by auditlog.initService so the
// middleware can resolve the logger without a direct import.
func SetAuditLoggerProvider(fn func() *audit.Logger) {
	auditLoggerProvider = fn
}

// AuditMiddleware intercepts every API call and emits an audit entry.
// It always calls next(req) first so the outcome (success / failure / denied)
// is known before the entry is written.
//
//encore:middleware global target=all
func AuditMiddleware(req middleware.Request, next middleware.Next) middleware.Response {
	encoreReq := encore.CurrentRequest()

	// Only audit actual API calls; skip internal Encore machinery.
	if encoreReq.Type != encore.APICall {
		return next(req)
	}

	// Skip noisy infrastructure services.
	if skipServices[encoreReq.Service] {
		return next(req)
	}

	// Guard against the auditlog service not yet being initialised.
	if auditLoggerProvider == nil {
		return next(req)
	}
	al := auditLoggerProvider()
	if al == nil {
		return next(req)
	}

	// Execute the handler first — we need the outcome.
	resp := next(req)

	// Resolve actor from the JWT payload injected by Encore's auth handler.
	var actorID int64
	var actorRole string
	if payload, ok := auth.Data().(*entities.TokenPayload); ok && payload != nil {
		actorID = payload.UserID
		actorRole = payload.Role
	}

	// Map to a typed event or fall back to a generic "service.endpoint" key.
	routeKey := encoreReq.Service + "." + encoreReq.Endpoint
	eventType, ok := auditEventMap[routeKey]
	if !ok {
		eventType = audit.EventType(
			strings.ToLower(encoreReq.Service) + "." +
				strings.ToLower(encoreReq.Endpoint),
		)
	}

	endpoint := encoreReq.Method + " " + encoreReq.Path

	// Determine outcome from the response error, if any.
	outcome := audit.OutcomeSuccess
	errMsg := ""
	if resp.Err != nil {
		errMsg = resp.Err.Error()
		if strings.Contains(errMsg, "permission_denied") ||
			strings.Contains(errMsg, "unauthenticated") {
			outcome = audit.OutcomeDenied
		} else {
			outcome = audit.OutcomeFailure
		}
	}

	al.Log(req.Context(), eventType, actorID, actorRole, outcome, endpoint, nil, errMsg)

	return resp
}
