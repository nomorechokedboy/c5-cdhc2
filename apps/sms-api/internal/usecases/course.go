package usecases

import (
	"context"

	"encore.app/internal/courses"
	"encore.app/internal/entities"
	"encore.app/internal/logger"
	"encore.app/internal/mdlapi"
)

type CourseUseCase struct {
	repo                 courses.Repository
	courseGradesProvider mdlapi.LocalCourseGrades
}

func NewCourseUseCase(
	repo courses.Repository,
	courseGradesProvider mdlapi.LocalCourseGrades,
) *CourseUseCase {
	return &CourseUseCase{
		repo:                 repo,
		courseGradesProvider: courseGradesProvider,
	}
}

func (uc *CourseUseCase) GetUserCourses(
	ctx context.Context,
	req *entities.GetUsersCoursesParams,
) (*entities.GetUsersCoursesResponse, error) {
	logger.InfoContext(ctx, "Processing GetUserCourses", "request", req)

	resp, err := uc.repo.Find(ctx, req)
	if err != nil {
		logger.ErrorContext(ctx, "GetUserCourses error", "err", err, "request", req)
		return nil, err
	}

	return resp, nil
}

func (uc *CourseUseCase) GetUserCourseDetails(
	ctx context.Context,
	req *entities.FindOneCourseParams,
) (*mdlapi.GetCourseGradesResponse, error) {
	logger.InfoContext(ctx, "Processing GetUserCourseDetails", "request", req)

	resp, err := uc.courseGradesProvider.GetCourseDetails(
		ctx,
		&mdlapi.GetCourseGradesRequest{CourseId: req.Id},
	)
	if err != nil {
		logger.ErrorContext(ctx, "LocalGetCourseDetails error", "err", err, "courseId", req.Id)
		return nil, err
	}

	return resp, nil
}
