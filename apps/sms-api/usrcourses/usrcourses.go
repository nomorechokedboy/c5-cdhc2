package usrcourses

import (
	"context"
	"strconv"

	"encore.app/authn"
	"encore.app/internal/entities"
	"encore.app/internal/logger"
	"encore.app/internal/mdlapi"
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

	/* if req != nil {
		logger.ErrorContext(ctx, "Request is nil")
		return nil, &errs.Error{Code: errs.InvalidArgument, Message: errs.InvalidArgument.String()}
	} */

	userId, _ := strconv.ParseInt(string(uid), 10, 64)
	controllerReq := &entities.GetUsersCoursesParams{UserId: userId, CategoryId: nil}
	return authn.GetContainer().
		GetCourseController().
		GetUserCourses(ctx, controllerReq)
}

// Get course details endpoint
//
//encore:api auth method=GET path=/courses/:id
func GetCourseDetails(
	ctx context.Context,
	id int64,
) (*mdlapi.GetCourseGradesResponse, error) {
	uid, ok := auth.UserID()
	if !ok {
		logger.ErrorContext(ctx, "Failed to get UserID from mdw")
		return nil, &errs.Error{Code: errs.Unauthenticated, Message: errs.Unauthenticated.String()}
	}

	userId, _ := strconv.ParseInt(string(uid), 10, 64)
	req := &entities.FindOneCourseParams{Id: id, UserId: userId}
	return authn.GetContainer().GetCourseController().GetCourseDetails(ctx, req)
}

// Update course grades endpoint
//
//encore:api auth method=PUT path=/courses
func UpdateCourseGrades(
	ctx context.Context,
	req *mdlapi.UpdateGradesRequest,
) (*entities.UpdateCourseGradesResponse, error) {
	logger.InfoContext(ctx, "Proccessing UpdateCourseGrades", "request", req)

	if _, err := authn.GetContainer().GetCourseController().UpdateCourseGrades(ctx, req); err != nil {
		logger.ErrorContext(ctx, "UpdateCourseGrades error", "err", err, "req", req)
		return nil, err
	}

	return &entities.UpdateCourseGradesResponse{Data: "Ok"}, nil
}
