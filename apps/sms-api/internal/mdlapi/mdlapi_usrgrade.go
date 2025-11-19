package mdlapi

import "context"

var _ UserGradeItemsProvider = (*mdlApiUserGradeProvider)(nil)

func NewMdlApiUserGradeItemsProvider(mdlApi MoodleApi) *mdlApiUserGradeProvider {
	return &mdlApiUserGradeProvider{mdlApi: mdlApi}
}

type mdlApiUserGradeProvider struct {
	mdlApi MoodleApi
}

// UpdateGrades implements UserGradeItemsProvider.
func (p *mdlApiUserGradeProvider) UpdateGrades(
	ctx context.Context,
	req *UpdateGradesRequest,
) (UpdateGradesResponse, error) {
	nilResp := UpdateGradesResponse(false)
	var resp *UpdateGradesResponse = &nilResp
	if err := p.mdlApi.Do(ctx, UPDATE_GRADES, req, resp); err != nil {
		return nilResp, err
	}

	return *resp, nil
}
