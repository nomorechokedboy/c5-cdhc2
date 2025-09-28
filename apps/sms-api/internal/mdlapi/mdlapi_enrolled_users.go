package mdlapi

import "context"

type mdlApiEnrolledUserProvider struct {
	mdlApi MoodleApi
}

var _ EnrolledUserProvider = (*mdlApiEnrolledUserProvider)(nil)

func NewMdwlApiEnrolledUserProvider(mdlApi MoodleApi) *mdlApiEnrolledUserProvider {
	return &mdlApiEnrolledUserProvider{mdlApi: mdlApi}
}

func (p *mdlApiEnrolledUserProvider) GetEnrolledUsers(
	ctx context.Context,
	req *EnrolledUsersRequest,
) (*EnrolledUsersResponse, error) {
	resp := &EnrolledUsersResponse{}
	if err := p.mdlApi.Do(ctx, GET_ENROLLED_USERS, req, resp); err != nil {
		return nil, err
	}

	return resp, nil
}
