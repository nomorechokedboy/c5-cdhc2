package controllers

import (
	"context"

	"encore.app/internal/mdlapi"
	"encore.app/internal/usecases"
)

// ExportController is the thin controller layer wiring Encore endpoints
// to the ExportUseCase.
type ExportController struct {
	useCase *usecases.ExportUseCase
}

func NewExportController(useCase *usecases.ExportUseCase) *ExportController {
	return &ExportController{useCase: useCase}
}

func (c *ExportController) GetCourseTemplates(
	ctx context.Context,
	courseID int,
) (*mdlapi.GetCourseTemplatesResponse, error) {
	return c.useCase.GetCourseTemplates(ctx, courseID)
}

func (c *ExportController) ExportCourseGrades(
	ctx context.Context,
	courseID int,
	templateID string,
) (*mdlapi.ExportCourseGradesResponse, error) {
	return c.useCase.ExportCourseGrades(ctx, courseID, templateID)
}

func (c *ExportController) GetAllTemplates(
	ctx context.Context,
	templateType string,
) (*mdlapi.GetCourseTemplatesResponse, error) {
	return c.useCase.GetAllTemplates(ctx, templateType)
}

func (c *ExportController) UploadTemplate(
	ctx context.Context,
	req *mdlapi.UploadTemplateRequest,
) (*mdlapi.UploadTemplateResponse, error) {
	return c.useCase.UploadTemplate(ctx, req)
}

func (c *ExportController) DeleteTemplate(
	ctx context.Context,
	templateType, templateID string,
) (*mdlapi.DeleteTemplateResponse, error) {
	return c.useCase.DeleteTemplate(ctx, templateType, templateID)
}
