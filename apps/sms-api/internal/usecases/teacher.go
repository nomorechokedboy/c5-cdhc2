package usecases

import (
	"context"

	"encore.app/internal/logger"
	"encore.app/internal/mdlapi"
)

type TeacherUseCase struct {
	teacherProvider mdlapi.LocalTeacherProvider
}

func NewTeacherUseCase(teacherProvider mdlapi.LocalTeacherProvider) *TeacherUseCase {
	return &TeacherUseCase{teacherProvider: teacherProvider}
}

func (uc *TeacherUseCase) GetCategories(
	ctx context.Context,
	req *mdlapi.GetCategoriesRequest,
) (*mdlapi.GetCategoriesResponse, error) {
	logger.InfoContext(ctx, "Processing GetCategories", "request", req)

	resp, err := uc.teacherProvider.GetCategories(ctx, req)
	if err != nil {
		logger.ErrorContext(ctx, "GetCategories usecase error", "err", err, "request", req)
		return nil, err
	}

	return resp, nil
}

func (uc *TeacherUseCase) GetCourses(
	ctx context.Context,
	req *mdlapi.GetCategoryCoursesRequest,
) (*mdlapi.GetCategoryCoursesResponse, error) {
	logger.InfoContext(ctx, "Processing GetCourses", "request", req)

	resp, err := uc.teacherProvider.GetCategoryCourses(ctx, req)
	if err != nil {
		logger.ErrorContext(ctx, "GetCourses usecase error", "err", err, "request", req)
		return nil, err
	}

	return resp, nil
}
