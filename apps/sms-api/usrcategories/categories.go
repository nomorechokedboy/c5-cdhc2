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

// GetCategories returns categories appropriate to the caller's role:
//   - admin / manager → all visible Moodle categories
//   - teacher         → only categories containing courses where they are assigned
//
//encore:api auth method=GET path=/categories
func GetCategories(ctx context.Context) (*entities.GetUsersCategoriesResponse, error) {
	payload, ok := auth.Data().(*entities.TokenPayload)
	if !ok || payload == nil {
		return nil, &errs.Error{Code: errs.Unauthenticated, Message: errs.Unauthenticated.String()}
	}

	catCtrl := authn.GetContainer().GetCategoryController()

	// Admin and manager get the full category tree.
	if payload.Role == entities.RoleAdmin || payload.Role == entities.RoleManager {
		return catCtrl.GetAllCategories(ctx)
	}

	// Teachers get only their categories.
	uid, ok := auth.UserID()
	if !ok {
		logger.ErrorContext(ctx, "GetCategories: failed to get UserID")
		return nil, &errs.Error{Code: errs.Unauthenticated, Message: errs.Unauthenticated.String()}
	}
	userId, _ := strconv.ParseInt(string(uid), 10, 64)
	return catCtrl.GetUserCategories(ctx, &entities.GetUsersCategoriesRequest{UserId: userId})
}

// GetCategoryCourses returns courses inside a category.
// Admin / manager → all courses in the category.
// Teacher         → only courses where they are assigned as teacher.
//
//encore:api auth method=GET path=/categories/:categoryId/courses
func GetCategoryCourses(
	ctx context.Context,
	categoryId int64,
) (*entities.GetUsersCoursesResponse, error) {
	payload, ok := auth.Data().(*entities.TokenPayload)
	if !ok || payload == nil {
		return nil, &errs.Error{Code: errs.Unauthenticated, Message: errs.Unauthenticated.String()}
	}

	catCtrl := authn.GetContainer().GetCategoryController()

	// Admin and manager see every course in the category.
	if payload.Role == entities.RoleAdmin || payload.Role == entities.RoleManager {
		return catCtrl.GetCategoryCoursesForAdmin(ctx, categoryId)
	}

	// Teacher sees only their courses in the category.
	uid, ok := auth.UserID()
	if !ok {
		logger.ErrorContext(ctx, "GetCategoryCourses: failed to get UserID")
		return nil, &errs.Error{Code: errs.Unauthenticated, Message: errs.Unauthenticated.String()}
	}
	userId, _ := strconv.ParseInt(string(uid), 10, 64)
	controllerReq := &entities.GetUsersCoursesParams{
		UserId:     userId,
		CategoryId: &categoryId,
	}
	return authn.GetContainer().
		GetCourseController().
		GetUserCourses(ctx, controllerReq)
}
