package usecases

import (
	"context"

	"encore.app/internal/logger"
	"encore.app/internal/mdlapi"
)

type StudentGradeUseCase struct {
	userGradesProvider mdlapi.UserGradeItemsProvider
}

func NewStudentGradeUseCase(userGradesProvider mdlapi.UserGradeItemsProvider) *StudentGradeUseCase {
	return &StudentGradeUseCase{userGradesProvider: userGradesProvider}
}

func (uc *StudentGradeUseCase) GetStudentGrades(
	ctx context.Context,
	req *mdlapi.GetUserGradesRequest,
) (*mdlapi.GetUserGradesResponse, error) {
	logger.InfoContext(ctx, "Processing GetStudentGrades", "request", req)

	resp, err := uc.userGradesProvider.GetUserGrades(ctx, req)
	if err != nil {
		logger.ErrorContext(ctx, "GetUserGrades error", "err", err, "request", req)
		return nil, err
	}

	return resp, nil
}
