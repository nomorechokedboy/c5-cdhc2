package appconfig

import (
	"context"
	"encoding/json"

	"encore.app/internal/cache"
	"encore.app/internal/config"
	"encore.app/internal/entities"
	"encore.app/internal/logger"
	"encore.dev/beta/auth"
	"encore.dev/beta/errs"
	"github.com/redis/go-redis/v9"
)

const langPackKey = "app:langpack"

var rdb *redis.Client

func init() {
	cfg := config.GetConfig()
	rdb = cache.New(&cfg.CacheConfig)
}

// LangPackResponse is the shape returned by GET /config/langpack.
// Pack is raw JSON so we can support arbitrary nested structures.
type LangPackResponse struct {
	Pack json.RawMessage `json:"pack"`
}

// SetLangPackRequest is the body for PUT /config/langpack.
type SetLangPackRequest struct {
	Pack json.RawMessage `json:"pack"`
}

// GetLangPack returns the current application-level language pack.
// Public so login page can use it.
//
//encore:api public method=GET path=/config/langpack
func GetLangPack(ctx context.Context) (*LangPackResponse, error) {
	val, err := rdb.Get(ctx, langPackKey).Result()
	if err == redis.Nil {
		// No pack configured → return empty JSON object
		return &LangPackResponse{Pack: json.RawMessage(`{}`)}, nil
	}
	if err != nil {
		logger.ErrorContext(ctx, "GetLangPack redis error", "err", err)
		return nil, &errs.Error{
			Code:    errs.Internal,
			Message: "failed to retrieve lang pack",
		}
	}

	return &LangPackResponse{
		Pack: json.RawMessage(val),
	}, nil
}

// SetLangPack saves a new application-level language pack. Admin only.
//
//encore:api auth method=PUT path=/config/langpack
func SetLangPack(ctx context.Context, req *SetLangPackRequest) error {
	if err := requireAdmin(ctx); err != nil {
		return err
	}

	// Validate JSON structure using map[string]any (Encore-safe internally)
	var tmp map[string]any
	if err := json.Unmarshal(req.Pack, &tmp); err != nil {
		return &errs.Error{
			Code:    errs.InvalidArgument,
			Message: "invalid JSON format",
		}
	}

	// Optional: reject empty object
	if len(tmp) == 0 {
		return &errs.Error{
			Code:    errs.InvalidArgument,
			Message: "lang pack cannot be empty",
		}
	}

	// Store raw JSON directly
	if err := rdb.Set(ctx, langPackKey, string(req.Pack), 0).Err(); err != nil {
		logger.ErrorContext(ctx, "SetLangPack redis error", "err", err)
		return &errs.Error{
			Code:    errs.Internal,
			Message: "failed to save lang pack",
		}
	}

	logger.InfoContext(ctx, "LangPack updated by admin")
	return nil
}

// DeleteLangPack removes the application-level language pack.
//
//encore:api auth method=DELETE path=/config/langpack
func DeleteLangPack(ctx context.Context) error {
	if err := requireAdmin(ctx); err != nil {
		return err
	}

	if err := rdb.Del(ctx, langPackKey).Err(); err != nil {
		logger.ErrorContext(ctx, "DeleteLangPack redis error", "err", err)
		return &errs.Error{
			Code:    errs.Internal,
			Message: "failed to delete lang pack",
		}
	}

	logger.InfoContext(ctx, "LangPack deleted by admin")
	return nil
}

// requireAdmin checks that the authenticated user has the admin role.
func requireAdmin(ctx context.Context) error {
	payload, ok := auth.Data().(*entities.TokenPayload)
	if !ok || payload == nil {
		return &errs.Error{
			Code:    errs.Unauthenticated,
			Message: "not authenticated",
		}
	}
	if payload.Role != entities.RoleAdmin {
		return &errs.Error{
			Code:    errs.PermissionDenied,
			Message: "admin role required",
		}
	}
	return nil
}
