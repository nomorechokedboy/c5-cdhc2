package usrcategories

import (
	"context"

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

	userId := int64(uid[0])
	return authn.GetContainer().
		GetCategoryController().
		GetUserCategories(ctx, &entities.GetUsersCategoriesRequest{UserId: userId})
}
