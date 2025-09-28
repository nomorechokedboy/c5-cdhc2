package mdlapi

import "context"

type mdlApiUserGradeProvider struct {
	mdlApi MoodleApi
}

var _ UserGradeItemsProvider = (*mdlApiUserGradeProvider)(nil)

func NewMdlApiUserGradeItemsProvider(mdlApi MoodleApi) *mdlApiUserGradeProvider {
	return &mdlApiUserGradeProvider{mdlApi: mdlApi}
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
