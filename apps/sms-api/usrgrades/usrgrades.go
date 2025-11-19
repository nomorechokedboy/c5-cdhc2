package usrgrades

import (
	"context"
	"strconv"

	"encore.app/authn"
	"encore.app/internal/logger"
	"encore.app/internal/mdlapi"
	"encore.dev/beta/auth"
	"encore.dev/beta/errs"
)

// Get user grades endpoint
//
//encore:api auth method=GET path=/users/grades
func GetUserGrades(ctx context.Context) (*mdlapi.GetUserGradesResponse, error) {
	uid, ok := auth.UserID()
	if !ok {
		logger.ErrorContext(ctx, "GetUserGrades Failed to get UserID from mdw")
		return nil, &errs.Error{Code: errs.Unauthenticated, Message: errs.Unauthenticated.String()}
	}

	userId, _ := strconv.ParseInt(string(uid), 10, 64)
	return authn.GetContainer().
		GetUserController().
		GetUserGrades(ctx, &mdlapi.GetUserGradesRequest{UserID: int(userId)})
}
