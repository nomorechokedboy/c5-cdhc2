package usecases

import (
	"context"

	"encore.app/internal/logger"
	"encore.app/internal/mdlapi"
)

// ExportUseCase orchestrates export and template-management operations.
type ExportUseCase struct {
	provider mdlapi.ExportProvider
}

func NewExportUseCase(provider mdlapi.ExportProvider) *ExportUseCase {
	return &ExportUseCase{provider: provider}
}

func (uc *ExportUseCase) GetCourseTemplates(
	ctx context.Context,
	courseID int,
) (*mdlapi.GetCourseTemplatesResponse, error) {
	logger.InfoContext(ctx, "GetCourseTemplates", "courseID", courseID)
	return uc.provider.GetCourseTemplates(ctx, &mdlapi.GetCourseTemplatesRequest{CourseID: courseID})
}

func (uc *ExportUseCase) ExportCourseGrades(
	ctx context.Context,
	courseID int,
	templateID string,
) (*mdlapi.ExportCourseGradesResponse, error) {
	logger.InfoContext(ctx, "ExportCourseGrades", "courseID", courseID, "templateID", templateID)
	return uc.provider.ExportCourseGrades(ctx, &mdlapi.ExportCourseGradesRequest{
		CourseID:   courseID,
		TemplateID: templateID,
	})
}

func (uc *ExportUseCase) GetAllTemplates(
	ctx context.Context,
	templateType string,
) (*mdlapi.GetCourseTemplatesResponse, error) {
	logger.InfoContext(ctx, "GetAllTemplates", "type", templateType)
	return uc.provider.GetAllTemplates(ctx, &mdlapi.GetAllTemplatesRequest{Type: templateType})
}

func (uc *ExportUseCase) UploadTemplate(
	ctx context.Context,
	req *mdlapi.UploadTemplateRequest,
) (*mdlapi.UploadTemplateResponse, error) {
	logger.InfoContext(ctx, "UploadTemplate", "type", req.Type, "name", req.Name)
	return uc.provider.UploadTemplate(ctx, req)
}

func (uc *ExportUseCase) DeleteTemplate(
	ctx context.Context,
	templateType, templateID string,
) (*mdlapi.DeleteTemplateResponse, error) {
	logger.InfoContext(ctx, "DeleteTemplate", "type", templateType, "id", templateID)
	return uc.provider.DeleteTemplate(ctx, &mdlapi.DeleteTemplateRequest{
		Type:       templateType,
		TemplateID: templateID,
	})
}
