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

// GetCategories returns the categories where the given user is a teacher.
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

// GetAllCategories returns all visible categories (admin / manager).
func (uc *TeacherUseCase) GetAllCategories(
	ctx context.Context,
) (*mdlapi.GetCategoriesResponse, error) {
	logger.InfoContext(ctx, "Processing GetAllCategories (admin)")

	resp, err := uc.teacherProvider.GetAllCategories(ctx, &mdlapi.GetAllCategoriesRequest{})
	if err != nil {
		logger.ErrorContext(ctx, "GetAllCategories usecase error", "err", err)
		return nil, err
	}

	return resp, nil
}

// GetCourses returns courses in a category where the user is a teacher.
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

// GetAllCategoryCoursesForAdmin returns all courses in a category (admin / manager).
func (uc *TeacherUseCase) GetAllCategoryCoursesForAdmin(
	ctx context.Context,
	req *mdlapi.GetCategoryCoursesRequest,
) (*mdlapi.GetCategoryCoursesResponse, error) {
	logger.InfoContext(
		ctx,
		"Processing GetAllCategoryCoursesForAdmin",
		"categoryID",
		req.CategoryID,
	)

	resp, err := uc.teacherProvider.GetAllCategoryCoursesForAdmin(ctx, req)
	if err != nil {
		logger.ErrorContext(ctx, "GetAllCategoryCoursesForAdmin usecase error", "err", err)
		return nil, err
	}

	return resp, nil
}
