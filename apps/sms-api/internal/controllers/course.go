package controllers

import (
	"context"

	"encore.app/internal/entities"
	"encore.app/internal/usecases"
)

type CourseController struct {
	useCase *usecases.CourseUseCase
}

func NewCourseController(useCase *usecases.CourseUseCase) *CourseController {
	return &CourseController{useCase: useCase}
}

func (c *CourseController) GetUserCourses(
	ctx context.Context,
	req *entities.GetUsersCoursesParams,
) (*entities.GetUsersCoursesResponse, error) {
	return c.useCase.GetUserCourses(ctx, req)
}

func (c *CourseController) GetCourseDetails(
	ctx context.Context,
	req *entities.FindOneCourseParams,
) (*entities.GetUserCourseDetailsResponse, error) {
	return c.useCase.GetUserCourseDetails(ctx, req)
}
