package categories

import (
	"context"

	"encore.app/internal/entities"
)

type Repository interface {
	Find(
		context.Context,
		*entities.GetUsersCategoriesRequest,
	) (*entities.GetUsersCategoriesResponse, error)
}
