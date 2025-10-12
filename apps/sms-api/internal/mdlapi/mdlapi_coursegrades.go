package mdlapi

import "context"

type mdlApiCourseGradesProvider struct {
	mdlApi MoodleApi
}

var _ LocalCourseGrades = (*mdlApiCourseGradesProvider)(nil)

func NewLocalCourseGradesProvider(mdlApi MoodleApi) *mdlApiCourseGradesProvider {
	return &mdlApiCourseGradesProvider{mdlApi: mdlApi}
}

func (p *mdlApiCourseGradesProvider) GetCourseDetails(
	ctx context.Context,
	req *GetCourseGradesRequest,
) (*GetCourseGradesResponse, error) {
	resp := &GetCourseGradesResponse{}
	if err := p.mdlApi.Do(ctx, GET_CUSTOM_COURSE_DETAILS, req, resp); err != nil {
		return nil, err
	}

	return resp, nil
}
