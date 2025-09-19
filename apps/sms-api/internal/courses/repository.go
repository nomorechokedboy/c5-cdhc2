package courses

import (
	"context"

	"encore.app/internal/entities"
)

type Repository interface {
	Find(
		context.Context,
		*entities.GetUsersCoursesRequest,
	) (*entities.GetUsersCoursesResponse, error)
}
