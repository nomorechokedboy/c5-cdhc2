package courses

import (
	"context"

	"encore.app/internal/entities"
	"encore.app/internal/logger"
)

type CourseController struct {
	repo Repository
}

func NewCourseController(repo Repository) *CourseController {
	return &CourseController{repo}
}

func (c *CourseController) GetUserCourses(
	ctx context.Context,
	req *entities.GetUsersCoursesRequest,
) (*entities.GetUsersCoursesResponse, error) {
	logger.InfoContext(ctx, "GetUserCourses request", "request", req)
	resp, err := c.repo.Find(ctx, req)
	if err != nil {
		logger.ErrorContext(ctx, "GetUserCourses error", "err", err, "request", req)
		return nil, err
	}

	return resp, nil
}
