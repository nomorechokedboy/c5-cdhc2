package users

import (
	"context"

	"encore.app/internal/entities"
)

type Repository interface {
	FindOne(context.Context, *entities.MoodleUser) error
}
