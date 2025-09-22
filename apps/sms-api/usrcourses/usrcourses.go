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
func GetCourses(ctx context.Context) (*entities.GetUsersCoursesResponse, error) {
	uid, ok := auth.UserID()
	if !ok {
		logger.ErrorContext(ctx, "Failed to get UserID from mdw")
		return nil, &errs.Error{Code: errs.Unauthenticated, Message: errs.Unauthenticated.String()}
	}

	userId := int64(uid[0])
	return authn.GetContainer().
		GetCourseController().
		GetUserCourses(ctx, &entities.GetUsersCoursesRequest{UserId: userId})
}
