package oauth2

import (
	"context"

	"encore.app/internal/entities"
)

type OAuth2Provider interface {
	GetAuthURL(state string) string
	ExchangeCodeForToken(ctx context.Context, code string) (*entities.OAuth2Token, error)
}
