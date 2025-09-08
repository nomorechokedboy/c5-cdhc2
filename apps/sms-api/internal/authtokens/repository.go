package authtokens

import (
	"context"

	"encore.app/internal/entities"
)

type Repository interface {
	FindOne(context.Context, *entities.MoodleOauth2AccessToken) error
}
