package mdlapi

import "context"

var _ UserGradeItemsProvider = (*mdlApiUserGradeProvider)(nil)

func NewMdlApiUserGradeItemsProvider(mdlApi MoodleApi) *mdlApiUserGradeProvider {
	return &mdlApiUserGradeProvider{mdlApi: mdlApi}
}

type mdlApiUserGradeProvider struct {
	mdlApi MoodleApi
}

func (p *mdlApiUserGradeProvider) GetUserGradeItems(
	ctx context.Context,
	req *GetUserGradeItemsRequest,
) (*GetUserGradeItemsResponse, error) {
	resp := &GetUserGradeItemsResponse{}
	if err := p.mdlApi.Do(ctx, GET_USER_GRADE_ITEMS, req, resp); err != nil {
		return nil, err
	}

	return resp, nil
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
