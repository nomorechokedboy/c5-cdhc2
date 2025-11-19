package controllers

import (
	"context"

	"encore.app/internal/mdlapi"
	"encore.app/internal/usecases"
)

type UserController struct {
	useCase *usecases.StudentGradeUseCase
}

func NewUserController(useCase *usecases.StudentGradeUseCase) *UserController {
	return &UserController{useCase: useCase}
}

func (c *UserController) GetUserGrades(
	ctx context.Context,
	req *mdlapi.GetUserGradesRequest,
) (*mdlapi.GetUserGradesResponse, error) {
	return c.useCase.GetStudentGrades(ctx, req)
}
