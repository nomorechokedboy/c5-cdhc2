package usrexport

import (
	"context"

	"encore.app/authn"
	"encore.app/internal/entities"
	"encore.app/internal/logger"
	"encore.app/internal/mdlapi"
	"encore.dev/beta/auth"
	"encore.dev/beta/errs"
)

// ── shared response types ──────────────────────────────────────────────────

type ExportTemplate struct {
	ID       string `json:"id"`
	Name     string `json:"name"`
	Format   string `json:"format"`
	Size     int    `json:"size"`
	Modified int64  `json:"modified"`
}

type GetTemplatesResponse struct {
	Data []ExportTemplate `json:"data"`
}

// ── course export ──────────────────────────────────────────────────────────

// GetCourseExportTemplatesRequest carries the (optional) course context.
// Path param :id is the course ID passed separately by Encore.
type GetCourseExportTemplatesRequest struct{}

// GetCourseExportTemplates returns available DOCX/XLSX templates for a course.
//
//encore:api auth method=GET path=/courses/:id/export/templates
func GetCourseExportTemplates(
	ctx context.Context,
	id int64,
) (*GetTemplatesResponse, error) {
	resp, err := authn.GetContainer().GetExportController().GetCourseTemplates(ctx, int(id))
	if err != nil {
		logger.ErrorContext(ctx, "GetCourseExportTemplates error", "courseID", id, "err", err)
		return nil, err
	}
	return toTemplatesResponse(resp), nil
}

// ExportCourseRequest carries the optional template selection.
type ExportCourseRequest struct {
	// TemplateID is the ID of the template to use.
	// Pass empty string (or omit the query param) for a default DOCX export.
	TemplateID string `json:"templateId" query:"templateId"`
}

// ExportCourseResponse holds the base64-encoded file ready for browser download.
type ExportCourseResponse struct {
	Filename string `json:"filename"`
	Mimetype string `json:"mimetype"`
	// Content is the base64-encoded file. Decode with atob() in the browser.
	Content string `json:"content"`
}

// ExportCourseGrades generates a grade export and returns the file as base64.
//
//encore:api auth method=GET path=/courses/:id/export
func ExportCourseGrades(
	ctx context.Context,
	id int64,
	req *ExportCourseRequest,
) (*ExportCourseResponse, error) {
	resp, err := authn.GetContainer().GetExportController().ExportCourseGrades(
		ctx, int(id), req.TemplateID,
	)
	if err != nil {
		logger.ErrorContext(ctx, "ExportCourseGrades error", "courseID", id, "err", err)
		return nil, err
	}
	return &ExportCourseResponse{
		Filename: resp.Filename,
		Mimetype: resp.Mimetype,
		Content:  resp.Filedata,
	}, nil
}

// ── admin template management ──────────────────────────────────────────────

// GetAllTemplatesRequest lets the admin filter by type.
type GetAllTemplatesRequest struct {
	// Type is one of: course | quiz | assign
	Type string `json:"type" query:"type"`
}

// GetAllExportTemplates lists all templates for the given type (admin only).
//
//encore:api auth method=GET path=/admin/export/templates
func GetAllExportTemplates(
	ctx context.Context,
	req *GetAllTemplatesRequest,
) (*GetTemplatesResponse, error) {
	if err := requireAdminOrManager(ctx); err != nil {
		return nil, err
	}
	resp, err := authn.GetContainer().GetExportController().GetAllTemplates(ctx, req.Type)
	if err != nil {
		logger.ErrorContext(ctx, "GetAllExportTemplates error", "type", req.Type, "err", err)
		return nil, err
	}
	return toTemplatesResponse(resp), nil
}

// UploadExportTemplateRequest carries the base64-encoded template file.
type UploadExportTemplateRequest struct {
	// Type is one of: course | quiz | assign
	Type string `json:"type"`
	// Name is the human-readable label shown in the SMS admin panel.
	Name string `json:"name"`
	// Filename is the original filename (extension determines format).
	Filename string `json:"filename"`
	// Filedata is the base64-encoded file content.
	Filedata string `json:"filedata"`
}

// UploadExportTemplate saves a new template (admin only).
//
//encore:api auth method=POST path=/admin/export/templates
func UploadExportTemplate(
	ctx context.Context,
	req *UploadExportTemplateRequest,
) (*ExportTemplate, error) {
	if err := requireAdminOrManager(ctx); err != nil {
		return nil, err
	}

	mdlReq := &mdlapi.UploadTemplateRequest{
		Type:     req.Type,
		Name:     req.Name,
		Filename: req.Filename,
		Filedata: req.Filedata,
	}

	uploadResp, err := authn.GetContainer().GetExportController().UploadTemplate(ctx, mdlReq)
	if err != nil {
		logger.ErrorContext(ctx, "UploadExportTemplate error", "type", req.Type, "err", err)
		return nil, err
	}

	// Fetch the newly stored template to return its full metadata.
	all, err := authn.GetContainer().GetExportController().GetAllTemplates(ctx, req.Type)
	if err == nil && all != nil {
		for _, t := range *all {
			if t.ID == uploadResp.ID {
				return toTemplate(t), nil
			}
		}
	}

	// Fallback: return only the ID we got back.
	return &ExportTemplate{ID: uploadResp.ID}, nil
}

// DeleteExportTemplate removes a template by type and ID (admin only).
//
//encore:api auth method=DELETE path=/admin/export/templates/:templateType/:templateId
func DeleteExportTemplate(
	ctx context.Context,
	templateType string,
	templateId string,
) error {
	if err := requireAdminOrManager(ctx); err != nil {
		return err
	}
	_, err := authn.GetContainer().GetExportController().DeleteTemplate(ctx, templateType, templateId)
	if err != nil {
		logger.ErrorContext(ctx, "DeleteExportTemplate error",
			"type", templateType, "id", templateId, "err", err)
	}
	return err
}

// ── auth helpers ───────────────────────────────────────────────────────────

func requireAdminOrManager(ctx context.Context) error {
	payload, ok := auth.Data().(*entities.TokenPayload)
	if !ok || payload == nil {
		return &errs.Error{Code: errs.Unauthenticated, Message: "not authenticated"}
	}
	if payload.Role != entities.RoleAdmin && payload.Role != entities.RoleManager {
		return &errs.Error{Code: errs.PermissionDenied, Message: "admin or manager role required"}
	}
	return nil
}

// ── conversion helpers ─────────────────────────────────────────────────────

func toTemplate(t mdlapi.ExportTemplate) *ExportTemplate {
	return &ExportTemplate{
		ID:       t.ID,
		Name:     t.Name,
		Format:   t.Format,
		Size:     t.Size,
		Modified: t.Modified,
	}
}

func toTemplatesResponse(resp *mdlapi.GetCourseTemplatesResponse) *GetTemplatesResponse {
	if resp == nil {
		return &GetTemplatesResponse{Data: []ExportTemplate{}}
	}
	data := make([]ExportTemplate, len(*resp))
	for i, t := range *resp {
		data[i] = *toTemplate(t)
	}
	return &GetTemplatesResponse{Data: data}
}
