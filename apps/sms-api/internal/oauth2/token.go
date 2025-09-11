package oauth2

import (
	"context"

	"encore.app/internal/entities"
)

type VerifyRequest struct {
	TokenStr string
	Secret   string
}

type TokenProvider interface {
	GenTokens(context.Context, *entities.TokenPayload) (*entities.CallbackResponse, error)
	Verify(context.Context, *VerifyRequest) (*entities.TokenPayload, error)
}
