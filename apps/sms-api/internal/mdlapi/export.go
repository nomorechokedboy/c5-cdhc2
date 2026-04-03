package mdlapi

import "context"

// ExportTemplate describes one available DOCX/XLSX template.
type ExportTemplate struct {
	ID       string `json:"id"`
	Name     string `json:"name"`
	Format   string `json:"format"`
	Size     int    `json:"size"`
	Modified int64  `json:"modified"`
}

// GetCourseTemplatesResponse is a JSON array of ExportTemplate.
type GetCourseTemplatesResponse []ExportTemplate

type GetCourseTemplatesRequest struct {
	CourseID int `json:"courseid"`
}

// ExportCourseGradesRequest maps to the PHP external function parameters.
type ExportCourseGradesRequest struct {
	CourseID   int    `json:"courseid"`
	TemplateID string `json:"templateid"` // empty string = default DOCX
}

// ExportCourseGradesResponse carries the base64-encoded file from Moodle.
type ExportCourseGradesResponse struct {
	Filename string `json:"filename"`
	Mimetype string `json:"mimetype"`
	Filedata string `json:"filedata"` // base64
}

// GetAllTemplatesRequest is for the admin "list by type" function.
type GetAllTemplatesRequest struct {
	Type string `json:"type"`
}

// UploadTemplateRequest sends a base64-encoded file to Moodle for storage.
type UploadTemplateRequest struct {
	Type     string `json:"type"`
	Name     string `json:"name"`
	Filename string `json:"filename"`
	Filedata string `json:"filedata"` // base64
}

// UploadTemplateResponse is what Moodle returns after saving the template.
type UploadTemplateResponse struct {
	ID      string `json:"id"`
	Success bool   `json:"success"`
}

// DeleteTemplateRequest identifies a template to remove.
type DeleteTemplateRequest struct {
	Type       string `json:"type"`
	TemplateID string `json:"templateid"`
}

// DeleteTemplateResponse confirms the deletion.
type DeleteTemplateResponse struct {
	Success bool `json:"success"`
}

// ExportProvider abstracts all export-related Moodle API calls.
type ExportProvider interface {
	GetCourseTemplates(context.Context, *GetCourseTemplatesRequest) (*GetCourseTemplatesResponse, error)
	ExportCourseGrades(context.Context, *ExportCourseGradesRequest) (*ExportCourseGradesResponse, error)
	GetAllTemplates(context.Context, *GetAllTemplatesRequest) (*GetCourseTemplatesResponse, error)
	UploadTemplate(context.Context, *UploadTemplateRequest) (*UploadTemplateResponse, error)
	DeleteTemplate(context.Context, *DeleteTemplateRequest) (*DeleteTemplateResponse, error)
}
