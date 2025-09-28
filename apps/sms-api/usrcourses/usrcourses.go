package usrcourses

import (
	"context"

	"encore.app/authn"
	"encore.app/internal/entities"
	"encore.app/internal/logger"
	"encore.dev/beta/auth"
	"encore.dev/beta/errs"
)

// Get courses endpoint
//
//encore:api auth method=GET path=/courses
func GetCourses(
	ctx context.Context,
	req *entities.GetUsersCoursesRequest,
) (*entities.GetUsersCoursesResponse, error) {
	uid, ok := auth.UserID()
	if !ok {
		logger.ErrorContext(ctx, "Failed to get UserID from mdw")
		return nil, &errs.Error{Code: errs.Unauthenticated, Message: errs.Unauthenticated.String()}
	}

	if req == nil {
		logger.ErrorContext(ctx, "Request is nil")
		return nil, &errs.Error{Code: errs.InvalidArgument, Message: errs.InvalidArgument.String()}
	}

	userId := int64(uid[0])
	return authn.GetContainer().
		GetCourseController().
		GetUserCourses(ctx, &entities.GetUsersCoursesParams{UserId: userId, CategoryId: req.CategoryId})
}

// Get course details endpoint
//
//encore:api auth method=GET path=/courses/:id
func GetCourseDetails(
	ctx context.Context,
	id int64,
) (*entities.GetUserCourseDetailsResponse, error) {
	uid, ok := auth.UserID()
	if !ok {
		logger.ErrorContext(ctx, "Failed to get UserID from mdw")
		return nil, &errs.Error{Code: errs.Unauthenticated, Message: errs.Unauthenticated.String()}
	}

	userId := int64(uid[0])
	req := &entities.FindOneCourseParams{Id: id, UserId: userId}
	return authn.GetContainer().GetCourseController().GetCourseDetails(ctx, req)
}
