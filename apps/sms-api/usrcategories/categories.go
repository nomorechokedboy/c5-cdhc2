package usrcategories

import (
	"context"
	"strconv"

	"encore.app/authn"
	"encore.app/internal/entities"
	"encore.app/internal/logger"
	"encore.dev/beta/auth"
	"encore.dev/beta/errs"
)

// Get user categories endpoint
//
//encore:api auth method=GET path=/categories
func GetCategories(ctx context.Context) (*entities.GetUsersCategoriesResponse, error) {
	uid, ok := auth.UserID()
	if !ok {
		logger.ErrorContext(ctx, "Failed to get UserID from mdw")
		return nil, &errs.Error{Code: errs.Unauthenticated, Message: errs.Unauthenticated.String()}
	}

	userId, _ := strconv.ParseInt(string(uid), 10, 64)
	return authn.GetContainer().
		GetCategoryController().
		GetUserCategories(ctx, &entities.GetUsersCategoriesRequest{UserId: userId})
}

// Get category's courses endpoint
//
//encore:api auth method=GET path=/categories/:categoryId/courses
func GetCategoryCourses(
	ctx context.Context,
	categoryId int64,
) (*entities.GetUsersCoursesResponse, error) {
	uid, ok := auth.UserID()
	if !ok {
		logger.ErrorContext(ctx, "Failed to get UserID from mdw")
		return nil, &errs.Error{Code: errs.Unauthenticated, Message: errs.Unauthenticated.String()}
	}

	userId, _ := strconv.ParseInt(string(uid), 10, 64)
	controllerReq := &entities.GetUsersCoursesParams{UserId: userId, CategoryId: &categoryId}
	return authn.GetContainer().
		GetCourseController().
		GetUserCourses(ctx, controllerReq)
}
