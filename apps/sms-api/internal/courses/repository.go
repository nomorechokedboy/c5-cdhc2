package courses

import (
	"context"

	"encore.app/internal/entities"
)

type Repository interface {
	Find(
		context.Context,
		*entities.GetUsersCoursesParams,
	) (*entities.GetUsersCoursesResponse, error)
	FindOne(context.Context, *entities.FindOneCourseParams) (*entities.Course, error)
}
