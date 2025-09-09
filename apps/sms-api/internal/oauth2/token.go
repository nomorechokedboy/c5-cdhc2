package oauth2

import (
	"context"

	"encore.app/internal/entities"
)

type TokenProvider interface {
	GenTokens(context.Context, *entities.TokenPayload) (*entities.CallbackResponse, error)
}
