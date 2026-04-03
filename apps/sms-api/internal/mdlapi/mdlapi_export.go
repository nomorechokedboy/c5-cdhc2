package mdlapi

import "context"

type mdlApiExportProvider struct {
	mdlApi MoodleApi
}

var _ ExportProvider = (*mdlApiExportProvider)(nil)

func NewMdlApiExportProvider(mdlApi MoodleApi) *mdlApiExportProvider {
	return &mdlApiExportProvider{mdlApi: mdlApi}
}

func (p *mdlApiExportProvider) GetCourseTemplates(
	ctx context.Context,
	req *GetCourseTemplatesRequest,
) (*GetCourseTemplatesResponse, error) {
	resp := &GetCourseTemplatesResponse{}
	if err := p.mdlApi.Do(ctx, GET_COURSE_TEMPLATES, req, resp); err != nil {
		return nil, err
	}
	return resp, nil
}

func (p *mdlApiExportProvider) ExportCourseGrades(
	ctx context.Context,
	req *ExportCourseGradesRequest,
) (*ExportCourseGradesResponse, error) {
	resp := &ExportCourseGradesResponse{}
	if err := p.mdlApi.Do(ctx, EXPORT_COURSE_GRADES, req, resp); err != nil {
		return nil, err
	}
	return resp, nil
}

func (p *mdlApiExportProvider) GetAllTemplates(
	ctx context.Context,
	req *GetAllTemplatesRequest,
) (*GetCourseTemplatesResponse, error) {
	resp := &GetCourseTemplatesResponse{}
	if err := p.mdlApi.Do(ctx, GET_ALL_TEMPLATES, req, resp); err != nil {
		return nil, err
	}
	return resp, nil
}

func (p *mdlApiExportProvider) UploadTemplate(
	ctx context.Context,
	req *UploadTemplateRequest,
) (*UploadTemplateResponse, error) {
	resp := &UploadTemplateResponse{}
	if err := p.mdlApi.Do(ctx, UPLOAD_TEMPLATE, req, resp); err != nil {
		return nil, err
	}
	return resp, nil
}

func (p *mdlApiExportProvider) DeleteTemplate(
	ctx context.Context,
	req *DeleteTemplateRequest,
) (*DeleteTemplateResponse, error) {
	resp := &DeleteTemplateResponse{}
	if err := p.mdlApi.Do(ctx, DELETE_TEMPLATE, req, resp); err != nil {
		return nil, err
	}
	return resp, nil
}
