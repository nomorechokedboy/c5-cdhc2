package authn

import (
	"context"

	"encore.app/internal/entities"
	"encore.app/internal/logger"
	"encore.dev/beta/auth"
	"encore.dev/beta/errs"
)

// AuthHandler can be named whatever you prefer (but must be exported).
//
//encore:authhandler
func AuthHandler(ctx context.Context, token string) (auth.UID, *entities.TokenPayload, error) {
	token = strings.TrimPrefix(token, "Bearer ")

	if token == "" {
		return "", nil, &errs.Error{
			Code:    errs.Unauthenticated,
			Message: "no token provided",
		}
	}

	// Verify the token using your auth controller equivalent
	payload, err := container.GetController().VerifyAccessToken(ctx, token)
	if err != nil {
		logger.ErrorContext(ctx, "authHandler error", "error", err)
		return "", nil, &errs.Error{Code: errs.Unauthenticated, Message: "Invalid token"}
	}

	/* // Check token type
	if payload.Type != "access" {
		err := errors.New("invalid token type")
		rlog.Error("authHandler error", "error", err)
		return "", &errs.Error{
			Code:    errs.Unauthenticated,
			Message: "invalid token type",
		}
	} */

	return auth.UID(payload.UserID), payload, nil
}

type OAuth2CallbackRequest struct {
	State string `json:"state" query:"state"`
	Code  string `json:"code"  query:"code"`
}

// Oauth2 callback endpoint
//
//encore:api public method=GET path=/oauth2/callback
func OAuth2Callback(
	ctx context.Context,
	req *OAuth2CallbackRequest,
) (*entities.HttpCallbackResponse, error) {
	return container.GetController().HandleCallback(ctx, req)
}
