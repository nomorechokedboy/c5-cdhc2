package authn

import (
	"context"

	"encore.app/internal/entities"
)

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
